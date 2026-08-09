-- EDITADO A MANO.
--
-- Prisma genero originalmente:
--     ALTER TABLE "orders" DROP COLUMN "status",
--     ADD COLUMN     "status" "OrderStatus" NOT NULL;
--
-- Eso destruye el estado de toda orden existente y ademas falla en una tabla
-- con datos (columna NOT NULL sin default). Se reemplaza por un cast in-place:
-- los miembros del enum se nombraron exactamente igual que los strings que ya
-- estaban guardados, asi que el USING es una conversion 1:1 sin perdida.
--
-- Si alguna fila tuviera un status fuera del enum, este ALTER falla y aborta la
-- transaccion de la migracion. Eso es lo correcto: preferimos no migrar a
-- migrar perdiendo datos en silencio.

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('checkout_created', 'paid', 'payment_pending', 'payment_failed', 'payment_unknown', 'payment_review');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('hombre', 'mujer');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('hoodies', 'camisetas');

-- CreateEnum
CREATE TYPE "PrintSide" AS ENUM ('front', 'back');

-- CreateEnum
CREATE TYPE "PrintAssetStatus" AS ENUM ('pending', 'rendering', 'ready', 'failed');

-- AlterTable (cast in-place, ver nota al inicio del archivo)
ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "cart_item_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_slug" TEXT NOT NULL,
    "product_name_es" TEXT NOT NULL,
    "product_name_en" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "gender" "Gender" NOT NULL,
    "size" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "color_name_es" TEXT NOT NULL,
    "color_name_en" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "image_url" TEXT,
    "unit_price_cop" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_cop" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "name_es" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_es" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "base_price_cop" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_colors" (
    "id" TEXT NOT NULL,
    "name_es" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "hex" TEXT NOT NULL,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "color_id" TEXT,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "size" TEXT NOT NULL,
    "price_cop" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "size_guide_entries" (
    "id" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "gender" "Gender" NOT NULL,
    "size" TEXT NOT NULL,
    "chest_cm" INTEGER NOT NULL,
    "length_cm" INTEGER NOT NULL,
    "shoulder_cm" INTEGER NOT NULL,

    CONSTRAINT "size_guide_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_assets" (
    "id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "preview_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "has_alpha" BOOLEAN NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_designs" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "side" "PrintSide" NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "print_area_width_mm" DECIMAL(6,2) NOT NULL,
    "print_area_height_mm" DECIMAL(6,2) NOT NULL,
    "dpi" INTEGER NOT NULL DEFAULT 300,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "layer" JSONB NOT NULL,
    "image_asset_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_assets" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "status" "PrintAssetStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "format" TEXT NOT NULL DEFAULT 'png',
    "dpi" INTEGER NOT NULL DEFAULT 300,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "bytes" INTEGER,
    "storage_key" TEXT,
    "proof_key" TEXT,
    "checksum_sha256" TEXT,
    "renderer_version" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_cart_item_id_key" ON "order_items"("order_id", "cart_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_is_active_idx" ON "products"("category", "is_active");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_product_id_position_key" ON "product_images"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_color_id_gender_size_key" ON "product_variants"("product_id", "color_id", "gender", "size");

-- CreateIndex
CREATE UNIQUE INDEX "size_guide_entries_category_gender_size_key" ON "size_guide_entries"("category", "gender", "size");

-- CreateIndex
CREATE INDEX "design_assets_createdAt_idx" ON "design_assets"("createdAt");

-- CreateIndex
CREATE INDEX "order_item_designs_order_item_id_idx" ON "order_item_designs"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_designs_order_item_id_side_key" ON "order_item_designs"("order_item_id", "side");

-- CreateIndex
CREATE INDEX "print_assets_status_createdAt_idx" ON "print_assets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "print_assets_design_id_idx" ON "print_assets"("design_id");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_designs" ADD CONSTRAINT "order_item_designs_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_designs" ADD CONSTRAINT "order_item_designs_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "design_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_assets" ADD CONSTRAINT "print_assets_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "order_item_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
