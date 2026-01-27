"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgendaItem } from './AgendaItem'
import type { TeamMember, AgendaItem as AgendaItemType } from '@/lib/db.types'
import { cn } from '@/lib/utils'
import { Play, Square, Expand, Trash2 } from 'lucide-react'

function getLocalISODateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface MemberCardProps {
  member: TeamMember & { agenda_items?: AgendaItemType[] }
  teamId: string
  meetingAgendaItems?: AgendaItemType[]
  onDelete?: (id: string) => void
  onAddAgendaItem?: (memberId: string, content: string, scheduledDate?: string | null) => void
  onToggleAgendaItem?: (id: string, completed: boolean) => void
  onDeleteAgendaItem?: (id: string) => void
  onUpdateAgendaItem?: (item: AgendaItemType) => void
  isMeetingActive?: boolean
  onStartMeeting?: (memberId: string) => void | Promise<void>
  onEndMeeting?: (memberId: string) => void | Promise<void>
}

export function MemberCard({
  member,
  teamId,
  meetingAgendaItems = [],
  onDelete,
  onAddAgendaItem,
  onToggleAgendaItem,
  onDeleteAgendaItem,
  onUpdateAgendaItem,
  isMeetingActive = false,
  onStartMeeting,
  onEndMeeting,
}: MemberCardProps) {
  const [newAgendaContent, setNewAgendaContent] = useState('')
  const [newAgendaDate, setNewAgendaDate] = useState<string>('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [showFuture, setShowFuture] = useState(false)
  
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

  const handleAddAgendaItem = () => {
    if (isAddingItem) {
      if (newAgendaContent.trim() && onAddAgendaItem) {
        onAddAgendaItem(member.id, newAgendaContent.trim(), newAgendaDate || null)
        setNewAgendaContent('')
        setNewAgendaDate('')
        setIsAddingItem(false)
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

  return (
    <Card
      className={cn(
        "transition-colors duration-200",
        isMeetingActive && "border-2 border-[#F11E7D]"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {member.name}
          {isMeetingActive ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setShowFuture(false)
                onEndMeeting?.(member.id)
              }}
              aria-label="End meeting"
              title="End meeting"
            >
              <Square />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setShowFuture(false)
                onStartMeeting?.(member.id)
              }}
              aria-label="Start meeting"
              title="Start meeting"
            >
              <Play />
            </Button>
          )}
          <Link href={`/teams/${teamId}/members/${member.id}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Expand"
              title="Expand"
            >
              <Expand />
            </Button>
          </Link>
        </CardTitle>
        {onDelete && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(member.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Delete member"
              title="Delete member"
            >
              <Trash2 />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Agenda Items</h3>
            {!isAddingItem && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAgendaItem}
              >
                + Add Item
              </Button>
            )}
          </div>
          
          {isAddingItem && (
            <div className="mb-3 space-y-2">
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
                <label className="text-xs text-muted-foreground whitespace-nowrap">Schedule for:</label>
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
                  size="sm"
                  onClick={handleAddAgendaItem}
                  disabled={!newAgendaContent.trim()}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAdd}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {!isMeetingActive && agendaItems.length === 0 && !isAddingItem ? (
            <p className="text-sm text-muted-foreground">No agenda items yet</p>
          ) : (
            <div className="space-y-2">
              {isMeetingActive ? (
                meetingAgendaItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agenda items in this meeting</p>
                ) : (
                  meetingAgendaItems.map((item) => (
                    <AgendaItem
                      key={item.id}
                      item={item}
                      onToggle={onToggleAgendaItem}
                      onDelete={onDeleteAgendaItem}
                      onUpdate={onUpdateAgendaItem}
                    />
                  ))
                )
              ) : (
                <>
                  {relevantNowOpenItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No agenda items due today</p>
                  ) : (
                    relevantNowOpenItems.map((item) => (
                      <AgendaItem
                        key={item.id}
                        item={item}
                        onToggle={onToggleAgendaItem}
                        onDelete={onDeleteAgendaItem}
                        onUpdate={onUpdateAgendaItem}
                      />
                    ))
                  )}

                  {futureOpenItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFuture((v) => !v)}
                      className="mt-2 text-xs text-muted-foreground hover:underline"
                    >
                      {showFuture
                        ? 'Hide future items'
                        : `See future items${futureOpenItems.length ? ` (${futureOpenItems.length})` : ''}`}
                    </button>
                  )}

                  {showFuture && futureOpenItems.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Future:</p>
                      {futureOpenItems.map((item) => (
                        <AgendaItem
                          key={item.id}
                          item={item}
                          onToggle={onToggleAgendaItem}
                          onDelete={onDeleteAgendaItem}
                          onUpdate={onUpdateAgendaItem}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

