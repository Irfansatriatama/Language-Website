-- Fase G: profile, XP ledger, daily challenges

CREATE TABLE "user_gamification_profile" (
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streakCurrent" INTEGER NOT NULL DEFAULT 0,
    "streakBest" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gamification_profile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "xp_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_daily_challenge_day" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "challenges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_daily_challenge_day_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_daily_challenge_day_userId_dateKey_key"
    ON "user_daily_challenge_day"("userId", "dateKey");

CREATE INDEX "user_daily_challenge_day_userId_idx" ON "user_daily_challenge_day"("userId");

CREATE INDEX "xp_ledger_userId_createdAt_idx" ON "xp_ledger"("userId", "createdAt");

ALTER TABLE "user_gamification_profile"
    ADD CONSTRAINT "user_gamification_profile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xp_ledger"
    ADD CONSTRAINT "xp_ledger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_daily_challenge_day"
    ADD CONSTRAINT "user_daily_challenge_day_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill profile from legacy User.totalXp
INSERT INTO "user_gamification_profile" ("userId", "totalXp", "level", "streakCurrent", "streakBest", "lastActiveDate", "createdAt", "updatedAt")
SELECT
    u."id",
    u."totalXp",
    CASE
        WHEN u."totalXp" >= 6000 THEN 7
        WHEN u."totalXp" >= 3000 THEN 6
        WHEN u."totalXp" >= 1500 THEN 5
        WHEN u."totalXp" >= 700 THEN 4
        WHEN u."totalXp" >= 300 THEN 3
        WHEN u."totalXp" >= 100 THEN 2
        ELSE 1
    END AS "level",
    0,
    0,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "user" u
ON CONFLICT ("userId") DO NOTHING;
