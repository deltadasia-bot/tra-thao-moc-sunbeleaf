import { mockListOfCategory, mockListOfSubCategory } from "./category.mock";
import { getProductRemoteConfig } from "../product/product.api";
import blendedHerbalFlowerTeaIcon from "@/static/category-icons/blended-herbal-flower-tea.png";

export const categoryService = {
  getCategories: async () => {
    try {
      const { productOverrides } = await getProductRemoteConfig();
      const categories = [...mockListOfCategory];

      Object.values(productOverrides).forEach((override: any) => {
        if (override.categoryId && override.categoryName) {
          const existing = categories.find((c) => c.id === override.categoryId);
          if (!existing) {
            categories.push({
              id: override.categoryId,
              name: override.categoryName,
              subCategoryIds: [],
            });
          }
        }
      });

      Object.values(productOverrides).forEach((override: any) => {
        if (override.categoryId && override.subCategoryId) {
          const cat = categories.find((c) => c.id === override.categoryId);
          if (cat && !cat.subCategoryIds.includes(override.subCategoryId)) {
            cat.subCategoryIds = [...cat.subCategoryIds, override.subCategoryId];
          }
        }
      });

      return categories;
    } catch (e) {
      return mockListOfCategory;
    }
  },

  getSubCategories: async (categoryId: string) => {
    try {
      const { productOverrides } = await getProductRemoteConfig();
      const subCategories = [...mockListOfSubCategory];

      Object.values(productOverrides).forEach((override: any) => {
        if (override.subCategoryId && override.subCategoryName) {
          const existing = subCategories.find((s) => s.id === override.subCategoryId);
          if (!existing) {
            subCategories.push({
              id: override.subCategoryId,
              name: override.subCategoryName,
              image: blendedHerbalFlowerTeaIcon,
            });
          }
        }
      });

      const categories = await categoryService.getCategories();
      const category = categories.find((c) => c.id === categoryId);

      return subCategories.filter((subCategory) =>
        category?.subCategoryIds?.includes(subCategory.id),
      );
    } catch (e) {
      const category = mockListOfCategory.find((c) => c.id === categoryId);
      return mockListOfSubCategory.filter((subCategory) =>
        category?.subCategoryIds?.includes(subCategory.id),
      );
    }
  },
};
