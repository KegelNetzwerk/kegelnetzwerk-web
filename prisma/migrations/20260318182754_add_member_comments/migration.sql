-- CreateTable
CREATE TABLE "MemberComment" (
    "id" SERIAL NOT NULL,
    "profileMemberId" INTEGER NOT NULL,
    "authorMemberId" INTEGER,
    "guestName" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemberComment" ADD CONSTRAINT "MemberComment_profileMemberId_fkey" FOREIGN KEY ("profileMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComment" ADD CONSTRAINT "MemberComment_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
