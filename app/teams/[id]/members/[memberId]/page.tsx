import { redirect } from 'next/navigation'
import MemberDetailClient from './MemberDetailClient'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AgendaItem, MeetingSession } from '@/lib/db.types'

type MeetingSessionAgendaItemLinkRow = { added_at: string; agenda_items?: unknown }

type MeetingSessionRow = MeetingSession & {
  meeting_session_agenda_items?: MeetingSessionAgendaItemLinkRow[]
}

function normalizeAgendaItem(value: unknown): AgendaItem | null {
  if (!value) return null
  if (Array.isArray(value)) return (value[0] as AgendaItem | undefined) ?? null
  return value as AgendaItem
}

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string; memberId: string }
}) {
  const { id: teamId, memberId } = await (params as unknown as Promise<{ id: string; memberId: string }>)
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch team name
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single()

  if (teamError) throw teamError

  // Fetch member with agenda items and meeting sessions
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('*, agenda_items(*), meeting_sessions(*, meeting_session_agenda_items(added_at, agenda_items(*)))')
    .eq('id', memberId)
    .single()

  if (memberError) throw memberError

  const rawMember = member as unknown as {
    id: string
    team_id: string
    name: string
    created_at: string
    agenda_items?: AgendaItem[]
    meeting_sessions?: MeetingSessionRow[]
  }

  const initialMember = {
    id: rawMember.id,
    team_id: rawMember.team_id,
    name: rawMember.name,
    created_at: rawMember.created_at,
    agenda_items: rawMember.agenda_items || [],
    meeting_sessions: (rawMember.meeting_sessions || []) as MeetingSession[],
  }

  // Get meeting agenda items if there's an active session
  let initialMeetingAgendaItems: AgendaItem[] = []
  const activeSession = (rawMember.meeting_sessions || []).find((s) => s.ended_at == null)
  if (activeSession) {
    const links = activeSession.meeting_session_agenda_items || []
    const sorted = [...links].sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
    )
    initialMeetingAgendaItems = sorted
      .map((row) => normalizeAgendaItem(row.agenda_items))
      .filter((x: AgendaItem | null): x is AgendaItem => Boolean(x))
  }

  return (
    <MemberDetailClient
      teamId={teamId}
      teamName={team.name}
      initialMember={initialMember}
      initialMeetingAgendaItems={initialMeetingAgendaItems}
    />
  )
}
