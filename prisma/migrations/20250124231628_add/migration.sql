/*
  Warnings:

  - Made the column `author` on table `Quotes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Quotes" ADD COLUMN     "arabic" TEXT,
ALTER COLUMN "author" SET NOT NULL;
