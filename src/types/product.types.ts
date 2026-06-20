export interface VariantOption {
  id: string;
  name: string;
  extraPrice: number;
  image?: string;
  defaultValue?: string | number | boolean;
  value?: string | number;
  maxValue?: string | number;
  step?: number;
}

export interface VariantGroup {
  id: string;
  title: string;
  description: string;
  type: "SINGLE" | "MULTIPLE" | "ADJUSTMENT" | "QUANTITY";
  isRequired: boolean;
  options: VariantOption[];
}

export interface ProductFeature {
  id: string;
  name: string;
  icon?: string;
}

export interface ProductSales {
  freeShipping?: boolean;
  discount?: number;
  specialPrice?: number;
}

export interface ProductDescriptionSection {
  title: string;
  content: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  content: string;
  verifiedPurchase?: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  descriptionImages?: string[];
  descriptionSections?: ProductDescriptionSection[];
  reviews?: ProductReview[];
  video?: string;
  videoPoster?: string;
  variantGroups: VariantGroup[];
  features: string[];

  newMarked?: boolean;
  comingSoon?: boolean;
  sales?: ProductSales;

  categoryId: string;
  subCategoryId: string;
}
