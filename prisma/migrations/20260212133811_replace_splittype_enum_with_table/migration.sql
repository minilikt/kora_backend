/*
  Warnings:

  - You are about to drop the column `split` on the `exercises` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "split",
ADD COLUMN     "splitId" INTEGER;

-- DropEnum
DROP TYPE "SplitType";

-- CreateTable
CREATE TABLE "splits" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "splits_name_key" ON "splits"("name");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "splits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
