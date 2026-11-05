-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfume" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sizeMl" INTEGER,
    "priceCents" INTEGER,
    "imageUrl" TEXT,
    "notesTop" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notesHeart" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notesBase" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occasions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Perfume_brandId_idx" ON "Perfume"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Perfume_brandId_slug_key" ON "Perfume"("brandId", "slug");

-- AddForeignKey
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
