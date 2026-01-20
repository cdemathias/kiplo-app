"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TeamCard } from '@/components/TeamCard'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createTeam, deleteTeam } from '@/lib/db-operations'
import type { Team } from '@/lib/db.types'

export default function TeamsClient({ initialTeams }: { initialTeams: Team[] }) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [error, setError] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return

    try {
      setIsCreating(true)
      setError(null)
      const newTeam = await createTeam(newTeamName.trim())
      setTeams([newTeam, ...teams])
      setNewTeamName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
      console.error('Error creating team:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team? This will also delete all members and agenda items.')) {
      return
    }

    try {
      setError(null)
      await deleteTeam(id)
      setTeams(teams.filter((team) => team.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team')
      console.error('Error deleting team:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Teams</h1>
          <p className="text-muted-foreground">Manage your teams, members, and 1:1 agenda items</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter team name..."
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateTeam()
                }
              }}
              className="max-w-md"
            />
            <Button onClick={handleCreateTeam} disabled={isCreating || !newTeamName.trim()}>
              {isCreating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No teams yet. Create your first team to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onDelete={handleDeleteTeam} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

