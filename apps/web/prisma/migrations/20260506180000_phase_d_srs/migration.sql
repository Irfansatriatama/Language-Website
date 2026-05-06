-- AlterTable
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "timezone" TEXT;

-- CreateTable
CREATE TABLE "srs_card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "nextReviewAt" DATE NOT NULL,
    "lastReviewAt" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "srs_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "srs_card_userId_contentItemId_key" ON "srs_card"("userId", "contentItemId");

-- CreateIndex
CREATE INDEX "srs_card_userId_nextReviewAt_idx" ON "srs_card"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "srs_card_contentItemId_idx" ON "srs_card"("contentItemId");

-- CreateIndex
CREATE INDEX "activity_event_userId_createdAt_idx" ON "activity_event"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "srs_card" ADD CONSTRAINT "srs_card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_card" ADD CONSTRAINT "srs_card_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
