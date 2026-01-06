// Database types - will be generated from Supabase schema
// For now, defining manually based on the schema

export type Team = {
  id: string
  name: string
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
  created_at: string
}

// Extended types with relations
export type TeamWithMembers = Team & {
  team_members: TeamMember[]
}

export type TeamMemberWithAgenda = TeamMember & {
  agenda_items: AgendaItem[]
}

