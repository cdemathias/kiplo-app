import { createClientSupabase } from './supabase'
import type { Team, TeamMember, AgendaItem, MeetingSession } from './db.types'

// Teams operations
export async function getTeams() {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Team[]
}

export async function getTeam(id: string) {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(*, agenda_items(*), meeting_sessions(*))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function createTeam(name: string) {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('teams')
    .insert([{ name, user_id: user.id }])
    .select()
    .single()

  if (error) throw error
  return data as Team
}

export async function deleteTeam(id: string) {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// Team members operations
export async function getTeamMembers(teamId: string) {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify team belongs to user
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Team not found or access denied')

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
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify team belongs to user
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Team not found or access denied')

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
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get team member and verify team belongs to user
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', id)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Agenda items operations
export async function getAgendaItems(teamMemberId: string) {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get team member and verify team belongs to user
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', teamMemberId)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

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
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get team member and verify team belongs to user
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', teamMemberId)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

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
  return data as AgendaItem
}

export async function updateAgendaItem(id: string, updates: Partial<AgendaItem>) {
  const supabase = createClientSupabase()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get agenda item and verify it belongs to user's team
  const { data: item } = await supabase
    .from('agenda_items')
    .select('team_member_id')
    .eq('id', id)
    .single()

  if (!item) throw new Error('Agenda item not found')

  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', item.team_member_id)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

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
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get agenda item and verify it belongs to user's team
  const { data: item } = await supabase
    .from('agenda_items')
    .select('team_member_id')
    .eq('id', id)
    .single()

  if (!item) throw new Error('Agenda item not found')

  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', item.team_member_id)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

  const { error } = await supabase
    .from('agenda_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Meeting sessions operations
export async function startMeetingSession(teamMemberId: string) {
  const supabase = createClientSupabase()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get team member and verify team belongs to user
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', teamMemberId)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

  const { data, error } = await supabase
    .from('meeting_sessions')
    .insert([{ team_member_id: teamMemberId }])
    .select()
    .single()

  if (error) throw error
  return data as MeetingSession
}

export async function endMeetingSession(teamMemberId: string) {
  const supabase = createClientSupabase()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get team member and verify team belongs to user
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', teamMemberId)
    .single()

  if (!member) throw new Error('Team member not found')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('user_id', user.id)
    .single()

  if (!team) throw new Error('Access denied')

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

