-- CreateEnum
CREATE TYPE "WorkerKind" AS ENUM ('individual', 'agent', 'supervisor');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'terminated');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('whatsapp', 'sms');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('aadhaar', 'pvc', 'photo');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('new', 'assigning', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('proposed', 'accepted', 'declined', 'expired', 'reassigned', 'completed');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('dispatcher', 'admin');

-- CreateEnum
CREATE TYPE "GrievanceCategory" AS ENUM ('overcharging', 'no_show', 'conduct', 'quality', 'payment', 'other');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "WaitlistRole" AS ENUM ('customer', 'worker');

-- CreateEnum
CREATE TYPE "WaitlistReason" AS ENUM ('bookings_closed', 'outside_service_area', 'cannot_work_in_service_area');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'dispatcher',
    "totpSecret" TEXT,
    "disabledAt" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "subjectId" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "contactChannel" "ContactChannel" NOT NULL DEFAULT 'whatsapp',
    "waVerifiedAt" TIMESTAMPTZ(3),
    "phoneVerifiedAt" TIMESTAMPTZ(3),
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "optInSource" TEXT,
    "optInAt" TIMESTAMPTZ(3),
    "optOutAt" TIMESTAMPTZ(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "ip" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentVia" "ContactChannel" NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultAddress" TEXT,
    "district" TEXT,
    "town" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workerUid" TEXT NOT NULL,
    "kind" "WorkerKind" NOT NULL DEFAULT 'individual',
    "leadId" TEXT,
    "referralCode" TEXT,
    "referredByCode" TEXT,
    "trade" TEXT NOT NULL,
    "canWorkPersonally" BOOLEAN NOT NULL DEFAULT true,
    "crewTrades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "worksWithCrews" BOOLEAN,
    "district" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "age" INTEGER,
    "gender" TEXT,
    "usualDailyRate" INTEGER,
    "rateTier" TEXT,
    "publishedRate" INTEGER,
    "rateOverride" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkerStatus" NOT NULL DEFAULT 'pending',
    "statusReason" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "pvcNumber" TEXT,
    "pvcStation" TEXT,
    "pvcIssuedAt" TIMESTAMPTZ(3),
    "pvcVerifiedAt" TIMESTAMPTZ(3),
    "pvcExpiresAt" TIMESTAMPTZ(3),
    "reliability" INTEGER NOT NULL DEFAULT 70,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "declinedCount" INTEGER NOT NULL DEFAULT 0,
    "noResponseCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "probationJobs" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTermsAt" TIMESTAMPTZ(3),
    "termsVersion" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliationEvent" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "fromLeadId" TEXT,
    "toLeadId" TEXT,
    "reason" TEXT NOT NULL,
    "actorAdmin" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerDocument" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "sha256" TEXT,
    "receivedVia" TEXT NOT NULL DEFAULT 'whatsapp',
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "dailyRate" INTEGER NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequest" (
    "id" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "workersNeeded" INTEGER NOT NULL DEFAULT 1,
    "district" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "preferredDate" DATE NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'new',
    "createdVia" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "JobRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "jobRequestId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "assignedBy" TEXT NOT NULL DEFAULT 'admin',
    "responseRequired" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'proposed',
    "respondedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentMember" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "agreedRate" INTEGER NOT NULL,
    "namedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMPTZ(3),
    "noShow" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssignmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grievance" (
    "id" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "againstId" TEXT,
    "jobRequestId" TEXT,
    "category" "GrievanceCategory" NOT NULL,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'open',
    "detail" TEXT NOT NULL,
    "handledById" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Grievance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "waPhone" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeFlow" TEXT,
    "stepId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "lastInboundAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("waPhone")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "userId" TEXT,
    "waPhone" TEXT NOT NULL,
    "channel" "ContactChannel" NOT NULL DEFAULT 'whatsapp',
    "type" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "templateName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT,
    "role" "WaitlistRole" NOT NULL,
    "reason" "WaitlistReason" NOT NULL,
    "district" TEXT,
    "trade" TEXT,
    "notifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_expiresAt_idx" ON "AdminSession"("adminId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_subjectId_createdAt_idx" ON "AuditLog"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_userId_key" ON "WorkerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_workerUid_key" ON "WorkerProfile"("workerUid");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_referralCode_key" ON "WorkerProfile"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_pvcNumber_key" ON "WorkerProfile"("pvcNumber");

-- CreateIndex
CREATE INDEX "WorkerProfile_trade_district_status_idx" ON "WorkerProfile"("trade", "district", "status");

-- CreateIndex
CREATE INDEX "WorkerProfile_kind_status_idx" ON "WorkerProfile"("kind", "status");

-- CreateIndex
CREATE INDEX "WorkerProfile_leadId_idx" ON "WorkerProfile"("leadId");

-- CreateIndex
CREATE INDEX "WorkerProfile_status_pvcVerifiedAt_idx" ON "WorkerProfile"("status", "pvcVerifiedAt");

-- CreateIndex
CREATE INDEX "AffiliationEvent_workerId_createdAt_idx" ON "AffiliationEvent"("workerId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkerDocument_workerId_kind_idx" ON "WorkerDocument"("workerId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "RateCard_trade_tier_key" ON "RateCard"("trade", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "JobRequest_refNo_key" ON "JobRequest"("refNo");

-- CreateIndex
CREATE INDEX "JobRequest_status_createdAt_idx" ON "JobRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JobRequest_trade_preferredDate_idx" ON "JobRequest"("trade", "preferredDate");

-- CreateIndex
CREATE INDEX "Assignment_jobRequestId_idx" ON "Assignment"("jobRequestId");

-- CreateIndex
CREATE INDEX "Assignment_responderId_status_idx" ON "Assignment"("responderId", "status");

-- CreateIndex
CREATE INDEX "Assignment_status_expiresAt_idx" ON "Assignment"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AssignmentMember_workerId_idx" ON "AssignmentMember"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentMember_assignmentId_workerId_key" ON "AssignmentMember"("assignmentId", "workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Grievance_refNo_key" ON "Grievance"("refNo");

-- CreateIndex
CREATE INDEX "Grievance_status_createdAt_idx" ON "Grievance"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Grievance_againstId_createdAt_idx" ON "Grievance"("againstId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_userId_key" ON "Conversation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_waMessageId_key" ON "Message"("waMessageId");

-- CreateIndex
CREATE INDEX "Message_waPhone_createdAt_idx" ON "Message"("waPhone", "createdAt");

-- CreateIndex
CREATE INDEX "Message_status_createdAt_idx" ON "Message"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_waMessageId_key" ON "WebhookEvent"("waMessageId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_role_district_idx" ON "WaitlistEntry"("role", "district");

-- CreateIndex
CREATE INDEX "WaitlistEntry_phone_idx" ON "WaitlistEntry"("phone");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "WorkerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliationEvent" ADD CONSTRAINT "AffiliationEvent_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequest" ADD CONSTRAINT "JobRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_jobRequestId_fkey" FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "WorkerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentMember" ADD CONSTRAINT "AssignmentMember_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentMember" ADD CONSTRAINT "AssignmentMember_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_againstId_fkey" FOREIGN KEY ("againstId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_jobRequestId_fkey" FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Identifier sequences ───────────────────────────────────────────────────

-- Appended to the initial migration.
--
-- workerUid and refNo are user-facing identifiers with a unique index. Both
-- were previously derived by counting rows or drawing four random digits, and
-- both collide: counting races two concurrent registrations onto the same id,
-- and 9000 random refs collide well before the namespace is spent. A sequence
-- cannot do either.

CREATE SEQUENCE IF NOT EXISTS worker_uid_seq START 1;
CREATE SEQUENCE IF NOT EXISTS job_ref_seq START 1000;

-- HY-000042
CREATE OR REPLACE FUNCTION next_worker_uid() RETURNS text AS $$
  SELECT 'HY-' || lpad(nextval('worker_uid_seq')::text, 6, '0');
$$ LANGUAGE sql VOLATILE;

-- HY-4821
CREATE OR REPLACE FUNCTION next_job_ref() RETURNS text AS $$
  SELECT 'HY-' || nextval('job_ref_seq')::text;
$$ LANGUAGE sql VOLATILE;

-- GR-1043
CREATE SEQUENCE IF NOT EXISTS grievance_ref_seq START 1000;
CREATE OR REPLACE FUNCTION next_grievance_ref() RETURNS text AS $$
  SELECT 'GR-' || nextval('grievance_ref_seq')::text;
$$ LANGUAGE sql VOLATILE;
