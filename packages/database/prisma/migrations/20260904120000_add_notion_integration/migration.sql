CREATE TABLE "NotionConnection" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT,
    "workspaceIcon" TEXT,
    "botId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotionConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotionOAuthState" (
    "id" UUID NOT NULL,
    "stateHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meetingId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotionOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotionConnection_userId_key" ON "NotionConnection"("userId");
CREATE INDEX "NotionConnection_workspaceId_idx" ON "NotionConnection"("workspaceId");
CREATE UNIQUE INDEX "NotionOAuthState_stateHash_key" ON "NotionOAuthState"("stateHash");
CREATE INDEX "NotionOAuthState_userId_expiresAt_idx" ON "NotionOAuthState"("userId", "expiresAt");
CREATE INDEX "NotionOAuthState_meetingId_idx" ON "NotionOAuthState"("meetingId");

ALTER TABLE "NotionConnection" ADD CONSTRAINT "NotionConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotionOAuthState" ADD CONSTRAINT "NotionOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotionOAuthState" ADD CONSTRAINT "NotionOAuthState_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
