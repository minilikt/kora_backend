/**
 * verify-split-alignment.ts
 *
 * Creates a test user, generates their full workout plan via PlanCompiler,
 * and prints day-by-day exercises with their split/focus labels so you
 * can visually verify push day gets push exercises, leg day gets leg
 * exercises, etc.
 *
 * Run with:
 *   npx ts-node src/verify-split-alignment.ts
 *   npx ts-node src/verify-split-alignment.ts --days 5
 *   npx ts-node src/verify-split-alignment.ts --days 3 --goal STRENGTH --level BEGINNER
 */

import prisma from "./lib/prisma";
import { PlanCompiler } from "./engines/PlanCompiler";
import bcrypt from "bcrypt";

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const DAYS_PER_WEEK = parseInt(getArg("days", "5"), 10);
const GOAL = getArg("goal", "HYPERTROPHY") as any;
const LEVEL = getArg("level", "INTERMEDIATE") as any;
const ENVIRONMENT = getArg("env", "GYM") as any;
const EQUIPMENT = ["Barbell", "Dumbbells", "Cable Machine", "Machine"];

const TEST_EMAIL = `verify-test-${DAYS_PER_WEEK}d-${Date.now()}@kora.test`;
const TEST_NAME = `Verify User (${DAYS_PER_WEEK}d / ${GOAL} / ${LEVEL})`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LINE = "─".repeat(70);
const BOLD = (s: string) => `\x1b[1m${s}\x1b[0m`;
const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const CYAN = (s: string) => `\x1b[36m${s}\x1b[0m`;

function muscleLabel(muscleId: string, muscleMap: Map<any, string>): string {
    return muscleMap.get(muscleId) ?? muscleId;
}

