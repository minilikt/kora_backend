# Frontend-Backend Data Contract

This document outlines the data structures that the frontend (mobile/web) must provide to the backend for core operations.

## 1. Onboarding & Registration
**Endpoint:** `POST /api/auth/register`

The registration process requires a comprehensive user profile to generate the initial training plan.

| Field | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `email` | `string` | User's email address | Yes |
| `password` | `string` | Min 6 characters | Yes |
| `name` | `string` | Full name | Yes |
| `preferredName` | `string` | Nickname | No |
| `gender` | `enum` | See Enums section | No |
| `age` | `number` | Integer | No |
| `weight` | `number` | Current weight (kg/lbs) | No |
| `targetWeight`| `number` | Goal weight | No |
| `height` | `number` | Height | No |
| `trainingLevel`| `enum` | See ExperienceLevel | No |
| `goal` | `enum` | See TrainingGoal | No |
| `workoutDays` | `string[]` | Array of `DayOfWeek` | No |

---

## 2. Session Completion
**Endpoint:** `POST /api/sessions/complete`

When a user finishes a workout, the following data package must be sent to update metrics and heatmaps.

### Request Body
```json
{
  "planId": "string (UUID)",
  "week": 1,
  "day": 1,
  "startedAt": "ISO8601 String",
  "completedAt": "ISO8601 String",
  "notes": "Optional session notes",
  "exercises": [
    {
      "exerciseId": "string",
      "timeSpentSec": 120,
      "equipmentUsed": ["Dumbbell"],
      "notes": "Optional exercise notes",
      "sets": [
        {
          "setIndex": 0,
          "weight": 20.5,
          "reps": 12,
          "rpe": 8
        }
      ]
    }
  ]
}
```

---

## 3. Profile Updates
**Endpoint:** `PUT /api/users/profile`

Used to sync local profile changes to the backend.

| Field | Type | Mapping Notes |
| :--- | :--- | :--- |
| `name` | `string` | |
| `preferredName`| `string` | |
| `age` | `number` | Rounded to nearest integer |
| `gender` | `enum` | |
| `height` | `number` | |
| `weight` | `number` | |
| `goalWeight` | `number` | Maps to `targetWeight` in DB |
| `workoutDays` | `string[]` | Array of `DayOfWeek` enum values |
| `trainingLevel`| `enum` | |

---

## 5. Analytics Endpoints

### Daily Activity Heatmap
**Endpoint:** `GET /api/analytics/heatmap?days=90`
- Returns workout counts per day.

### Trends (Weight/Volume/Tonnage)
**Endpoint:** `GET /api/analytics/trends?metric=bodyweight&filter=month`
- `metric`: `bodyweight`, `tonnage`, `calories`, `time`
- `filter`: `day`, `week`, `month`, `year`

### Exercise History
**Endpoint:** `GET /api/analytics/exercise/:exerciseId/history`
- Returns the last 20 performances for a specific exercise ID.
- Includes volume, max weight, reps, sets, and performance scores.

### Done Exercises
**Endpoint:** `GET /api/analytics/done-exercises`
- Returns a unique list of all exercise names and IDs a user has ever performed.
- Includes `lastDone` timestamp.

### User Profile Summary
**Endpoint:** `GET /api/analytics/profile-summary`
- Returns streaks, total active hours, total workouts, progress, and personal bests.

---

## 6. Common Enums

### Gender
- `MALE`, `FEMALE`

### ExperienceLevel
- `BEGINNER`, `INTERMEDIATE`, `ADVANCED`

### TrainingGoal
- `HYPERTROPHY`, `STRENGTH`, `POWERBUILDING`, `FAT_LOSS`, `MAINTENANCE`

### DayOfWeek
- `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`

### ExerciseEnvironment
- `GYM`, `HOME`, `OUTDOOR`, `ANY`
