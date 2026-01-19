"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MemberCard } from '@/components/MemberCard'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/auth-context'
import {
  getTeam,
  createTeamMember,
  deleteTeamMember,
  createAgendaItem,
  toggleAgendaItem,
  deleteAgendaItem,
  updateAgendaItem,
  startMeetingSession,
  endMeetingSession,
} from '@/lib/db-operations'
import type { TeamMember, AgendaItem, MeetingSession } from '@/lib/db.types'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const { user, loading: authLoading } = useAuth()

  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState<
    (TeamMember & { agenda_items: AgendaItem[]; meeting_sessions: MeetingSession[] })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [includeNoDate, setIncludeNoDate] = useState<boolean>(true)

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
        TeamMember & { agenda_items?: AgendaItem[]; meeting_sessions?: MeetingSession[] }
      >
      setMembers(
        teamMembers.map((member) => ({
          ...member,
          agenda_items: member.agenda_items || [],
          meeting_sessions: member.meeting_sessions || [],
        }))
      )
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

  const isMeetingActive = (member: { meeting_sessions?: MeetingSession[] }) => {
    return (member.meeting_sessions || []).some((session) => session.ended_at == null)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end meeting')
      console.error('Error ending meeting:', err)
    }
  }

  const filterAgendaItems = (items: AgendaItem[]): AgendaItem[] => {
    if (dateFilter === 'all') {
      return items
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return items.filter((item) => {
      if (!item.scheduled_date) {
        if (dateFilter === 'no-date') {
          return true
        }
        return includeNoDate
      }

      const itemDate = new Date(item.scheduled_date)
      itemDate.setHours(0, 0, 0, 0)

      switch (dateFilter) {
        case 'today':
          return itemDate.getTime() === today.getTime()
        case 'this-week':
          return itemDate >= startOfWeek && itemDate <= endOfWeek
        case 'upcoming':
          return itemDate > today
        case 'overdue':
          return itemDate < today && !item.completed
        case 'no-date':
          return false
        default:
          return true
      }
    })
  }

  const getFilteredMembers = () => {
    return members.map((member) => ({
      ...member,
      agenda_items: filterAgendaItems(member.agenda_items),
    })).filter((member) => member.agenda_items.length > 0 || dateFilter === 'all')
  }

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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="date-filter" className="text-sm font-medium">
                Filter by date:
              </label>
              <select
                id="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
                <option value="no-date">No Date</option>
              </select>
            </div>
            {dateFilter !== 'all' && dateFilter !== 'no-date' && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-no-date"
                  checked={includeNoDate}
                  onCheckedChange={(checked) => setIncludeNoDate(checked === true)}
                />
                <label
                  htmlFor="include-no-date"
                  className="text-sm font-medium cursor-pointer"
                >
                  Include items with no date
                </label>
              </div>
            )}
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
            {getFilteredMembers().map((member) => (
              <MemberCard
                key={member.id}
                member={member}
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

