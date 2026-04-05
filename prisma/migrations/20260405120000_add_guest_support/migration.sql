-- CreateTable
CREATE TABLE "Guest" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_clubId_nickname_key" ON "Guest"("clubId", "nickname");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: make memberId nullable (was NOT NULL before guest support)
ALTER TABLE "Result" ALTER COLUMN "memberId" DROP NOT NULL;

-- AlterTable: add clientId (UUID from app, used for client-initiated deletion)
ALTER TABLE "Result" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Result_clientId_key" ON "Result"("clientId");

-- AlterTable: add guestId FK
ALTER TABLE "Result" ADD COLUMN "guestId" INTEGER;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

