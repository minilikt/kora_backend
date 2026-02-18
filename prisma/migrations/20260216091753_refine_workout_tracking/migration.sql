/*
  Warnings:

  - You are about to drop the column `actualAvgRpe` on the `user_exercise_logs` table. All the data in the column will be lost.
  - You are about to drop the column `actualAvgWeight` on the `user_exercise_logs` table. All the data in the column will be lost.
  - You are about to drop the column `actualTotalReps` on the `user_exercise_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_exercise_logs" DROP COLUMN "actualAvgRpe",
DROP COLUMN "actualAvgWeight",
DROP COLUMN "actualTotalReps",
ADD COLUMN     "equipmentUsed" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "repsPerSet" JSONB,
ADD COLUMN     "rpePerSet" JSONB,
ADD COLUMN     "timeSpentSec" INTEGER,
ADD COLUMN     "weightsPerSet" JSONB;

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "avgRPE" DOUBLE PRECISION,
ADD COLUMN     "completedStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exercisesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "totalTimeSec" INTEGER NOT NULL DEFAULT 0;
