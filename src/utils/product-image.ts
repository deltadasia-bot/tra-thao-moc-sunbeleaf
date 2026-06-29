import { mockListOfProduct } from "@/services/product/product.mock";

type ProductImageLookup = {
  productId?: number;
  name?: string;
  image?: string;
};

function normalizeLookupText(value?: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getProductThumbnailById(
  productId?: number,
  fallbackImage?: string,
) {
  if (typeof productId === "number" && Number.isFinite(productId)) {
    const matchedProduct = mockListOfProduct.find(
      (product) => product.id === productId,
    );
    if (matchedProduct?.image) {
      return matchedProduct.image;
    }
  }

  return fallbackImage || "";
}

export function getProductThumbnailByName(
  productName?: string,
  fallbackImage?: string,
) {
  const normalizedName = normalizeLookupText(productName);
  if (!normalizedName) {
    return fallbackImage || "";
  }

  const matchedProduct = mockListOfProduct.find((product) => {
    const normalizedProductName = normalizeLookupText(product.name);
    return (
      normalizedProductName.includes(normalizedName) ||
      normalizedName.includes(normalizedProductName)
    );
  });

  return matchedProduct?.image || fallbackImage || "";
}

export function getOrderItemThumbnail(item: ProductImageLookup) {
  return (
    getProductThumbnailById(item.productId) ||
    getProductThumbnailByName(item.name) ||
    item.image ||
    ""
  );
}
