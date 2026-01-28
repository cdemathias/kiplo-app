-- Add profile fields to team_members
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS current_focus TEXT,
ADD COLUMN IF NOT EXISTS growth_goals TEXT,
ADD COLUMN IF NOT EXISTS one_on_one_themes TEXT,
ADD COLUMN IF NOT EXISTS feedback_preferences TEXT,
ADD COLUMN IF NOT EXISTS profile_raw_input TEXT;

-- Add index for members with profiles (for filtering)
CREATE INDEX IF NOT EXISTS idx_team_members_has_profile 
ON team_members((role IS NOT NULL OR current_focus IS NOT NULL));
