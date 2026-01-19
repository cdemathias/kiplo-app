-- Create meeting_sessions table
CREATE TABLE IF NOT EXISTS meeting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- A member can have at most one active meeting session (ended_at IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_meeting_sessions_active_per_member
  ON meeting_sessions(team_member_id)
  WHERE ended_at IS NULL;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_team_member_id ON meeting_sessions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_ended_at ON meeting_sessions(ended_at);

-- Enable Row Level Security (RLS)
ALTER TABLE meeting_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration in dev
DROP POLICY IF EXISTS "Users can only see meeting sessions of their own teams" ON meeting_sessions;
DROP POLICY IF EXISTS "Users can only create meeting sessions for their own teams" ON meeting_sessions;
DROP POLICY IF EXISTS "Users can only update meeting sessions of their own teams" ON meeting_sessions;
DROP POLICY IF EXISTS "Users can only delete meeting sessions of their own teams" ON meeting_sessions;

-- Users can only see meeting sessions of their own team members
CREATE POLICY "Users can only see meeting sessions of their own teams" ON meeting_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = meeting_sessions.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only create meeting sessions for their own team members
CREATE POLICY "Users can only create meeting sessions for their own teams" ON meeting_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = meeting_sessions.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only update meeting sessions of their own team members
CREATE POLICY "Users can only update meeting sessions of their own teams" ON meeting_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = meeting_sessions.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only delete meeting sessions of their own team members
CREATE POLICY "Users can only delete meeting sessions of their own teams" ON meeting_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = meeting_sessions.team_member_id
      AND teams.user_id = auth.uid()
    )
  );


