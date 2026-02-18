/*
  Warnings:

  - You are about to drop the column `category` on the `exercises` table. All the data in the column will be lost.
  - You are about to drop the column `equipment` on the `exercises` table. All the data in the column will be lost.
  - You are about to drop the column `movementPattern` on the `exercises` table. All the data in the column will be lost.
  - You are about to drop the column `primaryMuscles` on the `exercises` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryMuscles` on the `exercises` table. All the data in the column will be lost.
  - Added the required column `type` to the `exercises` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('COMPOUND', 'ISOLATION');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER');

-- CreateEnum
CREATE TYPE "MuscleRole" AS ENUM ('PRIMARY', 'SECONDARY', 'STABILIZER');

-- DropIndex
DROP INDEX "exercises_movementPattern_idx";

-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "category",
DROP COLUMN "equipment",
DROP COLUMN "movementPattern",
DROP COLUMN "primaryMuscles",
DROP COLUMN "secondaryMuscles",
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "movementPatternId" INTEGER,
ADD COLUMN     "rawData" JSONB,
ADD COLUMN     "split" "SplitType",
DROP COLUMN "type",
ADD COLUMN     "type" "ExerciseType" NOT NULL;

-- CreateTable
CREATE TABLE "muscles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "muscles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_patterns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "movement_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscles" (
    "exerciseId" TEXT NOT NULL,
    "muscleId" INTEGER NOT NULL,
    "role" "MuscleRole" NOT NULL,

    CONSTRAINT "exercise_muscles_pkey" PRIMARY KEY ("exerciseId","muscleId","role")
);

-- CreateTable
CREATE TABLE "exercise_equipment" (
    "exerciseId" TEXT NOT NULL,
    "equipmentId" INTEGER NOT NULL,

    CONSTRAINT "exercise_equipment_pkey" PRIMARY KEY ("exerciseId","equipmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "muscles_name_key" ON "muscles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_name_key" ON "equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "movement_patterns_name_key" ON "movement_patterns"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_movementPatternId_fkey" FOREIGN KEY ("movementPatternId") REFERENCES "movement_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscleId_fkey" FOREIGN KEY ("muscleId") REFERENCES "muscles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
