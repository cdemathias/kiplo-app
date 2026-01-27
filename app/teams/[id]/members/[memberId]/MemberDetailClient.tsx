"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgendaItem } from '@/components/AgendaItem'
import {
  createAgendaItem,
  toggleAgendaItem,
  deleteAgendaItem,
  startMeetingSession,
  endMeetingSession,
} from '@/lib/db-operations'
import type { TeamMember, AgendaItem as AgendaItemType, MeetingSession } from '@/lib/db.types'
import { Play, Square } from 'lucide-react'

function getLocalISODateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface MemberDetailClientProps {
  teamId: string
  teamName: string
  initialMember: TeamMember & { agenda_items: AgendaItemType[]; meeting_sessions: MeetingSession[] }
  initialMeetingAgendaItems: AgendaItemType[]
}

export default function MemberDetailClient({
  teamId,
  teamName,
  initialMember,
  initialMeetingAgendaItems,
}: MemberDetailClientProps) {
  const router = useRouter()

  const [member, setMember] = useState(initialMember)
  const [meetingAgendaItems, setMeetingAgendaItems] = useState<AgendaItemType[]>(initialMeetingAgendaItems)
  const [error, setError] = useState<string | null>(null)
  const [newAgendaContent, setNewAgendaContent] = useState('')
  const [newAgendaDate, setNewAgendaDate] = useState<string>('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [showFuture, setShowFuture] = useState(false)

  const isMeetingActive = (member.meeting_sessions || []).some((session) => session.ended_at == null)

  const agendaItems = member.agenda_items || []
  const today = getLocalISODateString()
  const relevantNowOpenItems = agendaItems.filter((item) => {
    if (item.completed) return false
    if (!item.scheduled_date) return true
    return item.scheduled_date <= today
  })
  const futureOpenItems = agendaItems.filter((item) => {
    if (item.completed) return false
    if (!item.scheduled_date) return false
    return item.scheduled_date > today
  })

  const handleAddAgendaItem = async () => {
    if (isAddingItem) {
      if (newAgendaContent.trim()) {
        try {
          setError(null)
          const newItem = await createAgendaItem(member.id, newAgendaContent.trim(), newAgendaDate || null)
          setMember({
            ...member,
            agenda_items: [newItem, ...member.agenda_items],
          })

          if (isMeetingActive) {
            setMeetingAgendaItems([newItem, ...meetingAgendaItems])
          }

          setNewAgendaContent('')
          setNewAgendaDate('')
          setIsAddingItem(false)
          router.refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create agenda item')
          console.error('Error creating agenda item:', err)
        }
      }
    } else {
      setIsAddingItem(true)
    }
  }

  const handleCancelAdd = () => {
    setIsAddingItem(false)
    setNewAgendaContent('')
    setNewAgendaDate('')
  }

  const handleUpdateAgendaItem = async (updatedItem: AgendaItemType) => {
    setMember({
      ...member,
      agenda_items: member.agenda_items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      ),
    })

    setMeetingAgendaItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )
  }

  const handleToggleAgendaItem = async (id: string, completed: boolean) => {
    try {
      setError(null)
      await toggleAgendaItem(id, completed)
      setMember({
        ...member,
        agenda_items: member.agenda_items.map((item) =>
          item.id === id ? { ...item, completed } : item
        ),
      })

      setMeetingAgendaItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed } : item))
      )

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agenda item')
      console.error('Error updating agenda item:', err)
    }
  }

  const handleDeleteAgendaItem = async (id: string) => {
    try {
      setError(null)
      await deleteAgendaItem(id)
      setMember({
        ...member,
        agenda_items: member.agenda_items.filter((item) => item.id !== id),
      })

      setMeetingAgendaItems((prev) => prev.filter((item) => item.id !== id))

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agenda item')
      console.error('Error deleting agenda item:', err)
    }
  }

  const handleStartMeeting = async () => {
    try {
      setError(null)
      const newSession = await startMeetingSession(member.id)
      setMember({
        ...member,
        meeting_sessions: [newSession, ...(member.meeting_sessions || [])],
      })

      const items = relevantNowOpenItems
      setMeetingAgendaItems(items)
      setShowFuture(false)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start meeting')
      console.error('Error starting meeting:', err)
    }
  }

  const handleEndMeeting = async () => {
    try {
      setError(null)
      const endedSession = await endMeetingSession(member.id)
      setMember({
        ...member,
        meeting_sessions: (member.meeting_sessions || []).map((s) =>
          s.id === endedSession.id ? endedSession : s
        ),
      })

      setMeetingAgendaItems([])
      setShowFuture(false)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end meeting')
      console.error('Error ending meeting:', err)
    }
  }

  return (
    <div className={`min-h-screen bg-background ${isMeetingActive ? 'ring-4 ring-inset ring-[#F11E7D] shadow-[inset_0_0_20px_rgba(241,30,125,0.2)]' : ''}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href={`/teams/${teamId}`}>
            <Button variant="ghost" className="mb-4">
              ← Back to {teamName}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold">{member.name}</h1>
            {isMeetingActive ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEndMeeting}
                aria-label="End meeting"
                title="End meeting"
                className="text-[#F11E7D]"
              >
                <Square />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartMeeting}
                aria-label="Start meeting"
                title="Start meeting"
              >
                <Play />
              </Button>
            )}
          </div>
          {isMeetingActive && (
            <p className="text-[#F11E7D] font-medium mt-1">Meeting in progress</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Agenda Items</h2>
              {!isAddingItem && (
                <Button variant="outline" onClick={handleAddAgendaItem}>
                  + Add Item
                </Button>
              )}
            </div>

            {isAddingItem && (
              <div className="mb-4 space-y-2 p-4 border rounded-lg bg-card">
                <Input
                  placeholder="Enter agenda item..."
                  value={newAgendaContent}
                  onChange={(e) => setNewAgendaContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAgendaItem()
                    } else if (e.key === 'Escape') {
                      handleCancelAdd()
                    }
                  }}
                  autoFocus
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Schedule for:</label>
                  <Input
                    type="date"
                    value={newAgendaDate}
                    onChange={(e) => setNewAgendaDate(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddAgendaItem}
                    disabled={!newAgendaContent.trim()}
                  >
                    Add
                  </Button>
                  <Button variant="ghost" onClick={handleCancelAdd}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {isMeetingActive ? (
                meetingAgendaItems.length === 0 ? (
                  <p className="text-muted-foreground">No agenda items in this meeting</p>
                ) : (
                  meetingAgendaItems.map((item) => (
                    <AgendaItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggleAgendaItem}
                      onDelete={handleDeleteAgendaItem}
                      onUpdate={handleUpdateAgendaItem}
                    />
                  ))
                )
              ) : (
                <>
                  {relevantNowOpenItems.length === 0 && !isAddingItem ? (
                    <p className="text-muted-foreground">No agenda items due today</p>
                  ) : (
                    relevantNowOpenItems.map((item) => (
                      <AgendaItem
                        key={item.id}
                        item={item}
                        onToggle={handleToggleAgendaItem}
                        onDelete={handleDeleteAgendaItem}
                        onUpdate={handleUpdateAgendaItem}
                      />
                    ))
                  )}

                  {futureOpenItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFuture((v) => !v)}
                      className="mt-4 text-sm text-muted-foreground hover:underline"
                    >
                      {showFuture
                        ? 'Hide future items'
                        : `See future items${futureOpenItems.length ? ` (${futureOpenItems.length})` : ''}`}
                    </button>
                  )}

                  {showFuture && futureOpenItems.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Future:</p>
                      {futureOpenItems.map((item) => (
                        <AgendaItem
                          key={item.id}
                          item={item}
                          onToggle={handleToggleAgendaItem}
                          onDelete={handleDeleteAgendaItem}
                          onUpdate={handleUpdateAgendaItem}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
