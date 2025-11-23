/*
  Warnings:

  - You are about to drop the column `name` on the `RevolvrItem` table. All the data in the column will be lost.
  - Added the required column `title` to the `RevolvrItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RevolvrItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RevolvrStatus" AS ENUM ('NEW', 'ACTIVE', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "RevolvrItem" DROP COLUMN "name",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "RevolvrStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" INTEGER;
