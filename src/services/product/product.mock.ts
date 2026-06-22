import { Product, ProductFeature } from "@/types/product.types";

export const mockProductFeature: ProductFeature[] = [
  {
    id: "liver-support",
    name: "Bổ Gan",
  },
  {
    id: "cancer-prevention",
    name: "Phòng Ung Thư",
  },
  {
    id: "hangover-relief",
    name: "Giải Rượu",
  },
  {
    id: "sleep-support",
    name: "An Thần Ngủ Ngon",
  },
  {
    id: "bestseller",
    name: "Bán chạy",
  },
];

const rawMockListOfProduct: Product[] = [
  // ========== VIETNAMESE CATEGORY ==========
  // Vietnamese - Drinks
  {
    id: 1,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-drinks",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-1.png",
    name: "Trà Xạ Đen Túi Zip - Phòng Ngừa Ung Thư, Hỗ Trợ Chức Năng Gan",
    description:
      "Trà xạ đen được đóng túi lọc tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-25",
            name: "Túi 25 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 25 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-25-goi.webp",
          },
          {
            id: "package-50",
            name: "Túi 50 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 50 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-50-goi.webp",
          },
        ],
      },
    ],
    features: ["cancer-prevention", "bestseller"],
  },
  {
    id: 2,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-drinks",
    //image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Cà Gai leo Túi Zip - Mát Gan, Giải Độc Gan, Thanh Lọc Cơ Thể",
    description:
      "Trà cà gai leo được đóng túi lọc tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-25",
            name: "Túi 25 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 25 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-variant-01-01.webp",
          },
          {
            id: "package-50",
            name: "Túi 50 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 50 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p02-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["liver-support", "bestseller"],
  },
  {
    id: 3,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-drinks",
    //image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Dây Túi Zip - Diệt Vi Khuẩn HP, Giảm Viêm Loét Dạ Dày",
    description:
      "Trà dây được đóng túi lọc tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-25",
            name: "Túi 25 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 25 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-variant-01-01.webp",
          },
          {
            id: "package-50",
            name: "Túi 50 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 50 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p03-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["hangover-relief"],
  },
  {
    id: 4,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-drinks",
    //image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Chùm Ngây Túi Zip - Chống Lão Hóa, Bổ Sung Dưỡng Chất",
    description:
      "Trà chùm ngây được đóng túi lọc tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-25",
            name: "Túi 25 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 25 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-variant-01-01.webp",
          },
          {
            id: "package-50",
            name: "Túi 50 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 50 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p04-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: [],
  },
  {
    id: 5,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-drinks",
    //image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Đinh Lăng Túi Zip - Hoạt Huyết Dưỡng Não, Giúp Ngủ Ngon",
    description:
      "Trà đinh lăng được đóng túi lọc tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-25",
            name: "Túi 25 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 25 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-variant-01-01.webp",
          },
          {
            id: "package-50",
            name: "Túi 50 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 50 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p05-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["sleep-support"],
  },
  {
    id: 6,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-drinks",
    //image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Nhàu Túi Zip - Giúp Giảm Viêm, Giảm Đau Nhức Xương Khớp",
    description:
      "Trà nhàu được đóng túi lọc tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-25",
            name: "Túi 25 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 25 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-variant-01-01.webp",
          },
          {
            id: "package-50",
            name: "Túi 50 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 50 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p06-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: [],
  },
  // Vietnamese - Food (Món chính)
  {
    id: 7,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Xạ Đen H25 - Phòng Ngừa Ung Thư, Hỗ Trợ Chức Năng Gan",
    description:
      "Trà xạ đen được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p07-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [],
    features: ["cancer-prevention", "bestseller"],
    sales: {
      discount: 15,
    },
  },
  {
    id: 8,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Cà Gai Leo Hộp 25 Gói - Mát Gan, Giải Độc Gan, Thanh Lọc Cơ Thể",
    description:
      "Trà cà gai leo được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p08-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [],
    features: ["liver-support"],
  },
  {
    id: 9,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Dây Hộp 25 Gói - Diệt Vi Khuẩn HP, Giảm Viêm Loét Dạ Dày",
    description:
      "Trà dây được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p09-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [],
    features: ["hangover-relief"],
  },
  {
    id: 10,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Chùm Ngây Hộp 25 Gói - Chống Lão Hóa, Bổ Sung Dưỡng Chất",
    description:
      "Trà chùm ngây được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p10-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 11,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Đinh Lăng Hộp 25 Gói - Hoạt Huyết Dưỡng Não, Giúp Ngủ Ngon",
    description:
      "Trà đinh lăng được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p11-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 12,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Nhàu Hộp 25 Gói - Giúp Giảm Viêm, Giảm Đau Nhức Xương Khớp",
    description:
      "Trà nhàu được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p12-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 25 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  // Trà thảo mộc hộp 20 gói
  {
    id: 13,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Xạ Đen Hộp 20 Gói - Phòng Ngừa Ung Thư, Hỗ Trợ Chức Năng Gan",
    description:
      "Trà xạ đen hộp 20 được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p13-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách hộp 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["cancer-prevention"],
  },
  {
    id: 14,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Chùm Ngây Hộp 20 Gói - Chống Lão Hóa, Bổ Sung Dưỡng Chất",
    description:
      "Trà chùm ngây hộp 20 được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p14-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách hộp 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 15,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Đinh Lăng Hộp 20 Gói - Hoạt Huyết Dưỡng Não, Giúp Ngủ Ngon",
    description:
      "Trà đinh lăng được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p15-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["sleep-support"],
  },
  {
    id: 16,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Tim Sen Hộp 20 Gói - An Thần, Giúp Ngủ Ngon, Bảo Vệ Tim Mạch",
    description:
      "Trà tim sen shan tuyết cổ thụ được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p16-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["sleep-support", "bestseller"],
  },
  {
    id: 17,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Nhàu Hộp 20 Gói - Giúp Giảm Viêm, Giảm Đau Nhức Xương Khớp",
    description:
      "Trà nhàu được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p17-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 18,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Lục Trà Hoa Nhài Hộp 20 Gói - Thanh Nhiệt, Thư Giãn Đầu Óc",
    description:
      "Trà lục trà hoa nhài được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p18-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 19,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Hồng Trà Hộp 20 Gói - Hỗ Trợ Tim Mạch, Giúp Tỉnh Táo",
    description:
      "Hồng trà được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p19-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 20,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-breakfast",
    // image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-2.png",
    name: "Trà Sâm Tiên Mao Hộp 20 Gói - Bồi Bổ Sức Khỏe, Tăng Cường Sinh Lực",
    description:
      "Trà Sâm Tiên Mao được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p20-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [],
    features: ["ice"],
  },
  // Trà Hoa Mix
  {
    id: 21,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-soup",
    //  image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-5.png",
    name: "Đông Trùng Tứ Vị Trà - Bồi Bổ Cơ Thể, Nâng Cao Sức Đề Kháng",
    description:
      "Đông Trùng Tứ Vị Trà được sấy lạnh giữ nguyên hương vị và công dụng của thảo dược, đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-10",
            name: "Túi 10 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 10 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-variant-01-01.webp",
          },
          {
            id: "package-20",
            name: "Túi 20 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 20 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p21-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["hot"],
  },
  {
    id: 22,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-soup",
    //  image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-5.png",
    name: "Dưỡng Nhan Thất Vị Trà - Dưỡng Nhan, Làm Đẹp Da, Chống Lão Hóa",
    description:
      "Dưỡng Nhan Thất Vị Trà được sấy lạnh giữ nguyên hương vị và công dụng của thảo dược, đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-10",
            name: "Túi 10 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 10 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-variant-01-01.webp",
          },
          {
            id: "package-20",
            name: "Túi 20 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 20 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p22-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["hot"],
  },
  {
    id: 23,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-soup",
    //  image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-5.png",
    name: "Gạo Lứt Bát Vị Trà - Thanh Nhiệt, Giải Độc, Giảm Cân Đẹp Dáng",
    description:
      "Gạo Lứt Bát Vị Trà được sấy lạnh giữ nguyên hương vị và công dụng của thảo dược, đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-10",
            name: "Túi 10 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 10 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-variant-01-01.webp",
          },
          {
            id: "package-20",
            name: "Túi 20 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 20 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p23-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["hot"],
  },
  {
    id: 24,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-soup",
    //  image: "https://h5.zadn.vn/static/zaui-templates/zaui-coffee-and-food/product-5.png",
    name: "Trà Giảm Cân - Đốt Cháy Mỡ Thừa, Hỗ Trợ Giảm Cân An Toàn",
    description:
      "Trà Giảm Cân được sấy lạnh giữ nguyên hương vị và công dụng của thảo dược, đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-09.webp",
    ],
    // Giá cơ bản của quy cách 20 gói.
    price: 99000,
    variantGroups: [
      {
        id: "package-size",
        title: "Quy cách sản phẩm",
        description: "Chọn số lượng gói trà",
        type: "SINGLE",
        isRequired: true,
        options: [
          {
            id: "package-10",
            name: "Túi 10 gói",
            extraPrice: 0,
            // Thay bằng ảnh thật của túi 10 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-variant-01-01.webp",
          },
          {
            id: "package-20",
            name: "Túi 20 gói",
            // Tổng giá = price + extraPrice.
            extraPrice: 80000,
            // Thay bằng ảnh thật của túi 20 gói.
            image:
              "https://deltadasia.com/wp-content/uploads/2026/06/zma-p24-shopee-variant-01-02.webp",
          },
        ],
      },
    ],
    features: ["hot"],
  },
  // Trà Hoa Đơn
  {
    id: 25,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-dessert",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p25-shopee-09.webp",
    ],
    name: "Trà hoa Atiso Đỏ - Mát Gan, Hỗ Trợ Tiêu Hóa, Đẹp Da",
    description:
      "Trà hoa atiso đỏ được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    // Giá cơ bản của quy cách túi 100g.
    price: 89000,
    variantGroups: [],
    features: ["liver-support"],
  },
  {
    id: 26,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-dessert",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p26-shopee-09.webp",
    ],
    name: "Trà hoa Cúc - Thanh Nhiệt, Giải Độc, Giúp Ngủ Ngon",
    description:
      "Trà hoa cúc được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    // Giá cơ bản của quy cách túi 100g.
    price: 89000,
    variantGroups: [],
    features: ["sleep-support", "bestseller"],
  },
  {
    id: 27,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-dessert",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p27-shopee-09.webp",
    ],
    name: "Trà hoa Nhài - Thanh Nhiệt, Thư Giãn Đầu Óc",
    description:
      "Trà hoa nhài được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    // Giá cơ bản của quy cách túi 100g.
    price: 89000,
    variantGroups: [],
    features: ["sleep-support"],
  },
  {
    id: 28,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-dessert",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p28-shopee-09.webp",
    ],
    name: "Trà hoa Hồng - Dưỡng Nhan, Đẹp Da, Giảm Căng Thẳng",
    description:
      "Trà hoa hồng được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    // Giá cơ bản của quy cách túi 100g.
    price: 89000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 29,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-dessert",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p29-shopee-09.webp",
    ],
    name: "Trà hoa Mẫu Đơn - Chống Lão Hóa, Đẹp Da, Thư Giãn",
    description:
      "Trà hoa mẫu đơn được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    // Giá cơ bản của quy cách túi 100g.
    price: 89000,
    variantGroups: [],
    features: ["ice"],
  },
  {
    id: 30,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-dessert",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p30-shopee-09.webp",
    ],
    name: "Trà hoa Đậu Biếc - Chống Lão Hóa, Đẹp Da, Sáng Mắt",
    description:
      "Trà hoa đậu biếc được đóng hộp tiện lợi, phù hợp để sử dụng hằng ngày.",
    // Thay bằng ảnh đại diện thật của sản phẩm.
    // Giá cơ bản của quy cách túi 100g.
    price: 89000,
    variantGroups: [],
    features: ["ice"],
  },
  // Thảo dược trị liệu
  {
    id: 31,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-snack",
    description:
      "Đai chườm đầu gối thảo dược có tác dụng giảm đau nhức xương khớp, hỗ trợ lưu thông khí huyết",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-dai-chuom-dau-goi-thao-duoc-300x300.jpg?v=20260619-1",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-dai-chuom-dau-goi-thao-duoc-300x300.jpg?v=20260619-1",
    ],
    name: "Cặp Đai chườm đầu gối thảo dược - Giảm Đau Nhức, Hỗ Trợ Lưu Thông Khí Huyết",
    price: 280000,
    variantGroups: [],
    features: ["hot"],
  },
  {
    id: 32,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-snack",
    description:
      "Túi chườm mắt thảo dược có tác dụng giảm nhức mỏi mắt, hỗ trợ lưu thông khí huyết",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-06.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-07.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-08.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p32-shopee-09.webp",
    ],
    name: "Túi chườm mắt thảo dược - Giảm Nhức Mỏi Mắt, Hỗ Trợ Lưu Thông Khí Huyết",
    price: 150000,
    variantGroups: [],
    features: ["sleep-support"],
  },
  {
    id: 33,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-snack",
    description:
      "Gối chườm thảo dược có tác dụng giảm đau nhức vùng cổ, vai, gáy, hỗ trợ lưu thông khí huyết",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p33-shopee-06.webp",
    ],
    name: "Gối chườm thảo dược - Giảm Đau Nhức Vai Gáy, Lưu Thông Khí Huyết",
    price: 300000,
    variantGroups: [],
    features: ["hot"],
  },
  // Bộ quà thảo dược
  {
    id: 34,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-vegetarian",
    description:
      "Hộp quà Trà Sức Khỏe với 3 loại trà thảo dược tốt cho sức khỏe cùng 2 hủ hạt dinh dưỡng",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-bo-qua-tra-suc-khoe.webp",
    name: "Hộp quà Trà Sức Khỏe - Hộp Quà Cao Cấp, Chăm Sóc Sức Khỏe",
    price: 512000,
    variantGroups: [],
    features: ["vegetarian", "hot"],
  },
  {
    id: 35,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-vegetarian",
    description:
      "Bộ Quà Da Cao Cấp - Báu Vật Từ Thiên Nhiên bao gồm 5 loại trà thượng hạng thuộc dòng Trà Cổ Việt, thu hái ở dãy Tây Côn Lĩnh, tỉnh Hà Giang",
    image:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-01.webp",
    video:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-video.mp4",
    videoPoster:
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-video-poster.webp",
    images: [
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-01.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-02.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-03.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-04.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-05.webp",
      "https://deltadasia.com/wp-content/uploads/2026/06/zma-p35-shopee-06.webp",
    ],
    name: "Bộ Quà Da Cao Cấp - Báu Vật Từ Thiên Nhiên - Hộp Quà Cao Cấp Thượng Hạng",
    price: 0,
    comingSoon: true,
    variantGroups: [],
    features: ["vegetarian", "hot"],
  },
  {
    // TEMP TEST PRODUCT: remove after checkout verification is finished.
    id: 999001,
    categoryId: "vietnamese",
    subCategoryId: "vietnamese-food",
    image: "/temp/test-product.svg",
    images: ["/temp/test-product.svg"],
    description:
      "San pham test tam thoi de kiem tra quy trinh dat hang va thanh toan. Khi mua san pham nay he thong se mien phi van chuyen.",
    name: "test",
    price: 2000,
    variantGroups: [],
    features: ["bestseller"],
    sales: {
      freeShipping: true,
    },
  },
];

