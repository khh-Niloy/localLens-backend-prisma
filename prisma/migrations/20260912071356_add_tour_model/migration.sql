-- CreateEnum
CREATE TYPE "TOUR_CATEGORY" AS ENUM ('FOOD', 'HISTORICAL', 'ART', 'NATURE', 'ADVENTURE', 'CULTURAL');

-- CreateEnum
CREATE TYPE "TOUR_STATUS" AS ENUM ('ACTIVE', 'DEACTIVATE');

-- CreateTable
CREATE TABLE "Tour" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "guideId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "itinerary" JSONB NOT NULL DEFAULT '[]',
    "tourFee" DOUBLE PRECISION NOT NULL,
    "maxDuration" INTEGER NOT NULL,
    "meetingPoint" TEXT NOT NULL,
    "maxGroupSize" INTEGER NOT NULL,
    "category" "TOUR_CATEGORY" NOT NULL,
    "location" TEXT NOT NULL,
    "images" TEXT[],
    "highlights" TEXT[],
    "included" TEXT[],
    "notIncluded" TEXT[],
    "importantInfo" TEXT[],
    "status" "TOUR_STATUS" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "availableDates" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
