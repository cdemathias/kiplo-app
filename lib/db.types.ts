// Database types - will be generated from Supabase schema
// For now, defining manually based on the schema

export type Team = {
  id: string
  name: string
  user_id: string
  created_at: string
}

export type TeamMember = {
  id: string
  team_id: string
  name: string
  created_at: string
}

export type AgendaItem = {
  id: string
  team_member_id: string
  content: string
  completed: boolean
  scheduled_date: string | null
  created_at: string
}

export type MeetingSession = {
  id: string
  team_member_id: string
  started_at: string
  ended_at: string | null
}

// Extended types with relations
export type TeamWithMembers = Team & {
  team_members: TeamMember[]
}

export type TeamMemberWithAgenda = TeamMember & {
  agenda_items: AgendaItem[]
}

export type TeamMemberWithAgendaAndMeetings = TeamMember & {
  agenda_items: AgendaItem[]
  meeting_sessions: MeetingSession[]
}

