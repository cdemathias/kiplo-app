"use client"

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Team } from '@/lib/db.types'

interface TeamCardProps {
  team: Team
  onDelete?: (id: string) => void
}

export function TeamCard({ team, onDelete }: TeamCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Link href={`/teams/${team.id}`} className="hover:underline">
            {team.name}
          </Link>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(team.id)}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Link href={`/teams/${team.id}`}>
          <Button variant="outline" className="w-full">
            View Team
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

