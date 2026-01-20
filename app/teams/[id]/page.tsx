import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AgendaItem, MeetingSession, TeamMember } from '@/lib/db.types'

type MeetingSessionAgendaItemLinkRow = { added_at: string; agenda_items?: unknown }

type MeetingSessionRow = MeetingSession & {
  meeting_session_agenda_items?: MeetingSessionAgendaItemLinkRow[]
}

type TeamMemberRow = TeamMember & {
  agenda_items?: AgendaItem[]
  meeting_sessions?: MeetingSessionRow[]
}

type TeamRow = {
  name: string
  team_members?: TeamMemberRow[]
}

function normalizeAgendaItem(value: unknown): AgendaItem | null {
  if (!value) return null
  if (Array.isArray(value)) return (value[0] as AgendaItem | undefined) ?? null
  return value as AgendaItem
}

export default async function TeamPage({ params }: { params: { id: string } }) {
  // Next 16 provides dynamic route params as a Promise (sync dynamic APIs).
  // Unwrap before reading to avoid `undefined` leaking into queries.
  const { id: teamId } = await (params as unknown as Promise<{ id: string }>)
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(*, agenda_items(*), meeting_sessions(*, meeting_session_agenda_items(added_at, agenda_items(*))))')
    .eq('id', teamId)
    .single()

  if (error) throw error

  const team = data as unknown as TeamRow
  const rawMembers = team.team_members || []

  const initialMembers = rawMembers.map((m) => ({
    ...m,
    agenda_items: m.agenda_items || [],
    meeting_sessions: (m.meeting_sessions || []) as MeetingSession[],
  }))

  const initialMeetingAgendaItemsByMemberId: Record<string, AgendaItem[]> = {}
  for (const m of rawMembers) {
    const activeSession = (m.meeting_sessions || []).find((s) => s.ended_at == null)
    const links = activeSession?.meeting_session_agenda_items || []
    if (links.length === 0) continue

    const sorted = [...links].sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
    )

    initialMeetingAgendaItemsByMemberId[m.id] = sorted
      .map((row) => normalizeAgendaItem(row.agenda_items))
      .filter((x: AgendaItem | null): x is AgendaItem => Boolean(x))
  }

  return (
    <TeamClient
      teamId={teamId}
      initialTeamName={team.name}
      initialMembers={initialMembers}
      initialMeetingAgendaItemsByMemberId={initialMeetingAgendaItemsByMemberId}
    />
  )
}
