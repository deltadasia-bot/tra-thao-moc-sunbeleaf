import { mockListOfProduct } from "./product.mock";
import { mockListOfSubCategory } from "../category/category.mock";
import { BACKEND_URL } from "@/constants/api";

type InventoryEntry = {
  productId: string;
  stock: number | null;
  enabled: boolean;
  visible?: boolean;
  lowStockThreshold?: number;
};

type ProductOverride = Partial<{
  name: string;
  description: string;
  price: number;
  listPrice: number;
  image: string;
  images: string[];
  descriptionImages: string[];
  descriptionBlocks: unknown[];
  video: string;
  videoPoster: string;
  sku: string;
  weightGram: number;
  widthCm: number;
  lengthCm: number;
  heightCm: number;
  variantGroups: unknown[];
  categoryId: string;
  subCategoryId: string;
  shippingExpress: boolean;
  shippingInstant: boolean;
}>;

let inventoryCache:
  | {
      expiresAt: number;
      data: {
        inventory: Record<string, InventoryEntry>;
        productOverrides: Record<string, ProductOverride>;
      };
    }
  | null = null;

export async function getProductRemoteConfig() {
  const now = Date.now();
  if (inventoryCache && inventoryCache.expiresAt > now) {
    return inventoryCache.data;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory`);
    if (!response.ok) throw new Error("Inventory request failed");
    const data = await response.json();
    const inventory =
      data?.inventory && typeof data.inventory === "object"
        ? data.inventory
        : {};
    const productOverrides =
      data?.productOverrides && typeof data.productOverrides === "object"
        ? data.productOverrides
        : {};
    inventoryCache = {
      expiresAt: now + 30 * 1000,
      data: { inventory, productOverrides },
    };
    return inventoryCache.data;
  } catch {
    inventoryCache = {
      expiresAt: now + 10 * 1000,
      data: { inventory: {}, productOverrides: {} },
    };
    return inventoryCache.data;
  }
}

async function getAllProductsMerged() {
  const { inventory, productOverrides } = await getProductRemoteConfig();

  // Map base mock catalog
  const mappedBase = mockListOfProduct.map((product) => {
    const entry = inventory[String(product.id)];
    const override = productOverrides[String(product.id)] || {};
    const mergedProduct = {
      ...product,
      ...override,
    };
    if (!entry) return mergedProduct;
    return {
      ...mergedProduct,
      stock: entry.stock,
      stockEnabled: entry.enabled !== false,
      hidden: entry.visible === false,
      lowStockThreshold: entry.lowStockThreshold ?? 5,
    };
  });

  const baseIds = new Set(mappedBase.map((p) => String(p.id)));
  const extraProducts: any[] = [];

  Object.keys(productOverrides).forEach((productId) => {
    if (!baseIds.has(productId)) {
      const override = productOverrides[productId];
      const entry = inventory[productId] || {};
      extraProducts.push({
        id: Number(productId),
        name: override.name || `Sản phẩm #${productId}`,
        description: override.description || "",
        image: override.image || "",
        images: override.images || [],
        descriptionImages: override.descriptionImages || [],
        descriptionBlocks: override.descriptionBlocks || [],
        video: override.video || "",
        videoPoster: override.videoPoster || "",
        sku: override.sku || "",
        variantGroups: override.variantGroups || [],
        categoryId: override.categoryId || "all",
        subCategoryId: override.subCategoryId || "",
        price: Number(override.price || 0),
        listPrice: override.listPrice ? Number(override.listPrice) : undefined,
        shippingExpress: override.shippingExpress !== false,
        shippingInstant: override.shippingInstant === true,
        stock: entry.stock ?? null,
        stockEnabled: entry.enabled !== false,
        hidden: entry.visible === false,
        lowStockThreshold: entry.lowStockThreshold ?? 5,
        features: [],
        weightGram: typeof override.weightGram === "number" ? override.weightGram : undefined,
        widthCm: typeof override.widthCm === "number" ? override.widthCm : undefined,
        lengthCm: typeof override.lengthCm === "number" ? override.lengthCm : undefined,
        heightCm: typeof override.heightCm === "number" ? override.heightCm : undefined,
        brand: override.brand || "",
        origin: override.origin || "",
        expiry: override.expiry || "",
        responsibleOrg: override.responsibleOrg || "",
        responsibleOrgAddress: override.responsibleOrgAddress || "",
        volume: override.volume || "",
        expiryDate: override.expiryDate || "",
        manufactureDate: override.manufactureDate || "",
        flavor: override.flavor || "",
        ingredients: override.ingredients || "",
        packageSize: override.packageSize || "",
      });
    }
  });

  const all = [...mappedBase, ...extraProducts];
  return all.filter((product) => product.hidden !== true);
}

export const productService = {
  getProducts: async (categoryId: string, featureId: string) => {
    const all = await getAllProductsMerged();
    return all.filter(
      (product) =>
        (categoryId === "all" || product.categoryId === categoryId) &&
        (featureId ? product.features?.includes(featureId) : true),
    );
  },

  getProductById: async (productId: string | number) => {
    const all = await getAllProductsMerged();
    const product = all.find((p) => p.id === Number(productId));
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }
    return product;
  },

  getProductsBySubCategory: async (subCategoryId: string) => {
    const all = await getAllProductsMerged();
    return all.filter((product) => product.subCategoryId === subCategoryId);
  },

  getProductsGroupBySubCategory: async (
    categoryId: string,
    featureId: string,
  ) => {
    const all = await getAllProductsMerged();
    const filtered = all.filter(
      (product) =>
        (categoryId === "all" || product.categoryId === categoryId) &&
        (featureId ? product.features?.includes(featureId) : true),
    );

    const { categoryService } = await import("../category/category.api");
    const subCategories = await categoryService.getSubCategories(categoryId);

    const groupedProducts = subCategories.map((subCategory) => ({
      ...subCategory,
      products: filtered.filter(
        (product) => product.subCategoryId === subCategory.id,
      ),
    }));
    return groupedProducts;
  },
};
