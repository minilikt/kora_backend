# Analytics Engine: Logic and Data Flow

This document details the backend analytics engine, explaining how metrics are calculated, when they are updated, and why specific data is required from the frontend.

## 1. Why: The Purpose of Analytics

Analytics serve three main functions:
1.  **User Motivation:** Visualizing streaks, personal records, and volume trends.
2.  **Progress Tracking:** Monitoring muscle distribution and training frequency.
3.  **Adaptive Feedback:** Providing data to the `PlanEvolutionEngine` to adjust future workout intensity and volume.

---

## 2. How: Calculation Logic

### A. Tonnage (Total Weight Lifted)
Calculated per exercise and per session.
-   **Formula:** `Σ (reps * weight) for all sets`
-   **Scope:** Persisted in `UserSession.totalTonnage` and individual `UserExerciseLog` entries.

### B. Calories Burned
An algorithmic estimate based on active duration.
-   **Formula:** `Math.round((totalTimeSec / 60) * 5)` (~5 cal/min estimate).
-   **Scope:** Calculated on-the-fly for summaries and history.

### C. Performance Score
A ratio comparing actual work to the plan.
-   **Formula:** `Total Actual Volume / Total Planned Volume`
-   **Interpretation:**
    -   `1.0`: Followed the plan exactly.
    -   `> 1.0`: Exceeded plan (over-achieved).
    -   `< 1.0`: Under plan (missed reps or lowered weight).

### D. Muscle Volume Distribution
How work is attributed to specific muscle groups.
-   **Role Attribution:**
    -   **Primary Muscle:** 100% of exercise volume.
    -   **Secondary Muscle:** 50% of exercise volume.
-   **Storage:** Aggregated into `MuscleVolumeHistory` daily.

### E. Consistency & Streaks
-   **Day Success Score:** Running average of all `performanceScore` values for the day.
-   **Current Streak:** Number of consecutive days with activity. A "grace period" of one day is allowed (must work out today or yesterday to maintain the streak).

---

## 3. When: Update Triggers

Metrics are calculated using a hybrid **Push/Pull** model.

| Metric | Model | Trigger |
| :--- | :--- | :--- |
| **Streaks & Aggregates** | **Push (Eager)** | Triggered by `SessionService.completeSession`. |
| **Muscle Volume** | **Push (Eager)** | Aggregated immediately after session completion. |
| **Summary/Trends** | **Pull (Lazy)** | Calculated on-the-fly when calling `/api/analytics/*`. |
| **Plan Progress** | **Pull (Lazy)** | Ratio of completed vs. total sessions in the active plan. |

---

## 4. Why the Frontend Data Matters

To ensure telemetry integrity, the frontend must provide the following in the `completeSession` payload:

1.  **`startedAt` & `completedAt`**: Accurate durations are critical for calorie estimates and consistency heatmaps.
2.  **`weight` & `reps`**: Every set must be logged. Missing data "poisons" the tonnage and muscle volume history.
3.  **`rpe` (Rate of Perceived Exertion)**: Crucial for calculating `fatigueScore` and `recoveryScore` in the adaptive engine.
4.  **`exerciseId`**: Links logs to muscle relations for the heatmap attribution.

---

## 5. Scalability Considerations

Calculating tonnage and volume across thousands of sessions is expensive. We use **Aggregated Models** (`DailyActivity`, `MuscleVolumeHistory`) to store pre-computed daily totals, allowing instant dashboard loads regardless of user history size.
