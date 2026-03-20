-- CreateTable
CREATE TABLE "ClubComment" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "authorMemberId" INTEGER,
    "guestName" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClubComment" ADD CONSTRAINT "ClubComment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubComment" ADD CONSTRAINT "ClubComment_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
