# Analysis Feature: Completion, Scalability & Deep Telemetry

## 1. Current State Overview (Evolution vs. Telemetry)
The "Brain" (Plan Evolution Engine) currently handles the logical "Next Step" for training. However, the **Telemetry Layer** (data collection) needs hardening to support rich visualizations like Heatmaps and Tonnage tracking.

### What Changed since the last report?
- **Scope Shift:** We moved from "Block Evolution" (the outcome) to "Telemetry Integrity" (the source).
- **Persistence Strategy:** Realized that calculating tonnage and muscle volume on-the-fly is a scalability risk. We are introducing **Aggregated Models** to store pre-computed data.

## 2. Deep Telemetry Roadmap

### A. Weight Lifted (Tonnage Tracking)
- **Status:** Backend calculates it in memory but doesn't persist the raw number in the `UserSession` header.
- **Requirement:** Persist `totalTonnage` on `UserSession`. This allows instant "Total Weight Moved" stats without expensive joins.
- **Scalability:** Enables efficient "All-Time Tonnage" queries over thousands of sessions.

### B. Muscle Heat Maps
- **Status:** Schema supports it, but no logic exists to aggregate "Sets per Muscle".
- **Requirement:** New `MuscleVolumeHistory` table. 
  - Each session completion should map exercises back to their `ExerciseMuscle` relations (Primary/Secondary roles).
  - Primary muscles get 100% volume attribution, Secondary get 50% (Standard industry heuristic).
- **Visualization:** Frontend needs to consume this as a distribution (pie chart) or body heatmap.

### C. Active Hours & Heatmaps
- **Status:** `DailyActivity` exists but only stores the date.
- **Requirement:** Capture the hour of the day from `UserSession.startedAt`.
- **Insight:** Helps users identify their most consistent/strongest training windows.

## 3. Smooth Data Collection Implementation

### Frontend (Data Entry)
- **Frictionless Logging:** The workout UI must allow quick set-entry. Any missing weight/reps data will "poison" the analysis. 
- **Graceful bodyweight handling:** Implementation of "Bodyweight" flag or standard offset to ensure bodyweight exercises contribute to tonnage correctly.

### Backend (Data Integrity)
- **Validation:** Reject session completions missing critical set data.
- **Background Aggregation:** As tonnage/muscle-data scales, moving these calculations to a **Post-Processing Hook** (after the response is sent) ensures the mobile app feels snappy.

---

### Updated Next Steps:
1. **Schema Update:** Add `totalTonnage` to `UserSession` and create the `MuscleVolumeHistory` table.
2. **Post-Processing:** Implement the aggregation logic in the backend.
3. **Frontend Telemetry:** Audit the `completeSession` payload to ensure 100% field coverage.
4. **Visuals:** Connect the "Summary" screen to the new aggregated data endpoints.
