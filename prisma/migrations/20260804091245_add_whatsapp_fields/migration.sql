-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "whatsappMessageId" TEXT,
ADD COLUMN     "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappSentAt" TIMESTAMP(3);
