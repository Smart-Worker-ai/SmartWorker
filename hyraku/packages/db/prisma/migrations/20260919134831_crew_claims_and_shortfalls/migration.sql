-- CreateEnum
CREATE TYPE "ShortfallKind" AS ENUM ('released_early', 'missed_deadline', 'no_show');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "crewDeadlineAt" TIMESTAMPTZ(3),
ADD COLUMN     "shortfallAt" TIMESTAMPTZ(3),
ADD COLUMN     "shortfallBy" INTEGER,
ADD COLUMN     "shortfallKind" "ShortfallKind";

-- AlterTable
ALTER TABLE "WorkerProfile" ADD COLUMN     "claimedCrewSize" INTEGER,
ADD COLUMN     "shortfallCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Assignment_status_crewDeadlineAt_idx" ON "Assignment"("status", "crewDeadlineAt");

-- CreateIndex
CREATE INDEX "Assignment_responderId_shortfallAt_idx" ON "Assignment"("responderId", "shortfallAt");
