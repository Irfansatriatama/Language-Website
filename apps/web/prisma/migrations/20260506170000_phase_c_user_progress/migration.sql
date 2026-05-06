-- CreateEnum
CREATE TYPE "ItemProgressState" AS ENUM ('NEW', 'SEEN', 'LEARNED');

-- CreateTable
CREATE TABLE "user_item_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "state" "ItemProgressState" NOT NULL DEFAULT 'NEW',
    "learnedAt" TIMESTAMP(3),
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_item_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_language_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "isStudying" BOOLEAN NOT NULL DEFAULT true,
    "includeInTotalProgress" BOOLEAN NOT NULL DEFAULT true,
    "dailyGoalMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_language_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_item_progress_userId_contentItemId_key" ON "user_item_progress"("userId", "contentItemId");

CREATE INDEX "user_item_progress_userId_idx" ON "user_item_progress"("userId");

CREATE INDEX "user_item_progress_contentItemId_idx" ON "user_item_progress"("contentItemId");

CREATE UNIQUE INDEX "user_language_settings_userId_languageId_key" ON "user_language_settings"("userId", "languageId");

CREATE INDEX "user_language_settings_userId_idx" ON "user_language_settings"("userId");

-- AddForeignKey
ALTER TABLE "user_item_progress" ADD CONSTRAINT "user_item_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_item_progress" ADD CONSTRAINT "user_item_progress_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_language_settings" ADD CONSTRAINT "user_language_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_language_settings" ADD CONSTRAINT "user_language_settings_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
