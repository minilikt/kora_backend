-- AlterTable
ALTER TABLE "user_adaptive_states" ADD COLUMN     "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "user_adaptive_states_userId_date_idx" ON "user_adaptive_states"("userId", "date");
