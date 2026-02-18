/*
  Warnings:

  - A unique constraint covering the columns `[previousPlanId]` on the table `user_plans` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_plans" ADD COLUMN     "previousPlanId" TEXT;

-- CreateTable
CREATE TABLE "user_training_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fatigueIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "muscleProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_training_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_evaluations" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "avgSessionDuration" DOUBLE PRECISION NOT NULL,
    "avgRpe" DOUBLE PRECISION NOT NULL,
    "performanceTrend" DOUBLE PRECISION NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_training_profiles_userId_key" ON "user_training_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "block_evaluations_planId_key" ON "block_evaluations"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "user_plans_previousPlanId_key" ON "user_plans"("previousPlanId");

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_previousPlanId_fkey" FOREIGN KEY ("previousPlanId") REFERENCES "user_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_training_profiles" ADD CONSTRAINT "user_training_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_evaluations" ADD CONSTRAINT "block_evaluations_planId_fkey" FOREIGN KEY ("planId") REFERENCES "user_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
