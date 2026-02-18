# The Brain: Plan Evolution Engine

The "Brain" of Flex is the **Plan Evolution Engine**. Its purpose is to ensure that no two training blocks are identical. Instead, every new specific plan is an evolution of the previous one, optimized based on the user's actual performance, fatigue, and compliance data.

## 🧠 Core Philosophy

Most workout apps give you a static plan. Flex gives you a **dynamic trajectory**.

The engine operates on a 4-week cycle:

1.  **Execute**: User follows the current plan.
2.  **Evaluate**: At the end of Week 4, we analyze the data.
3.  **Evolve**: We generate a _new_ plan config based on the evaluation.
4.  **Deploy**: The user starts the new block.

---

## 🏗️ Architecture

### 1. Data Signals (Inputs)

We listen to three primary signals during a training block:

| Signal         | Metric             | Source                                                                     |
| :------------- | :----------------- | :------------------------------------------------------------------------- |
| **Adaptation** | `PerformanceScore` | Ratio of Actual Volume vs. Planned Volume. Increasing ratio = adaptation.  |
| **Fatigue**    | `FatigueScore`     | Derived from RPE and Session Duration. Rising trend = accumulated fatigue. |
| **Compliance** | `ConsistencyScore` | Percentage of planned sessions actually completed.                         |

### 2. The Evaluation Logic (`BlockEvaluationService`)

This service aggregates the signals into a decision matrix.

**Key Decisions:**

- **Overload**: If Performance is high and Fatigue is low → **Increase Stimulus** (Volume/Intensity).
- **Deload**: If Fatigue is high and Performance is plateauing → **Reduce Stimulus**.
- **Pivot**: If Performance is stalling but Fatigue is low → **Change Stimulus** (New exercises, new rep ranges).
- **Accommodate**: If Compliance is low → **Reduce Friction** (Lower frequency, shorter sessions).

### 3. The Evolution Engine (`PlanEvolutionEngine`)

This engine takes the _Decision_ and applies it to the _Program Variables_.

**Variables We Manipulate:**

- **Volume**: Sets per muscle group (e.g., Chest: 10 sets → 12 sets).
- **Intensity**: Target RPE or %1RM (e.g., RPE 7 → RPE 8).
- **Frequency**: Days per week (e.g., 3 days → 4 days).
- **Selection**: Exercise variations (e.g., Barbell Bench → Dumbbell Press).

---

## 🔄 The Feedback Loop

The system maintains a `UserTrainingProfile` that persists across plans. This profile "learns" key attributes about the user:

- **Volume Tolerance**: What is the maximum recoverable volume (MRV) for each muscle?
- **Responsiveness**: Which muscles grow fast? Which lag behind?

**Example Evolution:**

> **Block 1 (Hypertrophy Phase)**
>
> - User completes 95% of sessions using the standard "Intermediate Bodybuilder" profile.
> - **Result**: Chest strength increased by 5%, but fatigue was very low (RPE avg 6).
>
> **The Brain Decides**:
>
> - "User can handle more volume."
> - **Action**: Increase Chest & Back weekly sets by +2. Increase RPE target to 8.
>
> **Block 2 (Hypertrophy Phase +)**
>
> - Generated automatically with the new parameters.

---

## 🛠️ Technical Components

1.  **`UserTrainingProfile` (DB Model)**:
    - Stores long-term user stats (`fatigueIndex`, `performanceIndex`).
    - Tracks muscle-specific MRV (Maximum Recoverable Volume).

2.  **`BlockEvaluation` (DB Model)**:
    - Snapshot of a completed plan's analysis.
    - Explains _why_ the next plan changed.

3.  **`evaluateBlock()`**: Function to crunch the numbers.
4.  **`evolvePlan()`**: Function to apply the mutations.
