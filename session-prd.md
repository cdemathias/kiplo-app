# PRD: 1:1 Meeting Session State (Member Card Only)

## Overview
Introduce a lightweight **1:1 meeting session state** for **Member cards only**, enabling managers to explicitly **Start** and **End** a meeting. While a meeting is active, the Member card visually indicates the state via a highlighted border and exposes an **End Meeting** control.

This feature lays the foundation for carry-forward agenda behavior without introducing scheduling, calendars, or session history UI.

---

## Goals
- Allow managers to explicitly start and end a 1:1 meeting
- Visually indicate when a meeting is in progress
- Keep the experience simple, fast, and intuitive
- Establish a minimal data model for future carry-forward logic

---

## Non-Goals
- No calendar or scheduling functionality
- No session history UI
- No summaries or analytics
- No changes to Team cards
- No automatic meeting start/end logic

---

## Scope

### Applies to
- **Member cards only**
- Team cards must remain unchanged

---

## User Experience

### Default State (No Active Meeting)
- Member card appears as it does today
- A **Start Meeting** control is visible in the Member card header
- No special border or visual emphasis

---

### Active Meeting State
Triggered when the user clicks **Start Meeting**

#### Visual Changes
- Member card border:
  - Border width increases slightly (e.g. `border-2`)
  - Border color transitions to **#F11E7D**
- Border transition should be smooth (CSS transition)

#### Controls
- Start Meeting button is replaced with an **End Meeting** button
- End Meeting button clearly indicates stopping the session

---

### Ending a Meeting
Triggered when the user clicks **End Meeting**

- Card styling returns to default
- Start Meeting button becomes visible again
- No session summary or history is shown

---

## Controls & UI Details

### Start Meeting Button
- Location: Member Card Header (right-aligned, using existing `CardAction`)
- Visual:
  - Sleek black-and-white **Play** icon
  - Icon-only button
- Behavior:
  - On click:
    - Creates a new active meeting session for the member
    - Sets meeting state to `in_progress`

---

### End Meeting Button
- Replaces Start Meeting button when meeting is active
- Visual:
  - Square **Stop** icon
  - Same size and placement as Start Meeting
- Behavior:
  - Ends the active meeting session
  - Clears meeting state

> Icon components may be implemented later from Figma. Use placeholders if needed.

---

## Data Model

Introduce a lightweight `MeetingSession` concept.

### MeetingSession
- `id`
- `memberId`
- `startedAt` (timestamp)
- `endedAt` (timestamp | null)

### Rules
- A member can have **at most one active meeting session**
- An active session is defined as:
  - `startedAt` is set
  - `endedAt` is `null`

---

## State Management

### Derived State
- `isMeetingActive(memberId)` returns `true` if a `MeetingSession` exists where `endedAt === null`

### UI Binding
- Member card visual state and controls react to `isMeetingActive`

---

## Styling Requirements

### Card Styling
- Member cards must support a **meeting-active visual variant**
- Active variant applies:
  - `border-2`
  - `border-[#F11E7D]`
  - Optional: `transition-colors duration-200`

### Constraints
- Do **not** modify Team card styling
- Avoid changing the global `Card` component API if it impacts Teams
- Apply meeting-active styles at the Member card wrapper level

---

## Technical Notes
- Meeting state is scoped to the member
- Backend persistence is optional for the initial implementation
- No UI for session history is required

---

## Acceptance Criteria
- [ ] Start Meeting button appears only on Member cards
- [ ] Clicking Start Meeting:
  - [ ] Creates an active meeting session
  - [ ] Highlights the Member card border with `#F11E7D`
  - [ ] Replaces Start Meeting with End Meeting button
- [ ] Clicking End Meeting:
  - [ ] Ends the active meeting session
  - [ ] Restores default card styling
  - [ ] Restores Start Meeting button
- [ ] Team cards remain unchanged

---

## Future Considerations (Out of Scope)
- Carry-forward agenda behavior
- Session summaries
- “Last discussed” indicators
- Implicit meeting start/end
- Session history views