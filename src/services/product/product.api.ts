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

async function getProductRemoteConfig() {
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

async function attachInventory<T extends { id: number }>(products: T[]) {
  const { inventory, productOverrides } = await getProductRemoteConfig();
  return products.map((product) => {
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
  }).filter((product) => (product as T & { hidden?: boolean }).hidden !== true);
}

export const productService = {
  getProducts: async (categoryId: string, featureId: string) => {
    const filteredProducts = mockListOfProduct.filter(
      (product) =>
        (categoryId === "vietnamese" || product.categoryId === categoryId) &&
        (featureId ? product.features.includes(featureId) : true),
    );
    return attachInventory(filteredProducts);
  },

  getProductById: async (productId: string | number) => {
    const product = mockListOfProduct.find(
      (product) => product.id === Number(productId),
    );
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }
    const [productWithInventory] = await attachInventory([product]);
    return productWithInventory;
  },

  getProductsBySubCategory: async (subCategoryId: string) => {
    const filteredProducts = mockListOfProduct.filter(
      (product) => product.subCategoryId === subCategoryId,
    );
    return attachInventory(filteredProducts);
  },

  getProductsGroupBySubCategory: async (
    categoryId: string,
    featureId: string,
  ) => {
    const filteredProducts = mockListOfProduct.filter(
      (product) =>
        (categoryId === "vietnamese" || product.categoryId === categoryId) &&
        (featureId ? product.features.includes(featureId) : true),
    );

    const productsWithInventory = await attachInventory(filteredProducts);
    const groupedProducts = mockListOfSubCategory.map((subCategory) => ({
      ...subCategory,
      products: productsWithInventory.filter(
        (product) => product.subCategoryId === subCategory.id,
      ),
    }));
    return groupedProducts;
  },
};
