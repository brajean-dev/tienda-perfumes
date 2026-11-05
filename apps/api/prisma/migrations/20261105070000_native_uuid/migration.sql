-- Convierte los identificadores de TEXT a UUID nativo de PostgreSQL, conservando los datos.
-- Prisma no genera este cambio solo (no hay conversión automática de texto a uuid), así que se
-- escribe a mano: se quita la clave foránea, se convierten las tres columnas y se vuelve a crear.
-- Falla (sin cambiar nada) si algún id existente no tiene formato UUID.

-- DropForeignKey
ALTER TABLE "Perfume" DROP CONSTRAINT "Perfume_brandId_fkey";

-- AlterTable
ALTER TABLE "Brand" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

-- AlterTable
ALTER TABLE "Perfume" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
ALTER COLUMN "brandId" TYPE UUID USING "brandId"::uuid;

-- AddForeignKey
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
