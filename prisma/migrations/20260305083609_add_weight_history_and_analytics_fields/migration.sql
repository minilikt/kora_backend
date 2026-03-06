-- CreateTable
CREATE TABLE "weight_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weight_history_userId_date_idx" ON "weight_history"("userId", "date");

-- AddForeignKey
ALTER TABLE "weight_history" ADD CONSTRAINT "weight_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
