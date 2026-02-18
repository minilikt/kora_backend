-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "structure" JSONB NOT NULL,

    CONSTRAINT "SplitTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolumeProfile" (
    "id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "weeklySets" JSONB NOT NULL,

    CONSTRAINT "VolumeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weeks" JSONB NOT NULL,

    CONSTRAINT "ProgressionModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "movementPattern" TEXT NOT NULL,
    "equipment" TEXT[],
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "instructions" TEXT[],
    "category" TEXT,
    "type" TEXT,
    "gifUrl" TEXT,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "exercises_movementPattern_idx" ON "exercises"("movementPattern");
