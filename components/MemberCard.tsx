"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgendaItem } from './AgendaItem'
import type { TeamMember, AgendaItem as AgendaItemType } from '@/lib/db.types'

interface MemberCardProps {
  member: TeamMember & { agenda_items?: AgendaItemType[] }
  onDelete?: (id: string) => void
  onAddAgendaItem?: (memberId: string, content: string, scheduledDate?: string | null) => void
  onToggleAgendaItem?: (id: string, completed: boolean) => void
  onDeleteAgendaItem?: (id: string) => void
  onUpdateAgendaItem?: (item: AgendaItemType) => void
}

export function MemberCard({
  member,
  onDelete,
  onAddAgendaItem,
  onToggleAgendaItem,
  onDeleteAgendaItem,
  onUpdateAgendaItem,
}: MemberCardProps) {
  const [newAgendaContent, setNewAgendaContent] = useState('')
  const [newAgendaDate, setNewAgendaDate] = useState<string>('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  
  const agendaItems = member.agenda_items || []
  const pendingItems = agendaItems.filter(item => !item.completed)
  const completedItems = agendaItems.filter(item => item.completed)

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{member.name}</span>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(member.id)}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          )}
        </CardTitle>
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
          
          {agendaItems.length === 0 && !isAddingItem ? (
            <p className="text-sm text-muted-foreground">No agenda items yet</p>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <AgendaItem
                  key={item.id}
                  item={item}
                  onToggle={onToggleAgendaItem}
                  onDelete={onDeleteAgendaItem}
                  onUpdate={onUpdateAgendaItem}
                />
              ))}
              {completedItems.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Completed:</p>
                  {completedItems.map((item) => (
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

