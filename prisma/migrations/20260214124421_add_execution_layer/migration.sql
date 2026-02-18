-- CreateEnum
CREATE TYPE "ExerciseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ExerciseEnvironment" AS ENUM ('GYM', 'HOME', 'OUTDOOR', 'ANY');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "environment" "ExerciseEnvironment" NOT NULL DEFAULT 'GYM',
ADD COLUMN     "level" "ExerciseLevel" NOT NULL DEFAULT 'INTERMEDIATE';

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "planned" JSONB NOT NULL,
    "completed" JSONB,
    "fatigueScore" DOUBLE PRECISION,
    "performanceScore" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exercise_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "plannedSets" INTEGER NOT NULL,
    "plannedReps" TEXT NOT NULL,
    "plannedRpe" DOUBLE PRECISION NOT NULL,
    "actualSets" INTEGER,
    "actualAvgWeight" DOUBLE PRECISION,
    "actualTotalReps" INTEGER,
    "actualAvgRpe" DOUBLE PRECISION,
    "performanceScore" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_exercise_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_adaptive_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fatigueScore" DOUBLE PRECISION NOT NULL,
    "recoveryScore" DOUBLE PRECISION NOT NULL,
    "performanceScore" DOUBLE PRECISION NOT NULL,
    "volumeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "intensityMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_adaptive_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_alternatives" (
    "exerciseId" TEXT NOT NULL,
    "alternativeId" TEXT NOT NULL,

    CONSTRAINT "exercise_alternatives_pkey" PRIMARY KEY ("exerciseId","alternativeId")
);

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_planId_idx" ON "user_sessions"("planId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_createdAt_idx" ON "user_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_exercise_logs_sessionId_idx" ON "user_exercise_logs"("sessionId");

-- CreateIndex
CREATE INDEX "user_exercise_logs_exerciseId_idx" ON "user_exercise_logs"("exerciseId");

-- CreateIndex
CREATE INDEX "user_adaptive_states_userId_idx" ON "user_adaptive_states"("userId");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "user_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_logs" ADD CONSTRAINT "user_exercise_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_logs" ADD CONSTRAINT "user_exercise_logs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_adaptive_states" ADD CONSTRAINT "user_adaptive_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_alternativeId_fkey" FOREIGN KEY ("alternativeId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
