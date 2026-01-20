-- Create meeting_session_agenda_items join table
-- Persists which agenda items are included in a specific meeting session
CREATE TABLE IF NOT EXISTS meeting_session_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_session_id UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  agenda_item_id UUID NOT NULL REFERENCES agenda_items(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uniq_meeting_session_agenda_item UNIQUE (meeting_session_id, agenda_item_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_msai_meeting_session_id
  ON meeting_session_agenda_items(meeting_session_id);
CREATE INDEX IF NOT EXISTS idx_msai_agenda_item_id
  ON meeting_session_agenda_items(agenda_item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE meeting_session_agenda_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration in dev
DROP POLICY IF EXISTS "Users can only see meeting session agenda items of their own teams" ON meeting_session_agenda_items;
DROP POLICY IF EXISTS "Users can only create meeting session agenda items for their own teams" ON meeting_session_agenda_items;
DROP POLICY IF EXISTS "Users can only update meeting session agenda items of their own teams" ON meeting_session_agenda_items;
DROP POLICY IF EXISTS "Users can only delete meeting session agenda items of their own teams" ON meeting_session_agenda_items;

-- Users can only see meeting session agenda items of their own team members
CREATE POLICY "Users can only see meeting session agenda items of their own teams" ON meeting_session_agenda_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM meeting_sessions ms
      JOIN team_members tm ON tm.id = ms.team_member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE ms.id = meeting_session_agenda_items.meeting_session_id
      AND t.user_id = auth.uid()
    )
  );

-- Users can only create meeting session agenda items for their own team members
-- Also enforce that the agenda item belongs to the same member as the meeting session.
CREATE POLICY "Users can only create meeting session agenda items for their own teams" ON meeting_session_agenda_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM meeting_sessions ms
      JOIN team_members tm ON tm.id = ms.team_member_id
      JOIN teams t ON t.id = tm.team_id
      JOIN agenda_items ai ON ai.id = meeting_session_agenda_items.agenda_item_id
      WHERE ms.id = meeting_session_agenda_items.meeting_session_id
      AND ai.team_member_id = ms.team_member_id
      AND t.user_id = auth.uid()
    )
  );

-- Users can only delete meeting session agenda items of their own team members
CREATE POLICY "Users can only delete meeting session agenda items of their own teams" ON meeting_session_agenda_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM meeting_sessions ms
      JOIN team_members tm ON tm.id = ms.team_member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE ms.id = meeting_session_agenda_items.meeting_session_id
      AND t.user_id = auth.uid()
    )
  );

-- Updates are not required for current use-cases; keep UPDATE disallowed by default.

