import { supabase } from './supabase'
import type { Team, TeamMember, AgendaItem } from './db.types'

// Teams operations
export async function getTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Team[]
}

export async function getTeam(id: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(*, agenda_items(*))')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createTeam(name: string) {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ name }])
    .select()
    .single()

  if (error) throw error
  return data as Team
}

export async function deleteTeam(id: string) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Team members operations
export async function getTeamMembers(teamId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, agenda_items(*)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as (TeamMember & { agenda_items: AgendaItem[] })[]
}

export async function createTeamMember(teamId: string, name: string) {
  const { data, error } = await supabase
    .from('team_members')
    .insert([{ team_id: teamId, name }])
    .select()
    .single()

  if (error) throw error
  return data as TeamMember
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Agenda items operations
export async function getAgendaItems(teamMemberId: string) {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('team_member_id', teamMemberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as AgendaItem[]
}

export async function createAgendaItem(teamMemberId: string, content: string) {
  const { data, error } = await supabase
    .from('agenda_items')
    .insert([{ team_member_id: teamMemberId, content }])
    .select()
    .single()

  if (error) throw error
  return data as AgendaItem
}

export async function updateAgendaItem(id: string, updates: Partial<AgendaItem>) {
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
  const { error } = await supabase
    .from('agenda_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

