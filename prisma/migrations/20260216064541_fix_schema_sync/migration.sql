/*
  Warnings:

  - You are about to drop the column `level` on the `VolumeProfile` table. All the data in the column will be lost.
  - You are about to drop the `ProgressionModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SplitTemplate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `experienceLevel` to the `VolumeProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `intensityRange` to the `VolumeProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `VolumeProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repRange` to the `VolumeProfile` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `goal` on the `VolumeProfile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('FULL_BODY', 'PUSH_PULL_LEGS', 'UPPER_LOWER', 'UPPER_LOWER_FULL', 'BODY_PART', 'HYBRID');

-- CreateEnum
CREATE TYPE "ProgressionType" AS ENUM ('LINEAR', 'DOUBLE_PROGRESSION', 'UNDULATING', 'BLOCK');

-- CreateEnum
CREATE TYPE "TrainingGoal" AS ENUM ('HYPERTROPHY', 'STRENGTH', 'POWERBUILDING');

-- CreateEnum
CREATE TYPE "TrainingPriority" AS ENUM ('BALANCED', 'GLUTE_FOCUS');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- DropIndex
DROP INDEX "VolumeProfile_goal_level_idx";

-- AlterTable
ALTER TABLE "VolumeProfile" DROP COLUMN "level",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "experienceLevel" "ExperienceLevel" NOT NULL,
ADD COLUMN     "intensityRange" JSONB NOT NULL,
ADD COLUMN     "priority" "TrainingPriority" NOT NULL,
ADD COLUMN     "repRange" JSONB NOT NULL,
DROP COLUMN "goal",
ADD COLUMN     "goal" "TrainingGoal" NOT NULL;

-- DropTable
DROP TABLE "ProgressionModel";

-- DropTable
DROP TABLE "SplitTemplate";

-- CreateTable
CREATE TABLE "split_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SplitType" NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "constraints" JSONB NOT NULL,
    "structure" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "split_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progression_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProgressionType" NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "weeks" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progression_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "split_templates_daysPerWeek_idx" ON "split_templates"("daysPerWeek");

-- CreateIndex
CREATE INDEX "split_templates_type_idx" ON "split_templates"("type");

-- CreateIndex
CREATE INDEX "progression_models_type_idx" ON "progression_models"("type");

-- CreateIndex
CREATE INDEX "progression_models_isActive_idx" ON "progression_models"("isActive");
