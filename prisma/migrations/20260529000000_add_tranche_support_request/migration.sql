-- CreateTable
CREATE TABLE "public"."tranche_support_requests" (
  "id"             TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "company"        TEXT,
  "email"          TEXT NOT NULL,
  "message"        TEXT NOT NULL,
  "type"           TEXT NOT NULL DEFAULT 'general',
  "delivered"      BOOLEAN NOT NULL DEFAULT false,
  "deliveryError"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tranche_support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tranche_support_requests_createdAt_idx" ON "public"."tranche_support_requests"("createdAt");

-- CreateIndex
CREATE INDEX "tranche_support_requests_email_idx" ON "public"."tranche_support_requests"("email");
