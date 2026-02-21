/*
  Warnings:

  - Added the required column `updatedAt` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "block_evaluations" ADD COLUMN     "muscleMetrics" JSONB;

-- AlterTable
ALTER TABLE "daily_activities" ADD COLUMN     "hourlyDistribution" JSONB;

-- AlterTable
ALTER TABLE "exercise_muscles" ADD COLUMN     "activationMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "user_plans" ADD COLUMN     "volumeOverrides" JSONB;

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "totalTonnage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "muscle_volume_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "muscleId" INTEGER NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "setsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "muscle_volume_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "muscle_volume_history_userId_date_idx" ON "muscle_volume_history"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "muscle_volume_history_userId_date_muscleId_key" ON "muscle_volume_history"("userId", "date", "muscleId");

-- AddForeignKey
ALTER TABLE "muscle_volume_history" ADD CONSTRAINT "muscle_volume_history_muscleId_fkey" FOREIGN KEY ("muscleId") REFERENCES "muscles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
