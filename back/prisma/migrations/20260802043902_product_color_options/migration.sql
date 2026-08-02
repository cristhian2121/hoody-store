-- CreateTable
CREATE TABLE "product_color_options" (
    "product_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "product_color_options_pkey" PRIMARY KEY ("product_id","color_id")
);

-- CreateIndex
CREATE INDEX "product_color_options_product_id_idx" ON "product_color_options"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_options_product_id_position_key" ON "product_color_options"("product_id", "position");

-- AddForeignKey
ALTER TABLE "product_color_options" ADD CONSTRAINT "product_color_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color_options" ADD CONSTRAINT "product_color_options_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
