-- Add user_id to teams table to link teams to authenticated users
ALTER TABLE teams 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on teams" ON teams;
DROP POLICY IF EXISTS "Allow all operations on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow all operations on agenda_items" ON agenda_items;

-- Create new RLS policies for teams
-- Users can only see their own teams
CREATE POLICY "Users can only see their own teams" ON teams
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert teams for themselves
CREATE POLICY "Users can only create their own teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own teams
CREATE POLICY "Users can only update their own teams" ON teams
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own teams
CREATE POLICY "Users can only delete their own teams" ON teams
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for team_members
-- Users can only see team members of their own teams
CREATE POLICY "Users can only see members of their own teams" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only create members for their own teams
CREATE POLICY "Users can only create members for their own teams" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only update members of their own teams
CREATE POLICY "Users can only update members of their own teams" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only delete members of their own teams
CREATE POLICY "Users can only delete members of their own teams" ON team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.user_id = auth.uid()
    )
  );

-- Create RLS policies for agenda_items
-- Users can only see agenda items of their own team members
CREATE POLICY "Users can only see agenda items of their own teams" ON agenda_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = agenda_items.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only create agenda items for their own team members
CREATE POLICY "Users can only create agenda items for their own teams" ON agenda_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = agenda_items.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only update agenda items of their own teams
CREATE POLICY "Users can only update agenda items of their own teams" ON agenda_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = agenda_items.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

-- Users can only delete agenda items of their own teams
CREATE POLICY "Users can only delete agenda items of their own teams" ON agenda_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.id = agenda_items.team_member_id
      AND teams.user_id = auth.uid()
    )
  );

