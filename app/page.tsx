import { redirect } from 'next/navigation'
import TeamsClient from './TeamsClient'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Team } from '@/lib/db.types'

export default async function Home() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // For now: crash loud in dev; can be improved with a nicer error boundary later.
    throw error
  }

  return <TeamsClient initialTeams={(data || []) as Team[]} />
}
