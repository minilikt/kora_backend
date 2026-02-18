-- CreateIndex
CREATE INDEX "user_exercise_logs_exerciseId_createdAt_idx" ON "user_exercise_logs"("exerciseId", "createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_planId_week_dayNumber_idx" ON "user_sessions"("planId", "week", "dayNumber");
