import { PrismaClient, ProductCategory, Gender } from "@prisma/client";
import colorsJson = require("./colors.json");
import productsJson = require("./products.json");
import sizeGuideJson = require("./size-guide.json");

interface SeedProduct {
  slug: string;
  category: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  priceCop: number;
  sortOrder: number;
  images: string[];
  colors: string[];
  sizes: Record<string, string[]>;
}

const buildSku = (slug: string, gender: string, colorId: string, size: string) =>
  `${slug}-${gender}-${colorId}-${size}`.toUpperCase();

export async function seedCatalog(prisma: PrismaClient) {
  console.log("Seeding product colors...");
  for (const color of colorsJson) {
    await prisma.productColor.upsert({
      where: { id: color.id },
      update: { nameEs: color.nameEs, nameEn: color.nameEn, hex: color.hex },
      create: color,
    });
  }
  console.log(`Seeded ${colorsJson.length} colors`);

  console.log("Seeding products...");
  let variantCount = 0;

  for (const product of productsJson as SeedProduct[]) {
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        category: product.category as ProductCategory,
        nameEs: product.nameEs,
        nameEn: product.nameEn,
        descriptionEs: product.descriptionEs,
        descriptionEn: product.descriptionEn,
        basePriceCop: product.priceCop,
        sortOrder: product.sortOrder,
      },
      create: {
        slug: product.slug,
        category: product.category as ProductCategory,
        nameEs: product.nameEs,
        nameEn: product.nameEn,
        descriptionEs: product.descriptionEs,
        descriptionEn: product.descriptionEn,
        basePriceCop: product.priceCop,
        sortOrder: product.sortOrder,
      },
    });

    // El orden de las imagenes importa: la posicion 0 es la miniatura de la
    // tarjeta, y no todos los productos empiezan por el mismo color.
    for (const [position, storageKey] of product.images.entries()) {
      await prisma.productImage.upsert({
        where: { productId_position: { productId: saved.id, position } },
        update: { storageKey, alt: product.nameEs },
        create: { productId: saved.id, storageKey, position, alt: product.nameEs },
      });
    }

    // El orden declarado en products.json es el orden de las paletas en la
    // ficha, y el primero es el color por defecto.
    for (const [position, colorId] of product.colors.entries()) {
      await prisma.productColorOption.upsert({
        where: { productId_colorId: { productId: saved.id, colorId } },
        update: { position },
        create: { productId: saved.id, colorId, position },
      });
    }

    for (const colorId of product.colors) {
      for (const [gender, sizes] of Object.entries(product.sizes)) {
        for (const size of sizes) {
          await prisma.productVariant.upsert({
            where: {
              productId_colorId_gender_size: {
                productId: saved.id,
                colorId,
                gender: gender as Gender,
                size,
              },
            },
            // Se actualiza el precio para que un cambio en products.json se
            // propague al re-sembrar. NO se tocan isActive ni stock: eso
            // resucitaria una variante desactivada a mano desde el admin.
            update: { priceCop: product.priceCop },
            create: {
              sku: buildSku(product.slug, gender, colorId, size),
              productId: saved.id,
              colorId,
              gender: gender as Gender,
              size,
              priceCop: product.priceCop,
            },
          });
          variantCount += 1;
        }
      }
    }
  }
  console.log(`Seeded ${productsJson.length} products and ${variantCount} variants`);

  console.log("Seeding size guide...");
  for (const entry of sizeGuideJson) {
    await prisma.sizeGuideEntry.upsert({
      where: {
        category_gender_size: {
          category: entry.category as ProductCategory,
          gender: entry.gender as Gender,
          size: entry.size,
        },
      },
      update: {
        chestCm: entry.chestCm,
        lengthCm: entry.lengthCm,
        shoulderCm: entry.shoulderCm,
      },
      create: {
        category: entry.category as ProductCategory,
        gender: entry.gender as Gender,
        size: entry.size,
        chestCm: entry.chestCm,
        lengthCm: entry.lengthCm,
        shoulderCm: entry.shoulderCm,
      },
    });
  }
  console.log(`Seeded ${sizeGuideJson.length} size guide entries`);
}
