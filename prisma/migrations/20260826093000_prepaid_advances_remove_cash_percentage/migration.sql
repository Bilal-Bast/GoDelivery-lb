-- AlterTable
ALTER TABLE "User" DROP COLUMN "cashPercentage";

-- AlterTable
ALTER TABLE "MerchantPayment" ADD COLUMN     "isAdvance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '';