const categoryBySubCategory: Record<string, string> = {
  "vietnamese-drinks": "western",
  "vietnamese-food": "western",
  "vietnamese-breakfast": "western",
  "vietnamese-soup": "thailand",
  "vietnamese-dessert": "japanese",
  "vietnamese-snack": "herbal-therapy",
  "vietnamese-vegetarian": "gift-set",
};

const reviewAuthors = [
  "n*****h",
  "t*****8",
  "m*****n",
  "h*****g",
  "l*****a",
  "p*****2",
  "a*****i",
  "k*****9",
  "v*****m",
  "d*****7",
];

const reviewContents = [
  "Đóng gói cẩn thận, sản phẩm đúng như hình. Mùi thơm dễ chịu, sẽ tiếp tục ủng hộ.",
  "Hàng nhận đủ và bao bì đẹp. Đơn vị vận chuyển giao hơi lâu một chút nhưng sản phẩm vẫn tốt.",
  "Sản phẩm nhìn sạch sẽ, hướng dẫn rõ ràng. Ship không gọi trước nhưng hàng bên trong không bị ảnh hưởng.",
  "Mình đã mua lần thứ hai, chất lượng ổn định. Hộp ngoài hơi móp nhẹ do vận chuyển.",
  "Gói trà tiện sử dụng, đóng gói chắc chắn. Giao hàng chậm hơn dự kiến một ngày.",
  "Hàng đúng phân loại đã chọn, hình ảnh và sản phẩm thực tế giống nhau.",
  "Shop chuẩn bị hàng nhanh. Túi giao bên ngoài hơi nhăn nhưng bao bì sản phẩm vẫn nguyên vẹn.",
  "Mùi vị vừa phải, dễ dùng hằng ngày. Nhân viên giao hàng để hàng ở lễ tân mà chưa gọi.",
  "Sản phẩm có tem nhãn đầy đủ, hạn sử dụng còn dài. Trải nghiệm tổng thể tốt.",
  "Đóng gói đẹp và sạch. Thùng vận chuyển có một góc bị móp nhưng sản phẩm không sao.",
  "Nhận hàng đầy đủ, chất lượng đúng mong đợi. Thời gian giao hàng có thể nhanh hơn.",
  "Bao bì chỉn chu, sản phẩm phù hợp để dùng và làm quà tặng.",
];

