-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "returnedToMerchantAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MerchantReturn" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "merchantId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "goodsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnOrder" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantReturn_number_key" ON "MerchantReturn"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnOrder_returnId_orderId_key" ON "ReturnOrder"("returnId", "orderId");

-- AddForeignKey
ALTER TABLE "MerchantReturn" ADD CONSTRAINT "MerchantReturn_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantReturn" ADD CONSTRAINT "MerchantReturn_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "MerchantReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
