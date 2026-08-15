-- AlterTable
ALTER TABLE "Decision" ADD COLUMN "sourceSegmentId" UUID;

-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN "sourceSegmentId" UUID;

-- CreateIndex
CREATE INDEX "Decision_sourceSegmentId_idx" ON "Decision"("sourceSegmentId");

-- CreateIndex
CREATE INDEX "ActionItem_sourceSegmentId_idx" ON "ActionItem"("sourceSegmentId");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "TranscriptSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "TranscriptSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