function patternLabel(patternId: string, patternMap: Map<any, string>): string {
    return patternMap.get(patternId) ?? patternId;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(LINE);
    console.log(BOLD("  🏋️  KORA SPLIT ALIGNMENT VERIFIER"));
    console.log(LINE);
    console.log(`  Profile  : ${TEST_NAME}`);
    console.log(`  Days/week: ${DAYS_PER_WEEK}`);
    console.log(`  Goal     : ${GOAL}`);
    console.log(`  Level    : ${LEVEL}`);
    console.log(`  Env      : ${ENVIRONMENT}`);
    console.log(`  Equipment: ${EQUIPMENT.join(", ")}`);
    console.log(LINE);

    // 1. Create test user
    const hashedPassword = await bcrypt.hash("TestPass123!", 10);
    const user = await prisma.user.create({
        data: {
            email: TEST_EMAIL,
            password: hashedPassword,
            name: TEST_NAME,
            trainingLevel: LEVEL,
            trainingDaysPerWeek: DAYS_PER_WEEK,
            trainingEnvironment: ENVIRONMENT,
            gender: "MALE",
            age: 28,
            weight: 80,
            height: 178,
        },
    });
    console.log(GREEN(`\n✅ Created test user: ${user.name} (ID: ${user.id})\n`));

    // 2. Pick a progression model
    const progression = await prisma.progressionModel.findFirst({
        where: { isActive: true },
        orderBy: { version: "desc" },
    });
    if (!progression) {
        console.error(RED("❌ No active progression model found in DB. Run the seed first."));
        await cleanup(user.id);
        return;
    }
    console.log(CYAN(`📐 Using progression model: "${progression.name}" (${progression.id})\n`));

    // 3. Build lookup maps for pretty display
    const allMuscles = await prisma.muscle.findMany();
    const allPatterns = await prisma.movementPattern.findMany();
    const allExercises = await prisma.exercise.findMany({ include: { split: true } });

    const muscleById = new Map(allMuscles.map((m: any) => [m.id, m.name]));
    const patternById = new Map(allPatterns.map((p: any) => [p.id, p.name]));
    const exerciseById = new Map(allExercises.map((e: any) => [e.id, e]));

    // 4. Generate plan
    console.log(YELLOW("⚙️  Generating plan (this may take a moment)...\n"));
    let planResult: any;
    try {
        planResult = await PlanCompiler.generate({
            userId: user.id,
            days: DAYS_PER_WEEK,
            goal: GOAL,
            level: LEVEL,
            progressionId: progression.id,
            environment: ENVIRONMENT,
            equipment: EQUIPMENT,
        });
    } catch (err: any) {
        console.error(RED(`\n❌ Plan generation failed: ${err.message}`));
        await cleanup(user.id);
        return;
    }

    const { planJson } = planResult;
    const { weeks, exerciseLibrary } = planJson as any;

    if (!weeks || weeks.length === 0) {
        console.error(RED("❌ Plan generated but has no weeks!"));
        await cleanup(user.id);
        return;
    }

    // 5. Determine the split template used
    const splitTemplate = await prisma.splitTemplate.findFirst({
        where: { daysPerWeek: DAYS_PER_WEEK },
        orderBy: { version: "desc" },
    });

    console.log(LINE);
    console.log(BOLD(`📋 Split: ${splitTemplate?.name ?? "Unknown"} (${splitTemplate?.type ?? "?"})`));
    console.log(LINE);

    // Pretty-print split structure from template
    if (splitTemplate?.structure) {
        const struct = splitTemplate.structure as any[];
        struct.forEach((d: any) => {
            const label = d.rest ? "REST" : `${d.category ?? "?"}${d.focus ? " | " + d.focus.join(", ") : ""}`;
            console.log(`  Day ${d.day}: ${YELLOW(label)}`);
        });
    }

    console.log();

    // 6. Print week 1 (base plan is the same for all weeks, only intensity/rpe changes)
    const week1 = weeks[0];
    console.log(LINE);
    console.log(BOLD(`📅 WEEK 1 — Day-by-Day Breakdown`));
    console.log(LINE);

    let alignmentErrors = 0;
    let totalExercises = 0;

    for (const session of week1.sessions) {
        if (session.rest) {
            console.log(CYAN(`\n  Day ${session.day}: 💤 REST DAY`));
            continue;
        }

        const focus: string[] = session.focus || [];
        console.log(BOLD(`\n  Day ${session.day}: [${GREEN(focus.join(" + ") || "General")}]`));
        console.log(`  ${"─".repeat(60)}`);

        const exercises: any[] = session.exercises || [];
        if (exercises.length === 0) {
            console.log(RED("    ⚠️  No exercises assigned to this day!"));
            alignmentErrors++;
            continue;
        }

        for (const ex of exercises) {
            totalExercises++;
            const exerciseRecord = exerciseById.get(ex.exerciseId) ?? exerciseLibrary?.[ex.exerciseId];
            const exerciseName = exerciseRecord?.name ?? ex.exerciseId;
            const muscleName = muscleLabel(ex.muscleId, muscleById as any);
            const patternName = patternLabel(ex.patternId, patternById as any);
            const splitTag = exerciseRecord?.split?.name ?? "N/A";

            // ─── Alignment Check ────────────────────────────────────────────────
            // Verify that the split tag on the exercise loosely matches the day focus
            let alignmentIcon = "✅";
            let alignmentNote = "";

            if (focus.length > 0 && splitTag !== "N/A") {
                const focusLower = focus.map((f: string) => f.toLowerCase()).join(" ");
                const splitLower = splitTag.toLowerCase();

                // Check obvious mismatches (e.g. "squat" on a "push" day, "bench" on "leg" day)
                const legPatterns = ["squat", "hinge", "lunge", "leg press", "quad", "hamstring", "glute", "calf"];
                const pushPatterns = ["push", "chest", "shoulder", "tricep", "delt"];
                const pullPatterns = ["pull", "back", "row", "deadlift", "bicep", "lat"];

                const isFullBody = focusLower.includes("full") || focus.length > 5;
                const isLegDay = !isFullBody && (focusLower.includes("leg") || focusLower.includes("quad") || focusLower.includes("lower"));
                const isPushDay = !isFullBody && (focusLower.includes("push") || focusLower.includes("chest"));
                const isPullDay = !isFullBody && (focusLower.includes("pull") || focusLower.includes("back"));

                const exerciseLooksLike = (patterns: string[]) =>
                    patterns.some((p) => splitLower.includes(p) || exerciseName.toLowerCase().includes(p) || patternName.toLowerCase().includes(p));

                if (isLegDay && exerciseLooksLike(pushPatterns)) {
                    alignmentIcon = "❌";
                    alignmentNote = RED(` ← MISMATCH: Push exercise on Leg day!`);
                    alignmentErrors++;
                } else if (isLegDay && exerciseLooksLike(pullPatterns) && !exerciseLooksLike(["deadlift", "rdl"])) {
                    alignmentIcon = "⚠️ ";
                    alignmentNote = YELLOW(` ← SUSPICIOUS: Pull exercise on Leg day`);
                } else if (isPushDay && exerciseLooksLike(legPatterns)) {
                    alignmentIcon = "❌";
                    alignmentNote = RED(` ← MISMATCH: Leg exercise on Push day!`);
                    alignmentErrors++;
                } else if (isPullDay && exerciseLooksLike(legPatterns)) {
                    alignmentIcon = "❌";
                    alignmentNote = RED(` ← MISMATCH: Leg exercise on Pull day!`);
                    alignmentErrors++;
                }
            }

            console.log(
                `    ${alignmentIcon} ${BOLD(exerciseName)}\n` +
                `       Muscle : ${YELLOW(muscleName)}  |  Pattern : ${CYAN(patternName)}\n` +
                `       Split  : ${splitTag}  |  Sets: ${ex.sets}  |  RPE: ${ex.rpe ?? "N/A"}` +
                alignmentNote
            );
        }
    }

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log("\n" + LINE);
    console.log(BOLD("  📊 ALIGNMENT SUMMARY"));
    console.log(LINE);
    console.log(`  Total exercises assigned : ${totalExercises}`);
    console.log(`  Weeks in plan            : ${weeks.length}`);

    if (alignmentErrors === 0) {
        console.log(GREEN(`  Alignment issues found   : 0  ✅  All good!`));
    } else {
        console.log(RED(`  Alignment issues found   : ${alignmentErrors}  ❌  Review above`));
    }

    // ─── All weeks summary (just day + focus, no exercise spam) ───────────────
    console.log("\n" + LINE);
    console.log(BOLD("  📆 ALL WEEKS — Day Focus Schedule"));
    console.log(LINE);

    for (const week of weeks) {
        const deloadTag = week.deload ? YELLOW(" [DELOAD]") : "";
        console.log(CYAN(`\n  Week ${week.week}${deloadTag}`));
        for (const session of week.sessions) {
            if (session.rest) {
                console.log(`    Day ${session.day}: 💤 REST`);
            } else {
                const focus = (session.focus || []).join(" + ") || "General";
                const count = (session.exercises || []).length;
                console.log(`    Day ${session.day}: [${focus}] — ${count} exercise(s)`);
            }
        }
    }

    console.log("\n" + LINE);
    console.log(YELLOW("  🧹 Cleaning up test user..."));
    await cleanup(user.id);
    console.log(GREEN("  ✅ Done. Verification complete.\n"));
    console.log(LINE + "\n");
}

async function cleanup(userId: string) {
    try {
        await prisma.user.delete({ where: { id: userId } });
    } catch (_) {
        // Ignore cascade errors
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(async (err) => {
    console.error(RED(`\n💥 Unexpected error: ${err.message}`));
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
