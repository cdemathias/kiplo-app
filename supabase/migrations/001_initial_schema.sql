-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agenda_items table
CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_agenda_items_team_member_id ON agenda_items(team_member_id);
CREATE INDEX IF NOT EXISTS idx_agenda_items_completed ON agenda_items(completed);

-- Enable Row Level Security (RLS) - for now, allow all operations
-- You can restrict this later based on authentication
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for MVP)
CREATE POLICY "Allow all operations on teams" ON teams
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on team_members" ON team_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on agenda_items" ON agenda_items
  FOR ALL USING (true) WITH CHECK (true);

