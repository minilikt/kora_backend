# Flex API Documentation

This guide provides an overview of the backend APIs available for the Flex application. It is designed to help frontend developers understand how to interact with the system, what data formats to expect, and how to handle common scenarios.

## 🔐 Authentication

All protected endpoints require a Bearer Token. You must include the `Authorization` header in your requests.

**Header Format:**
`Authorization: Bearer <your_token_here>`

---

### 1. Register User & Generate Plan

Creates a new user account and **automatically generates their first workout plan** based on the provided profile.

- **Endpoint**: `POST /api/auth/register`
- **Public**: Yes
- **Payload**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "gender": "MALE", // Optional: "MALE" | "FEMALE"
  "experienceLevel": "INTERMEDIATE",
  "goal": "HYPERTROPHY",
  "waist": 85, // cm
  "weight": 80, // kg
  "height": 180, // cm
  "daysPerWeek": 4,
  "equipment": ["GYM_BASIC"]
}
```

- **Response**: Returns a JWT token and the created user object.

### 2. Login

Authenticates an existing user.

- **Endpoint**: `POST /api/auth/login`
- **Public**: Yes
- **Payload**:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

- **Response**:

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

---

## 📅 Workout Plans

### Get Active Plan

Retrieves the currently active workout plan for the authenticated user. This includes the full mesocycle structure (weeks, days, exercises) and the exercise library details.

- **Endpoint**: `GET /api/plans/active`
- **Auth**: Required
- **Response Structure**:

```json
{
  "status": "success",
  "data": {
    "id": "plan_uuid",
    "startDate": "2026-02-16T...",
    "endDate": "2026-03-16T...",
    "planJson": {
      "input": { ... }, // input parameters used to generate the plan
      "version": "2",
      "weeks": [
        {
          "week": 1,
          "sessions": [
            {
              "day": 1,
              "focus": ["Chest", "Triceps"],
              "exercises": [
                { "exerciseId": "ex_uuid", "sets": 3, "reps": "8-12", "rpe": 8 }
              ]
            }
          ]
        }
      ],
      "exerciseLibrary": {
        "ex_uuid": {
          "name": "Barbell Bench Press",
          "instructions": ["Step 1...", "Step 2..."],
          "gifUrl": "http://..."
        }
      }
    }
  }
}
```

> **Frontend Tip**: The `exerciseLibrary` is a dictionary keyed by `exerciseId`. when rendering the weekly sessions, look up the detailed info (name, instructions, media) from this library using the ID found in the session's exercise list.

---

## 💪 Workout Sessions

### Complete a Session

Logs a finished workout session to the database. This calculates performance metrics, volume load, and updates the user's progression history.

- **Endpoint**: `POST /api/sessions/complete`
- **Auth**: Required
- **Payload**:

```json
{
  "planId": "current_plan_id",
  "week": 1,
  "day": 1,
  "startedAt": "ISO_DATE_STRING",
  "completedAt": "ISO_DATE_STRING", // Used to calc duration
  "notes": "Felt strong today.",
  "exercises": [
    {
      "exerciseId": "ex_uuid",
      "timeSpentSec": 600, // Optional
      "sets": [
        { "setIndex": 0, "weight": 100, "reps": 10, "rpe": 8 },
        { "setIndex": 1, "weight": 100, "reps": 10, "rpe": 9 }
      ]
    }
  ]
}
```

---

## 🔍 Exercises

### Search Exercises

Simple search endpoint to find exercises by name or category.

- **Endpoint**: `GET /api/exercises?q=squat`
- **Auth**: Optional (Publicly accessible for now)

---

## 💡 Best Practices

1.  **Fail Gracefully**: If `/api/plans/active` returns 404 or null data, prompt the user to create a new plan (or redirect to a plan generation flow).
2.  **Offline Handling**: The workout tracker (`workout.js`) currently submits data only when online. For a better UX, consider caching the payload in `localStorage` if the network request fails, and retrying later.
3.  **Data Sync**: The backend is the source of truth. Always fetch fresh plan data on page load to ensure you have the latest progression adjustments.
