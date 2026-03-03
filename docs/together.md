# Kora Plan Generation Report: Detailed Engine Breakdown

This document provides a comprehensive deep dive into how Kora generates workout plans, specifically focusing on the selection of split types and the orchestration of various specialized engines.

## 1. The Generation Pipeline

Plan generation is orchestrated by the `PlanCompiler` class (`src/engines/PlanCompiler.ts`). It follows a sequential five-step process:

1.  **Lookup & Normalization**: Fetches muscle and movement pattern IDs from the database.
2.  **Modular Rule Selection**: Queries the **Split**, **Volume**, and **Progression** engines to determine the structural rules.
3.  **Volume Distribution**: The `DistributionEngine` maps the weekly volume requirements onto the chosen split's structure.
4.  **Exercise Selection**: The `ExerciseSelector` fills the distribution blocks with specific exercises based on user equipment and environment.
5.  **Mesocycle Compilation**: The final plan is expanded into a multi-week series with intensity and RPE variations defined by the progression model.

---

## 2. Split Selection: How Splits Get Chosen

The selection of a split (e.g., `FULLBODY_3` vs. `UPPER_LOWER_FULL_3`) is handled by the `SplitEngine` (`src/engines/SplitEngine.ts`).

### Selection Criteria
Currently, the selection is primarily driven by the **number of days per week** the user intends to workout:

- **Database Query**: The engine performs a `findFirst` query on the `SplitTemplate` table where `daysPerWeek` matches the user's input.
- **Precedence**: If multiple templates exist for the same number of days (like the 3-day variants mentioned), the engine picks the **first one** available in the database (usually determined by seeding order in `public/split_type.json`).
- **Explicit Override**: A specific split can be requested by `name` if passed through the service layer, though the automated flow currently defaults to the day-based query.

### Example Splits for 3 Days:
| Split ID | Category | Logic |
| :--- | :--- | :--- |
| `FULLBODY_3` | Full Body | 3 days of full-body focus with rotating primary patterns. |
| `PPL_3` | Push/Pull/Legs | Dedicated days for muscle groups; lower frequency per group but higher session focus. |
| `UPPER_LOWER_FULL_3` | Hybrid | One upper day, one lower day, and one full-body day. |

---

## 3. Specialized Engines

### A. Volume Engine (`VolumeEngine.ts`)
Determines the **total weekly sets** for each muscle group. It cross-references the user's **Goal** (Hypertrophy, Strength, etc.) and **Experience Level** (Beginner, Intermediate, Advanced).
- *Data Source*: `public/volumes.json`
- *Example*: A Beginner with a Hypertrophy goal gets 10 sets for Chest and 12 for Back per week.

### B. Distribution Engine (`DistributionEngine.ts`)
This is the "brain" that spreads volume across the chosen split.
- **Focus Rules**: It respects the `focus` field in the split structure. If a day is marked as "Chest focus," it prioritizes allocating Chest sets to that day.
- **Spread Rule**: It ensures volume is spread across all training days to avoid lopsided workouts.
- **Compound Prioritization**: Automatically classifies exercises as `COMPOUND` or `ISOLATION` based on volume and muscle group (e.g., Chest/Back/Quads > 2 sets defaults to compound).

### C. Exercise Selector (`ExerciseSelector.ts`)
Picks the actual exercises you see in the app.
- **Filtering**: Environment (Gym vs. Home), Equipment (Barbells, Dumbbells, etc.), and Difficulty.
- **Movement Patterns**: Maps muscle groups to specific patterns:
    - Chest → `Horizontal Push`
    - Back → `Horizontal/Vertical Pull`
    - Quads → `Squat`
    - Hamstrings/Glutes → `Hinge`
- **Equipment Logic**: Dynamically adjusts based on available gear (e.g., if no Barbell is available, it seeks Dumbbell alternatives).

### D. Progression Engine (`ProgressionEngine.ts`)
Defines how the plan evolves over 4-8 weeks.
- **Intensity/RPE**: Gradually increases weight or effort week-over-week.
- **Deloads**: Automatically schedules a recovery week at the end of a block.

---

## 4. Initial Plan Generation Flow

When a user registers (`UserService.registerAndGeneratePlan`), the following defaults are applied:
1.  **Days**: Calculated from user profile or defaults to **3**.
2.  **Goal**: Defaults to **HYPERTROPHY**.
3.  **Environment**: Defaults to **GYM**.
4.  **Progression**: Defaults to `LINEAR_BEGINNER_4W` (a standard 4-week linear progression).
5.  **Equipment**: A comprehensive standard gym list is provided to ensure a robust initial selection.
