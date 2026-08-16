-- Add stable list ordering and secure, revocable read-only meeting shares.
CREATE INDEX "Meeting_userId_createdAt_id_idx" ON "Meeting"("userId", "createdAt", "id");

CREATE TABLE "MeetingShare" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeetingShare_tokenHash_key" ON "MeetingShare"("tokenHash");
CREATE INDEX "MeetingShare_meetingId_revokedAt_idx" ON "MeetingShare"("meetingId", "revokedAt");
CREATE INDEX "MeetingShare_expiresAt_idx" ON "MeetingShare"("expiresAt");

ALTER TABLE "MeetingShare" ADD CONSTRAINT "MeetingShare_meetingId_fkey"
  FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
