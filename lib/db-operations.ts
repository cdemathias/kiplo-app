import { createClientSupabase } from './supabase'
import type { Team, TeamMember, AgendaItem, MeetingSession } from './db.types'

function getLocalISODateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function requireUserId(): Promise<string> {
  const supabase = createClientSupabase()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const userId = data.session?.user?.id
  if (!userId) throw new Error('User not authenticated')
  return userId
}

// Teams operations
export async function getTeams() {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Team[]
}

export async function getTeam(id: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(*, agenda_items(*), meeting_sessions(*, meeting_session_agenda_items(added_at, agenda_items(*))))')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createTeam(name: string) {
  const supabase = createClientSupabase()
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from('teams')
    .insert([{ name, user_id: userId }])
    .select()
    .single()

  if (error) throw error
  return data as Team
}

export async function deleteTeam(id: string) {
  const supabase = createClientSupabase()

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Team members operations
export async function getTeamMembers(teamId: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('team_members')
    .select('*, agenda_items(*)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as (TeamMember & { agenda_items: AgendaItem[] })[]
}

export async function createTeamMember(teamId: string, name: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('team_members')
    .insert([{ team_id: teamId, name }])
    .select()
    .single()

  if (error) throw error
  return data as TeamMember
}

export async function deleteTeamMember(id: string) {
  const supabase = createClientSupabase()

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Agenda items operations
export async function getAgendaItems(teamMemberId: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('team_member_id', teamMemberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as AgendaItem[]
}

export async function createAgendaItem(teamMemberId: string, content: string, scheduledDate?: string | null) {
  const supabase = createClientSupabase()

  const insertData: { team_member_id: string; content: string; scheduled_date?: string | null } = {
    team_member_id: teamMemberId,
    content,
  }

  if (scheduledDate !== undefined) {
    insertData.scheduled_date = scheduledDate || null
  }

  const { data, error } = await supabase
    .from('agenda_items')
    .insert([insertData])
    .select()
    .single()

  if (error) throw error
  const created = data as AgendaItem

  // If a meeting session is active for this member, include the new item in the session scope.
  const { data: activeSessions, error: activeSessionError } = await supabase
    .from('meeting_sessions')
    .select('id')
    .eq('team_member_id', teamMemberId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)

  if (activeSessionError) throw activeSessionError
  const activeSessionId = activeSessions?.[0]?.id

  if (activeSessionId) {
    const { error: linkError } = await supabase
      .from('meeting_session_agenda_items')
      .insert([{ meeting_session_id: activeSessionId, agenda_item_id: created.id }])

    if (linkError) throw linkError
  }

  return created
}

export async function updateAgendaItem(id: string, updates: Partial<AgendaItem>) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('agenda_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as AgendaItem
}

export async function toggleAgendaItem(id: string, completed: boolean) {
  return updateAgendaItem(id, { completed })
}

export async function deleteAgendaItem(id: string) {
  const supabase = createClientSupabase()

  const { error } = await supabase
    .from('agenda_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Meeting sessions operations
export async function startMeetingSession(teamMemberId: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('meeting_sessions')
    .insert([{ team_member_id: teamMemberId }])
    .select()
    .single()

  if (error) throw error
  const session = data as MeetingSession

  // Snapshot eligible open items at meeting start: RelevantNowOpen
  const { data: openItems, error: openItemsError } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('team_member_id', teamMemberId)
    .eq('completed', false)

  if (openItemsError) throw openItemsError

  const today = getLocalISODateString()
  const relevantNowOpen = (openItems as AgendaItem[]).filter((item) => {
    if (!item.scheduled_date) return true
    return item.scheduled_date <= today
  })

  if (relevantNowOpen.length > 0) {
    const { error: snapshotError } = await supabase
      .from('meeting_session_agenda_items')
      .insert(
        relevantNowOpen.map((item) => ({
          meeting_session_id: session.id,
          agenda_item_id: item.id,
        }))
      )

    if (snapshotError) throw snapshotError
  }

  return session
}

export async function endMeetingSession(teamMemberId: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('meeting_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('team_member_id', teamMemberId)
    .is('ended_at', null)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('No active meeting session found')
  return data as MeetingSession
}

export async function getActiveMeetingSessionAgendaItems(teamMemberId: string): Promise<AgendaItem[]> {
  const supabase = createClientSupabase()

  const { data: sessions, error: sessionError } = await supabase
    .from('meeting_sessions')
    .select('id')
    .eq('team_member_id', teamMemberId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)

  if (sessionError) throw sessionError
  const sessionId = sessions?.[0]?.id
  if (!sessionId) return []

  const { data: links, error: linksError } = await supabase
    .from('meeting_session_agenda_items')
    .select('added_at, agenda_items(*)')
    .eq('meeting_session_id', sessionId)
    .order('added_at', { ascending: true })

  if (linksError) throw linksError

  // Supabase's inferred shape here can vary (agenda_items may come back as an object or a 1-element array),
  // so normalize from unknown -> AgendaItem | null safely.
  const rows = (links || []) as unknown as Array<{ agenda_items?: unknown }>

  return rows
    .map((row) => {
      const ai = row.agenda_items
      if (!ai) return null
      if (Array.isArray(ai)) return (ai[0] as AgendaItem | undefined) ?? null
      return ai as AgendaItem
    })
    .filter((x: AgendaItem | null): x is AgendaItem => Boolean(x))
}
