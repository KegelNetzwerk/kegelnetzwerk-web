-- CreateTable
CREATE TABLE "MoneySource" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneySourceLog" (
    "id" SERIAL NOT NULL,
    "moneySourceId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneySourceLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MoneySource" ADD CONSTRAINT "MoneySource_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneySourceLog" ADD CONSTRAINT "MoneySourceLog_moneySourceId_fkey" FOREIGN KEY ("moneySourceId") REFERENCES "MoneySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
