-- AlterTable
ALTER TABLE "daily_activities" ADD COLUMN     "caloriesBurned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTonnage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_personal_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_personal_records_userId_idx" ON "user_personal_records"("userId");

-- CreateIndex
CREATE INDEX "user_personal_records_exerciseId_idx" ON "user_personal_records"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "user_personal_records_userId_exerciseId_key" ON "user_personal_records"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "user_personal_records" ADD CONSTRAINT "user_personal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_personal_records" ADD CONSTRAINT "user_personal_records_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
