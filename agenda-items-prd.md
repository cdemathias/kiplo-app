## PRD: Meeting-Scoped Agenda Visibility (No Team Date Filter)

### Overview
Revise the **Member card** agenda experience to remove the **Team-level date filter** and replace it with a simpler, meeting-aligned visibility model:

- **Default (no active meeting)**: show only “relevant now” open items (no date, due today, overdue). Allow a per-card toggle to reveal **future** items.
- **Active meeting**: the meeting session contains **only the open “relevant now” items at meeting start**, plus any items added during the meeting. Items that become **completed** (or become **future-dated**) during the meeting **remain visible until the meeting ends**, then disappear from view.
- Establish the behavior needed for **carry-forward**: open items naturally re-appear in the next meeting’s “open at start” set.

This PRD applies to **Member cards only**. Team cards remain unchanged.

---

### Goals
- Remove the Team page date filter UI and behavior.
- Outside meetings, show only open items that matter “now”:
  - No date
  - Due today
  - Overdue (past-dated)
- Add a per-card “See future items” toggle (local UI state; no persistence required).
- On **Start Meeting**, persist a **snapshot** of eligible open items (“relevant now”).
- During a meeting, if an item becomes **completed** or becomes **future-dated**, keep it visible until **End Meeting**.
- Be carry-forward-ready: open items can naturally be included in subsequent sessions if still eligible.

---

### Non-Goals (for this PRD)
- No “History” page implementation yet.
- No completed-item log UI.
- No session history UI.
- No “Archived” state.
- No calendar/scheduling features beyond current `scheduled_date`.
- No persistence of “See future items” toggle across refresh/navigation.

---

### Scope
#### Applies to
- **Member cards only** (agenda list behavior + meeting behavior).

#### Does not apply to
- Team cards.
- New pages (History/Completed Items is future work).

---

## Definitions
### Dates
- **Today**: user’s local date (start-of-day to end-of-day).
- **Overdue**: `scheduled_date < today`.
- **Future**: `scheduled_date > today`.
- **No date**: `scheduled_date is null`.

### Item sets
- **Open**: `completed === false`
- **Completed**: `completed === true`
- **RelevantNowOpen**: open items where `scheduled_date is null OR scheduled_date <= today`
- **FutureOpen**: open items where `scheduled_date > today`

---

## User Experience
### Default State (No Active Meeting)
#### What the user sees
- Show **RelevantNowOpen** items.
- Hide **Completed** items (not visible in the UI for now).
- Hide **FutureOpen** items by default.

#### “See future items” toggle
- If `FutureOpen.length > 0`, show a small muted toggle at the bottom of the agenda list:
  - Collapsed: **“See future items”** (optional count: `(n)`)
  - Expanded: **“Hide future items”**
- When expanded, append a “Future” section (muted label + subtle divider) and list **FutureOpen** items.

> Note: The expanded/collapsed state is **local UI state** only and does not persist across refresh/navigation.

---

### Active Meeting Session State
#### Meeting session composition (key rule)
When the user clicks **Start Meeting**, the meeting session’s agenda scope becomes:
- **Included at start (snapshot)**: all **RelevantNowOpen** items at that moment.
- **Excluded at start**:
  - Items already **completed**
  - Items that are **future-dated**
- **Included during meeting**:
  - Any new agenda item created during the meeting (session grows during the meeting)

This scope is **persisted** so it survives refresh and supports carry-forward behavior later.

#### What the user sees during an active meeting
- Show the session’s item list.
- Do **not** show the “See future items” toggle.
- Do **not** show future-only items that are not part of the session snapshot.

#### Sticky visibility during meeting
While a meeting is active, if a session item is:
- Marked **completed**, it stays visible until meeting ends.
- Rescheduled **into the future**, it stays visible until meeting ends.

(After the meeting ends, it should disappear from the default view if it’s completed or future-dated.)

---

### Ending a Meeting
When the user clicks **End Meeting**:
- Member card returns to the **Default** rules.
- Items completed during the meeting disappear from the UI.
- Items rescheduled into the future during the meeting disappear from the default UI (unless future toggle is enabled later).
- The local “See future items” toggle resets to **collapsed**.

---

## Data Model / Persistence
### Existing
- `meeting_sessions(id, team_member_id, started_at, ended_at)`
- `agenda_items(..., completed, scheduled_date, ...)`

### New (required for this PRD)
Introduce a join table to persist the meeting’s agenda scope:

#### `meeting_session_agenda_items`
- `id`
- `meeting_session_id` (FK → `meeting_sessions.id`)
- `agenda_item_id` (FK → `agenda_items.id`)
- `added_at` (timestamp; default now)

#### Rules
- A meeting session’s agenda list is the set of rows in `meeting_session_agenda_items`.
- On **Start Meeting**:
  - Create a row in `meeting_sessions`.
  - Insert join rows for all agenda items that are **RelevantNowOpen** at start.
- On **Add agenda item during meeting**:
  - Create the `agenda_items` row.
  - Also insert a join row linking it into the active session.

---

## State Management
### Derived state per member
- `hasActiveMeeting = meeting_sessions.some(ended_at == null)`
- `relevantNowOpen = agenda_items.filter(!completed && (scheduled_date == null || scheduled_date <= today))`
- `futureOpen = agenda_items.filter(!completed && scheduled_date > today)`

### Meeting view
- If `hasActiveMeeting`, display `meeting_session_agenda_items` for the active session (not the general agenda list).

### Local UI state per Member card
- `showFuture` (boolean)
  - Default: `false`
  - Reset to `false` when meeting transitions `active -> inactive`

---

## Styling Requirements
- “See future items” link:
  - Small muted link-style text (e.g. `text-xs text-muted-foreground hover:underline`)
- “Future” section (when visible):
  - Subtle divider (`border-t`) and a small “Future:” label (muted text)
- No changes to Team card styling.

---

## Acceptance Criteria
- [ ] Team view date filter UI/behavior is removed.
- [ ] Default (no meeting): shows only open items that are no-date or due today/overdue.
- [ ] Default: future open items are hidden unless “See future items” is expanded.
- [ ] Default: completed items are not visible.
- [ ] Start Meeting: persists a snapshot containing only eligible open “relevant now” items.
- [ ] During Meeting: “See future items” is not shown and does not affect the meeting view.
- [ ] During Meeting: items completed during meeting remain visible until meeting ends.
- [ ] During Meeting: items rescheduled into the future remain visible until meeting ends.
- [ ] During Meeting: newly created items are added into the active session list.
- [ ] End Meeting: UI returns to default rules and hides completed/future-dated items; future toggle resets collapsed.
- [ ] Team cards remain unchanged.

---

## Future Considerations (Out of Scope)
- “History” icon in Member card → navigates to “Completed Items” page.
- Add `completed_at` (and likely `updated_at`) to support a reliable completion timeline.
- Carry-forward enhancements (e.g. “carried from last meeting” markers, session summaries).