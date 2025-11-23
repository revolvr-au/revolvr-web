-- CreateTable
CREATE TABLE "RevolvrItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevolvrItem_pkey" PRIMARY KEY ("id")
);
