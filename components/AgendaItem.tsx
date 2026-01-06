"use client"

import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { AgendaItem } from '@/lib/db.types'

interface AgendaItemProps {
  item: AgendaItem
  onToggle?: (id: string, completed: boolean) => void
  onDelete?: (id: string) => void
}

export function AgendaItem({ item, onToggle, onDelete }: AgendaItemProps) {
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

  return (
    <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={item.completed}
        onCheckedChange={handleToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            item.completed
              ? 'line-through text-muted-foreground'
              : 'text-foreground'
          }`}
        >
          {item.content}
        </p>
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

