-- CreateTable
CREATE TABLE "SecretSantaAssignment" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "giverId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretSantaAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretSantaAssignment_clubId_giverId_year_key" ON "SecretSantaAssignment"("clubId", "giverId", "year");

-- AddForeignKey
ALTER TABLE "SecretSantaAssignment" ADD CONSTRAINT "SecretSantaAssignment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaAssignment" ADD CONSTRAINT "SecretSantaAssignment_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaAssignment" ADD CONSTRAINT "SecretSantaAssignment_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
