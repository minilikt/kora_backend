-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TrainingGoal" ADD VALUE 'FAT_LOSS';
ALTER TYPE "TrainingGoal" ADD VALUE 'MAINTENANCE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "bmi" DOUBLE PRECISION,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "sleepHours" DOUBLE PRECISION,
ADD COLUMN     "targetWeight" DOUBLE PRECISION,
ADD COLUMN     "trainingDaysPerWeek" INTEGER,
ADD COLUMN     "trainingEnvironment" "ExerciseEnvironment" DEFAULT 'GYM',
ADD COLUMN     "trainingLevel" "ExperienceLevel",
ADD COLUMN     "waterDaily" DOUBLE PRECISION,
ADD COLUMN     "weight" DOUBLE PRECISION;
