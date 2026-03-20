-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
