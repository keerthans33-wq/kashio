-- CreateTable
CREATE TABLE "BasiqConnection" (
    "id" TEXT NOT NULL,
    "basiqUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasiqConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BasiqConnection_basiqUserId_key" ON "BasiqConnection"("basiqUserId");