function createProductReviews(productId: number) {
  return reviewAuthors.map((author, index) => ({
    id: `${productId}-${index + 1}`,
    author,
    rating: 5 as const,
    date: `${String(((productId + index) % 27) + 1).padStart(2, "0")}/06/2026`,
    content:
      reviewContents[(productId * 3 + index * 5) % reviewContents.length],
  }));
}

function createDescriptionSections(product: Product) {
  const formatDescription =
    product.subCategoryId === "vietnamese-drinks"
      ? "Túi zip tiện bảo quản, có lựa chọn quy cách theo phân loại."
      : product.subCategoryId === "vietnamese-food" ||
          product.subCategoryId === "vietnamese-breakfast"
        ? "Trà túi lọc đóng hộp, thuận tiện pha và sử dụng hằng ngày."
        : product.subCategoryId === "vietnamese-dessert"
          ? "Hoa trà được chọn lọc và đóng gói để giữ hương thơm tự nhiên."
          : product.subCategoryId === "vietnamese-snack"
            ? "Sản phẩm thảo dược trị liệu dùng theo hướng dẫn trên bao bì."
            : product.subCategoryId === "vietnamese-vegetarian"
              ? "Bộ quà được phối hợp và đóng gói trang trọng."
              : "Sản phẩm trà thảo mộc phối hợp nhiều nguyên liệu.";

  return [
    {
      title: "Thông tin sản phẩm",
      content: `${product.description} ${formatDescription}`,
    },
    {
      title: "Thương hiệu và xuất xứ",
      content:
        "Thương hiệu Sunbeleaf. Sản phẩm được đóng gói tại Việt Nam, thông tin lô sản xuất và hạn dùng thể hiện trên bao bì.",
    },
    {
      title: "Hướng dẫn sử dụng",
      content:
        "Sử dụng theo hướng dẫn in trên bao bì. Điều chỉnh lượng nước và thời gian pha theo khẩu vị cá nhân.",
    },
    {
      title: "Bảo quản",
      content:
        "Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Đóng kín bao bì sau khi mở.",
    },
    {
      title: "Lưu ý",
      content:
        "Thông tin về công dụng chỉ mang tính tham khảo. Sản phẩm không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.",
    },
  ];
}

export const mockListOfProduct: Product[] = rawMockListOfProduct.map(
  (product) => ({
    ...product,
    categoryId:
      categoryBySubCategory[product.subCategoryId] ?? product.categoryId,
    descriptionImages: Array.from(
      new Set(
        (product.images?.length ? product.images : [product.image]).filter(
          Boolean,
        ),
      ),
    ),
    descriptionSections: createDescriptionSections(product),
    reviews: createProductReviews(product.id),
  }),
);

