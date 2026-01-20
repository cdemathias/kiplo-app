"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MemberCard } from '@/components/MemberCard'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import {
  getTeam,
  createTeamMember,
  deleteTeamMember,
  createAgendaItem,
  toggleAgendaItem,
  deleteAgendaItem,
  startMeetingSession,
  endMeetingSession,
} from '@/lib/db-operations'
import type { TeamMember, AgendaItem, MeetingSession } from '@/lib/db.types'

type MeetingSessionAgendaItemLink = { added_at: string; agenda_items: AgendaItem | null }
type MeetingSessionWithLinks = MeetingSession & { meeting_session_agenda_items?: MeetingSessionAgendaItemLink[] }

function getLocalISODateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const { user, loading: authLoading } = useAuth()

  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState<
    (TeamMember & { agenda_items: AgendaItem[]; meeting_sessions: MeetingSession[] })[]
  >([])
  const [meetingAgendaItemsByMemberId, setMeetingAgendaItemsByMemberId] = useState<Record<string, AgendaItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (teamId && user) {
      loadTeam()
    }
  }, [teamId, user, authLoading, router])

  const loadTeam = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTeam(teamId)
      setTeamName(data.name)
      const teamMembers = (data.team_members || []) as Array<
        TeamMember & { agenda_items?: AgendaItem[]; meeting_sessions?: MeetingSessionWithLinks[] }
      >
      const normalizedMembers = teamMembers.map((member) => ({
          ...member,
          agenda_items: member.agenda_items || [],
          meeting_sessions: member.meeting_sessions || [],
        }))

      setMembers(normalizedMembers)

      // Derive meeting session agenda items from the single getTeam() payload (avoid N+1 fetches)
      const nextMeetingAgendaItemsByMemberId: Record<string, AgendaItem[]> = {}
      for (const m of normalizedMembers) {
        const activeSession = (m.meeting_sessions as MeetingSessionWithLinks[]).find((s) => s.ended_at == null)
        const links = activeSession?.meeting_session_agenda_items || []
        if (links.length > 0) {
          const sorted = [...links].sort(
            (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
          )
          nextMeetingAgendaItemsByMemberId[m.id] = sorted
            .map((row) => row.agenda_items)
            .filter((x: AgendaItem | null): x is AgendaItem => Boolean(x))
        }
      }
      setMeetingAgendaItemsByMemberId(nextMeetingAgendaItemsByMemberId)
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
      setMembers([{ ...newMember, agenda_items: [], meeting_sessions: [] }, ...members])
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

  const handleAddAgendaItem = async (memberId: string, content: string, scheduledDate?: string | null) => {
    try {
      setError(null)
      const newItem = await createAgendaItem(memberId, content, scheduledDate)
      setMembers(
        members.map((member) =>
          member.id === memberId
            ? { ...member, agenda_items: [newItem, ...member.agenda_items] }
            : member
        )
      )

      // If a meeting is active, also keep the meeting list in sync (server already linked it)
      if (isMeetingActive(members.find((m) => m.id === memberId) || {})) {
        setMeetingAgendaItemsByMemberId((prev) => ({
          ...prev,
          [memberId]: [newItem, ...(prev[memberId] || [])],
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agenda item')
      console.error('Error creating agenda item:', err)
    }
  }

  const handleUpdateAgendaItem = async (updatedItem: AgendaItem) => {
    setMembers(
      members.map((member) => ({
        ...member,
        agenda_items: member.agenda_items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      }))
    )

    setMeetingAgendaItemsByMemberId((prev) => {
      const next: Record<string, AgendaItem[]> = { ...prev }
      for (const [memberId, items] of Object.entries(prev)) {
        if (items.some((i) => i.id === updatedItem.id)) {
          next[memberId] = items.map((i) => (i.id === updatedItem.id ? updatedItem : i))
        }
      }
      return next
    })
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

      setMeetingAgendaItemsByMemberId((prev) => {
        const next: Record<string, AgendaItem[]> = { ...prev }
        for (const [memberId, items] of Object.entries(prev)) {
          if (items.some((i) => i.id === id)) {
            next[memberId] = items.map((i) => (i.id === id ? { ...i, completed } : i))
          }
        }
        return next
      })
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

  const isMeetingActive = (member: { meeting_sessions?: MeetingSession[] }) => {
    return (member.meeting_sessions || []).some((session) => session.ended_at == null)
  }

  const getRelevantNowOpenItems = (items: AgendaItem[]) => {
    const today = getLocalISODateString()
    return items.filter((item) => {
      if (item.completed) return false
      if (!item.scheduled_date) return true
      return item.scheduled_date <= today
    })
  }

  const handleStartMeeting = async (memberId: string) => {
    try {
      setError(null)
      const newSession = await startMeetingSession(memberId)
      setMembers(
        members.map((member) =>
          member.id === memberId
            ? { ...member, meeting_sessions: [newSession, ...(member.meeting_sessions || [])] }
            : member
        )
      )

      // Server snapshots eligible open items at meeting start; mirror that snapshot locally to avoid extra fetches.
      const member = members.find((m) => m.id === memberId)
      const items = member ? getRelevantNowOpenItems(member.agenda_items || []) : []
      setMeetingAgendaItemsByMemberId((prev) => ({ ...prev, [memberId]: items }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start meeting')
      console.error('Error starting meeting:', err)
    }
  }

  const handleEndMeeting = async (memberId: string) => {
    try {
      setError(null)
      const endedSession = await endMeetingSession(memberId)
      setMembers(
        members.map((member) => {
          if (member.id !== memberId) return member
          const existing = member.meeting_sessions || []
          const next = existing.some((s) => s.id === endedSession.id)
            ? existing.map((s) => (s.id === endedSession.id ? endedSession : s))
            : [endedSession, ...existing]
          return { ...member, meeting_sessions: next }
        })
      )

      setMeetingAgendaItemsByMemberId((prev) => {
        const next = { ...prev }
        delete next[memberId]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end meeting')
      console.error('Error ending meeting:', err)
    }
  }

  const getMembers = () => members

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
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

        <div className="mb-6 space-y-4">
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
            {getMembers().map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                meetingAgendaItems={meetingAgendaItemsByMemberId[member.id] || []}
                onDelete={handleDeleteMember}
                onAddAgendaItem={handleAddAgendaItem}
                onToggleAgendaItem={handleToggleAgendaItem}
                onDeleteAgendaItem={handleDeleteAgendaItem}
                onUpdateAgendaItem={handleUpdateAgendaItem}
                isMeetingActive={isMeetingActive(member)}
                onStartMeeting={handleStartMeeting}
                onEndMeeting={handleEndMeeting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

