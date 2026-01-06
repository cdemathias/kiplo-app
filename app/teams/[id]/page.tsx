"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MemberCard } from '@/components/MemberCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getTeam,
  createTeamMember,
  deleteTeamMember,
  createAgendaItem,
  toggleAgendaItem,
  deleteAgendaItem,
} from '@/lib/db-operations'
import type { TeamMember, AgendaItem } from '@/lib/db.types'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState<(TeamMember & { agenda_items: AgendaItem[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (teamId) {
      loadTeam()
    }
  }, [teamId])

  const loadTeam = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTeam(teamId)
      setTeamName(data.name)
      setMembers(data.team_members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
      console.error('Error loading team:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMember = async () => {
    if (!newMemberName.trim()) return

    try {
      setIsCreating(true)
      setError(null)
      const newMember = await createTeamMember(teamId, newMemberName.trim())
      setMembers([{ ...newMember, agenda_items: [] }, ...members])
      setNewMemberName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create member')
      console.error('Error creating member:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member? This will also delete all their agenda items.')) {
      return
    }

    try {
      setError(null)
      await deleteTeamMember(id)
      setMembers(members.filter(member => member.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member')
      console.error('Error deleting member:', err)
    }
  }

  const handleAddAgendaItem = async (memberId: string, content: string) => {
    try {
      setError(null)
      const newItem = await createAgendaItem(memberId, content)
      setMembers(
        members.map((member) =>
          member.id === memberId
            ? { ...member, agenda_items: [newItem, ...member.agenda_items] }
            : member
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agenda item')
      console.error('Error creating agenda item:', err)
    }
  }

  const handleToggleAgendaItem = async (id: string, completed: boolean) => {
    try {
      setError(null)
      await toggleAgendaItem(id, completed)
      setMembers(
        members.map((member) => ({
          ...member,
          agenda_items: member.agenda_items.map((item) =>
            item.id === id ? { ...item, completed } : item
          ),
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agenda item')
      console.error('Error updating agenda item:', err)
    }
  }

  const handleDeleteAgendaItem = async (id: string) => {
    try {
      setError(null)
      await deleteAgendaItem(id)
      setMembers(
        members.map((member) => ({
          ...member,
          agenda_items: member.agenda_items.filter((item) => item.id !== id),
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agenda item')
      console.error('Error deleting agenda item:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Teams
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2">{teamName || 'Loading...'}</h1>
          <p className="text-muted-foreground">Manage team members and their 1:1 agenda items</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter member name..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateMember()
                }
              }}
              className="max-w-md"
            />
            <Button onClick={handleCreateMember} disabled={isCreating || !newMemberName.trim()}>
              {isCreating ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading team members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No members yet. Add your first team member to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onDelete={handleDeleteMember}
                onAddAgendaItem={handleAddAgendaItem}
                onToggleAgendaItem={handleToggleAgendaItem}
                onDeleteAgendaItem={handleDeleteAgendaItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

