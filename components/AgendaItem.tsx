"use client"

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateAgendaItem } from '@/lib/db-operations'
import type { AgendaItem } from '@/lib/db.types'

interface AgendaItemProps {
  item: AgendaItem
  onToggle?: (id: string, completed: boolean) => void
  onDelete?: (id: string) => void
  onUpdate?: (item: AgendaItem) => void
}

export function AgendaItem({ item, onToggle, onDelete, onUpdate }: AgendaItemProps) {
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState(item.scheduled_date || '')
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [contentValue, setContentValue] = useState(item.content)

  const handleToggle = () => {
    if (onToggle) {
      onToggle(item.id, !item.completed)
    }
  }

  const handleDelete = () => {
    if (onDelete && confirm('Delete this agenda item?')) {
      onDelete(item.id)
    }
  }

  const handleDateChange = async (newDate: string) => {
    try {
      const updatedItem = await updateAgendaItem(item.id, { scheduled_date: newDate || null })
      if (onUpdate) {
        onUpdate(updatedItem)
      }
      setIsEditingDate(false)
      setDateValue(newDate)
    } catch (error) {
      console.error('Error updating date:', error)
      setDateValue(item.scheduled_date || '')
    }
  }

  const handleContentChange = async (newContent: string) => {
    const trimmedContent = newContent.trim()
    if (!trimmedContent || trimmedContent === item.content) {
      setIsEditingContent(false)
      setContentValue(item.content)
      return
    }
    try {
      const updatedItem = await updateAgendaItem(item.id, { content: trimmedContent })
      if (onUpdate) {
        onUpdate(updatedItem)
      }
      setIsEditingContent(false)
      setContentValue(trimmedContent)
    } catch (error) {
      console.error('Error updating content:', error)
      setContentValue(item.content)
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return ''
    const itemDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    itemDate.setHours(0, 0, 0, 0)

    if (itemDate.getTime() === today.getTime()) {
      return 'Today'
    } else if (itemDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      return itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const isOverdue = (): boolean => {
    if (!item.scheduled_date || item.completed) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const itemDate = new Date(item.scheduled_date)
    itemDate.setHours(0, 0, 0, 0)
    return itemDate < today
  }

  return (
    <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={item.completed}
        onCheckedChange={handleToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {isEditingContent ? (
          <Input
            value={contentValue}
            onChange={(e) => setContentValue(e.target.value)}
            onBlur={() => handleContentChange(contentValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleContentChange(contentValue)
              } else if (e.key === 'Escape') {
                setIsEditingContent(false)
                setContentValue(item.content)
              }
            }}
            className="h-7 text-sm"
            autoFocus
          />
        ) : (
          <p
            onClick={() => setIsEditingContent(true)}
            className={`text-sm cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 ${
              item.completed
                ? 'line-through text-muted-foreground'
                : 'text-foreground'
            }`}
          >
            {item.content}
          </p>
        )}
        {isEditingDate ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              onBlur={() => handleDateChange(dateValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDateChange(dateValue)
                } else if (e.key === 'Escape') {
                  setIsEditingDate(false)
                  setDateValue(item.scheduled_date || '')
                }
              }}
              className="h-7 text-xs"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            {item.scheduled_date ? (
              <button
                onClick={() => setIsEditingDate(true)}
                className={`text-xs ${
                  isOverdue()
                    ? 'text-destructive font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {formatDate(item.scheduled_date)}
              </button>
            ) : (
              <button
                onClick={() => setIsEditingDate(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Add date
              </button>
            )}
          </div>
        )}
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive h-6 w-6 p-0"
        >
          ×
        </Button>
      )}
    </div>
  )
}

