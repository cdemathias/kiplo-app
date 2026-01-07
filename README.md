# Kiplo

A simple MVP app for managing teams, team members, and 1:1 agenda items.

## Features

- **User Authentication** - Secure email/password authentication with Supabase Auth
- Create and manage teams
- Add team members to teams
- Create agenda items for each team member
- Toggle agenda items as completed during 1:1s
- Clean, modern UI built with Next.js and Tailwind CSS
- Row-level security - Users can only access their own teams and data

## Tech Stack

- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql` (creates tables)
   - `supabase/migrations/002_add_user_auth.sql` (adds authentication and RLS policies)
4. Copy your project URL and anon key from Settings > API
5. Enable Email authentication in Authentication > Providers (should be enabled by default)
6. **For Development**: Disable email confirmation to allow immediate signup:
   - Go to Authentication → Settings
   - Under "Email Auth", toggle OFF "Enable email confirmations"
   - This allows users to sign up and use the app immediately without email verification
   - **For Production**: Keep email confirmations enabled for security

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note**: You'll be redirected to the login page. Create an account to get started.

## Database Schema

The app uses three main tables:

- **teams** - Stores team information (linked to users via `user_id`)
- **team_members** - Stores team members (linked to teams)
- **agenda_items** - Stores agenda items (linked to team members)

**Authentication:**
- Uses Supabase Auth's built-in `auth.users` table
- Row-level security (RLS) policies ensure users can only access their own data
- All tables have RLS enabled with policies that check `auth.uid()`

## Usage

1. **Sign Up/Login**: Create an account or sign in with your email and password
2. **Create a Team**: On the home page, enter a team name and click "Create Team"
3. **View Team**: Click on a team card to view its details
4. **Add Members**: On the team page, enter a member name and click "Add Member"
5. **Add Agenda Items**: Click "+ Add Item" next to a member's name
6. **Complete Items**: Check the checkbox next to an agenda item to mark it as completed
7. **Delete Items**: Click the × button to delete an agenda item
8. **Sign Out**: Click the "Sign Out" button in the header

## Project Structure

```
management-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home/dashboard page
│   └── teams/[id]/        # Team detail page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── TeamCard.tsx
│   ├── MemberCard.tsx
│   └── AgendaItem.tsx
├── lib/                   # Utilities
│   ├── supabase.ts       # Supabase client
│   ├── auth-context.tsx  # Authentication context provider
│   ├── db.types.ts       # Database types
│   └── db-operations.ts  # CRUD operations
├── app/
│   ├── login/           # Login page
│   └── signup/          # Sign up page
└── middleware.ts        # Route protection middleware
└── supabase/             # Supabase config
    └── migrations/       # Database migrations
```
