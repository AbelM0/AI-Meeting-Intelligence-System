-- Preserve pre-Clerk meetings under a non-login holding user. Reassign them to a
-- real Clerk user with the documented backfill command after configuring Clerk.
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Meeting" ADD COLUMN "userId" TEXT;

INSERT INTO "User" ("id", "name", "updatedAt")
VALUES ('legacy_unassigned', 'Legacy development meetings', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Meeting" SET "userId" = 'legacy_unassigned' WHERE "userId" IS NULL;

ALTER TABLE "Meeting" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "Meeting_userId_idx" ON "Meeting"("userId");
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
