-- CreateTable
CREATE TABLE "MeetingSpeaker" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "providerSpeakerId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSpeaker_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TranscriptSegment" ADD COLUMN "speakerId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSpeaker_meetingId_providerSpeakerId_key" ON "MeetingSpeaker"("meetingId", "providerSpeakerId");

-- CreateIndex
CREATE INDEX "MeetingSpeaker_meetingId_idx" ON "MeetingSpeaker"("meetingId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_speakerId_idx" ON "TranscriptSegment"("speakerId");

-- AddForeignKey
ALTER TABLE "MeetingSpeaker" ADD CONSTRAINT "MeetingSpeaker_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "MeetingSpeaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
