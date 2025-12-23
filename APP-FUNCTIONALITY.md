# App Functionality

This is a wrestling app to be used by the matside team to keep track of what's happening in a match and display what's happening on a connected big screen.

---

## Wrestling Styles Supported

### Folkstyle
- Available for **Highschool** and **College** age groups
- Team-based matches supported
- Colors: Red (left) vs Green (right)

### Freestyle
- No age group restriction
- Can be team or individual
- Colors: Red (left) vs Blue (right)
- Includes shot clock (30 seconds)

### Greco-Roman
- Individual matches only (not team)
- Colors: Red (left) vs Blue (right)

---

## Scoring Rules Implemented

### Folkstyle Actions & Point Values

| Action | Points | Notes |
|--------|--------|-------|
| Takedown (from neutral) | 3 pts | Results in top position |
| Escape (from bottom) | 1 pt | Results in neutral position |
| Reversal (from bottom) | 2 pts | Results in top position |
| Near Fall 2 (from top) | 2 pts | |
| Near Fall 3 (from top) | 3 pts | |
| Near Fall 4 (from top) | 4 pts | |

**Folkstyle Penalties:**
| Penalty | Progression |
|---------|-------------|
| Stall | 0, 1, 1, 2, DQ |
| Caution | 0, 0, 1 |
| Technical Violation | 1, 1, 2, 2, DQ |
| Unsportsmanlike | 1, 1, 2, 2, DQ |

### Freestyle/Greco-Roman Actions
- **1-5 Point Moves**: Direct point scoring (1, 2, 3, 4, or 5 pts)
- **Caution**: Progressive penalty (2, 2, DQ)
- **Passivity**: 0 points awarded to opponent

---

## Win Conditions

| Code | Title | Team Points | Description |
|------|-------|-------------|-------------|
| `de` | Decision | 3 pts | 1+ point difference |
| `md` | Major Decision | 4 pts | Folkstyle only: 8+ point difference |
| `tf` | Tech Fall | 5 pts | 15+ pts (Folkstyle), 10+ pts (Freestyle/Greco) |
| `pf` | Pin Fall | 6 pts | Shoulders pinned to mat |
| `inj` | Injury | 6 pts | Opponent injured |
| `ff` | Forfeit | 6 pts | Opponent doesn't show |
| `dq` | Disqualification | 6 pts | Rules violation |

### Tech Fall Thresholds
- **Folkstyle**: 15+ point difference
- **Freestyle**: 10+ point difference
- **Greco-Roman**: 10+ point difference

---

## Match Timing & Periods

### Folkstyle - Highschool
- Period 1: 2:00
- Period 2: 2:00
- Period 3: 2:00
- Sudden Victory: 2:00
- Tie Breaker I: 0:30
- Tie Breaker II: 0:30
- Ultimate Tie Breaker: 0:30 (first score wins)

### Folkstyle - College
- Period 1: 3:00
- Period 2: 2:00
- Period 3: 2:00 (with riding time evaluation)
- Sudden Victory: 2:00
- Tie Breaker I: 0:30
- Tie Breaker II: 0:30

### Freestyle/Greco-Roman
- Period 1: 3:00 (with rest after)
- Period 2: 3:00
- Shot clock: 30 seconds (Freestyle only)

### Injury Timeouts
- Blood Time: 5:00
- Injury Time: 1:30 (Folkstyle) / 2:00 (Freestyle/Greco)
- Recovery Time: 2:00
- Head/Neck Injury: 5:00

---

## Position System

- **Neutral (n)**: Neither wrestler has advantage
- **Top (t)**: One wrestler in controlling position
- **Bottom (b)**: One wrestler in vulnerable position

### Position Choice Rules
- Period 1: Starts neutral (no choice)
- Period 2: Both wrestlers can choose
- Period 3 (Folkstyle): Wrestler who didn't choose in Period 2
- Ultimate Tie Breaker: First scorer chooses
- Defer option available to give choice to opponent

---

## Riding Time (Folkstyle College Only)

- Tracks net riding time advantage between wrestlers
- Positive time = right wrestler advantage
- Negative time = left wrestler advantage
- Auto-stops when in neutral position
- 1 minute advantage = 1 point awarded at end of Period 3

---

## User Controls & Options

### Style Selection
- Select wrestling style (Folkstyle/Freestyle/Greco)
- Select age group (Highschool/College for Folkstyle)
- Select match type (Individual/Team)
- Select period duration

### Match Controls
- Position controls (Top/Neutral/Bottom per side)
- Action buttons filtered by current position
- Penalty buttons with count display
- Manual point adjustment
- Win type dropdown

### Clock Controls
- Main clock: Start/Stop/Reset
- +1 second quick adjustment
- Manual time editing
- Side clocks for injuries/blood/recovery
- Riding clock controls (edit, reset, swap)

### Match Info
- Edit athlete names (first/last)
- Edit team names & abbreviations
- Edit bout number
- Edit weight class

### Keyboard Shortcuts
- **Left Arrow**: Left wrestler to top
- **Right Arrow**: Right wrestler to top
- **Down Arrow**: Both wrestlers to neutral
- **Space**: Start/stop main clock

---

## Scoreboard Display (Big Screen)

Large display for spectators/broadcasts showing:
- Athlete names and team names
- Large score displays with wrestler colors
- Main match timer
- Period indicators (yellow dots)
- Active clock indicator
- Weight class display
- Riding time (if applicable)
- Bout number
- Next bout info

Features:
- Color-coded score boxes (Red/Green/Blue)
- Responsive sizing for any display
- Large readable fonts
- Real-time sync via BroadcastChannel API

---

## Match History & Tracking

### Action History
- All actions stored per period
- Includes elapsed time, action type, points, penalties
- Supports undo (switch side, delete actions)

### Match History Manager
- Tracks all completed matches
- Stores: scores, team points, winner, win type, weight class
- Statistics: total team points, win counts, average duration
- Import/export to JSON
- localStorage persistence

---

## Tie-Breaking Rules

### Folkstyle
- Point differential determines winner type
- Ultimate Tie Breaker (HS): First scorer from chosen position

### Freestyle/Greco-Roman
- Largest point-scoring move wins
- If tied: fewest cautions wins
- If still tied: last point scored wins

---

## Weight Classes

### Folkstyle Highschool
106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285 lbs

### Folkstyle College
125, 133, 141, 149, 157, 165, 174, 184, 197, 285 lbs

### Freestyle/Greco-Roman
Various weight classes for WNCAA, Olympic Men, and Olympic Women divisions

