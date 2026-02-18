-- CreateIndex
CREATE INDEX "SplitTemplate_daysPerWeek_idx" ON "SplitTemplate"("daysPerWeek");

-- CreateIndex
CREATE INDEX "VolumeProfile_goal_level_idx" ON "VolumeProfile"("goal", "level");

-- CreateIndex
CREATE INDEX "exercise_equipment_equipmentId_idx" ON "exercise_equipment"("equipmentId");

-- CreateIndex
CREATE INDEX "exercise_muscles_muscleId_role_idx" ON "exercise_muscles"("muscleId", "role");
