import { Category, SubCategory } from "@/types/category.types";
import category05 from "@/static/category-05.png";
import category06 from "@/static/category-06.png";
import category07 from "@/static/category-07.png";
import category08 from "@/static/category-08.png";
import teaZipPouchIcon from "@/static/category-icons/tea-zip-pouch.png";
import teaBox25Icon from "@/static/category-icons/tea-box-25.png";
import teaBox20Icon from "@/static/category-icons/tea-box-20.png";
import blendedHerbalFlowerTeaIcon from "@/static/category-icons/blended-herbal-flower-tea.png";
import singleFlowerTeaIcon from "@/static/category-icons/single-flower-tea.png";
import herbalTherapyIcon from "@/static/category-icons/herbal-therapy.png";
import giftSetIcon from "@/static/category-icons/gift-set.png";

export const mockListOfCategory: Category[] = [
  {
    id: "vietnamese",
    name: "Tất cả sản phẩm",
    subCategoryIds: [
      "vietnamese-drinks",
      "vietnamese-food",
      "vietnamese-breakfast",
      "vietnamese-soup",
      "vietnamese-dessert",
      "vietnamese-snack",
      "vietnamese-vegetarian",
      "vietnamese-fastfood",
    ],
  },
  {
    id: "western",
    name: "Trà túi lọc",
    subCategoryIds: [
      "vietnamese-drinks",
      "vietnamese-food",
      "vietnamese-breakfast",
    ],
  },
  {
    id: "thailand",
    name: "Trà hoa thảo mộc",
    subCategoryIds: ["vietnamese-soup"],
  },
  {
    id: "japanese",
    name: "Trà hoa đơn",
    subCategoryIds: ["vietnamese-dessert"],
  },
  {
    id: "gift-set",
    name: "Bộ quà",
    subCategoryIds: ["vietnamese-vegetarian"],
  },
  {
    id: "herbal-therapy",
    name: "Thảo dược trị liệu",
    subCategoryIds: ["vietnamese-snack"],
  },
];

export const mockListOfSubCategory: SubCategory[] = [
  // Vietnamese subcategories
  {
    id: "vietnamese-drinks",
    name: "Trà túi zip",
    image: teaZipPouchIcon,
  },
  {
    id: "vietnamese-food",
    name: "Trà hộp 25 gói",
    image: teaBox25Icon,
  },
  {
    id: "vietnamese-breakfast",
    name: "Trà hộp 20 gói",
    image: teaBox20Icon,
  },
  {
    id: "vietnamese-soup",
    name: "Trà hoa thảo mộc",
    image: blendedHerbalFlowerTeaIcon,
  },
  {
    id: "vietnamese-dessert",
    name: "Trà hoa đơn",
    image: singleFlowerTeaIcon,
  },
  {
    id: "vietnamese-snack",
    name: "Thảo dược trị liệu",
    image: herbalTherapyIcon,
  },
  {
    id: "vietnamese-vegetarian",
    name: "Bộ quà",
    image: giftSetIcon,
  },
  {
    id: "vietnamese-fastfood",
    name: "Ăn nhanh",
    image: category08,
  },
  // Western subcategories
  {
    id: "western-steak",
    name: "Trà sức khỏe",
    image: teaZipPouchIcon,
  },
  {
    id: "western-pasta",
    name: "Trà thư giãn",
    image: teaBox25Icon,
  },
  {
    id: "western-burger",
    name: "Trà ngủ ngon",
    image: teaBox20Icon,
  },
  {
    id: "western-pizza",
    name: "Trà Tăng Đề Kháng ",
    image: blendedHerbalFlowerTeaIcon,
  },
  {
    id: "western-salad",
    name: "Trà Tăng Đề Kháng",
    image: category05,
  },
  {
    id: "western-breakfast",
    name: "Bữa sáng",
    image: category06,
  },
  {
    id: "western-dessert",
    name: "Tráng miệng",
    image: category07,
  },
  {
    id: "western-drinks",
    name: "Đồ uống",
    image: category08,
  },
  // Thailand subcategories
  {
    id: "thailand-soup",
    name: "Canh/Súp",
    image: teaZipPouchIcon,
  },
  {
    id: "thailand-noodles",
    name: "Món mì/phở",
    image: teaBox25Icon,
  },
  {
    id: "thailand-rice",
    name: "Cơm",
    image: teaBox20Icon,
  },
  {
    id: "thailand-salad",
    name: "Gỏi",
    image: blendedHerbalFlowerTeaIcon,
  },
  {
    id: "thailand-grilled",
    name: "Món nướng",
    image: category05,
  },
  {
    id: "thailand-curry",
    name: "Cà ri",
    image: category06,
  },
  {
    id: "thailand-seafood",
    name: "Hải sản",
    image: category07,
  },
  {
    id: "thailand-dessert",
    name: "Tráng miệng",
    image: category08,
  },
  // Japanese subcategories
  {
    id: "japanese-sushi",
    name: "Sushi/Sashimi",
    image: teaZipPouchIcon,
  },
  {
    id: "japanese-ramen",
    name: "Ramen",
    image: teaBox25Icon,
  },
  {
    id: "japanese-rice-bowl",
    name: "Cơm đậy",
    image: teaBox20Icon,
  },
  {
    id: "japanese-tempura",
    name: "Tempura",
    image: blendedHerbalFlowerTeaIcon,
  },
  {
    id: "japanese-grilled",
    name: "Món nướng",
    image: category05,
  },
  {
    id: "japanese-noodles",
    name: "Mì/Bún",
    image: category06,
  },
  {
    id: "japanese-dessert",
    name: "Tráng miệng",
    image: category07,
  },
  {
    id: "japanese-drinks",
    name: "Đồ uống",
    image: category08,
  },
];
