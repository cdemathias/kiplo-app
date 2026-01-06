# Kiplo

A simple MVP app for managing teams, team members, and 1:1 agenda items.

## Features

- Create and manage teams
- Add team members to teams
- Create agenda items for each team member
- Toggle agenda items as completed during 1:1s
- Clean, modern UI built with Next.js and Tailwind CSS

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
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`
4. Copy your project URL and anon key from Settings > API

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

## Database Schema

The app uses three main tables:

- **teams** - Stores team information
- **team_members** - Stores team members (linked to teams)
- **agenda_items** - Stores agenda items (linked to team members)

## Usage

1. **Create a Team**: On the home page, enter a team name and click "Create Team"
2. **View Team**: Click on a team card to view its details
3. **Add Members**: On the team page, enter a member name and click "Add Member"
4. **Add Agenda Items**: Click "+ Add Item" next to a member's name
5. **Complete Items**: Check the checkbox next to an agenda item to mark it as completed
6. **Delete Items**: Click the × button to delete an agenda item

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
│   ├── db.types.ts       # Database types
│   └── db-operations.ts  # CRUD operations
└── supabase/             # Supabase config
    └── migrations/       # Database migrations
```
