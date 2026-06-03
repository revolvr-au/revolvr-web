-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "public"."Report" (
  "id"            TEXT NOT NULL,
  "reporterEmail" TEXT,
  "targetType"    TEXT NOT NULL,
  "targetId"      TEXT NOT NULL,
  "reason"        TEXT NOT NULL,
  "note"          TEXT,
  "status"        "public"."ReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedBy"    TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "public"."Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "public"."Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_reporterEmail_idx" ON "public"."Report"("reporterEmail");
