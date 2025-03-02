-- CreateTable
CREATE TABLE "Pictures" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pictures_pkey" PRIMARY KEY ("id")
);
