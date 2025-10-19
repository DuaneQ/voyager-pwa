/*
  Warnings:

  - You are about to drop the `Itinerary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."Itinerary";

-- CreateTable
CREATE TABLE "itineraries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "destination" TEXT,
    "title" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMPTZ(6),
    "endDate" TIMESTAMPTZ(6),
    "startDay" BIGINT,
    "endDay" BIGINT,
    "lowerRange" INTEGER,
    "upperRange" INTEGER,
    "gender" TEXT,
    "sexualOrientation" TEXT,
    "status" TEXT,
    "likes" JSONB,
    "activities" JSONB,
    "userInfo" JSONB,
    "response" JSONB,
    "metadata" JSONB,
    "externalData" JSONB,
    "recommendations" JSONB,
    "costBreakdown" JSONB,
    "dailyPlans" JSONB,
    "days" JSONB,
    "flights" JSONB,
    "accommodations" JSONB,
    "ai_status" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itineraries_userId_idx" ON "itineraries"("userId");

-- CreateIndex
CREATE INDEX "itineraries_startDate_idx" ON "itineraries"("startDate");
