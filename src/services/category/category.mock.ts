import { Category, SubCategory } from "@/types/category.types";
import teaZipPouchIcon from "@/static/category-icons/tea-zip-pouch.png";
import teaBox25Icon from "@/static/category-icons/tea-box-25.png";
import teaBox20Icon from "@/static/category-icons/tea-box-20.png";
import blendedHerbalFlowerTeaIcon from "@/static/category-icons/blended-herbal-flower-tea.png";
import singleFlowerTeaIcon from "@/static/category-icons/single-flower-tea.png";
import herbalTherapyIcon from "@/static/category-icons/herbal-therapy.png";
import giftSetIcon from "@/static/category-icons/gift-set.png";

export const mockListOfCategory: Category[] = [
  {
    id: "all",
    name: "Tất cả sản phẩm",
    subCategoryIds: [
      "tra-tui-zip",
      "tra-hop-25",
      "tra-hop-20",
      "tra-hoa-thao-moc",
      "tra-hoa-don",
      "thao-duoc-tri-lieu",
      "bo-qua",
    ],
  },
  {
    id: "tra-tui-loc",
    name: "Trà túi lọc",
    subCategoryIds: [
      "tra-tui-zip",
      "tra-hop-25",
      "tra-hop-20",
    ],
  },
  {
    id: "tra-hoa-thao-moc",
    name: "Trà hoa thảo mộc",
    subCategoryIds: ["tra-hoa-thao-moc"],
  },
  {
    id: "tra-hoa-don",
    name: "Trà hoa đơn",
    subCategoryIds: ["tra-hoa-don"],
  },
  {
    id: "bo-qua",
    name: "Bộ quà",
    subCategoryIds: ["bo-qua"],
  },
  {
    id: "thao-duoc-tri-lieu",
    name: "Thảo dược trị liệu",
    subCategoryIds: ["thao-duoc-tri-lieu"],
  },
];

export const mockListOfSubCategory: SubCategory[] = [
  {
    id: "tra-tui-zip",
    name: "Trà túi zip",
    image: teaZipPouchIcon,
  },
  {
    id: "tra-hop-25",
    name: "Trà hộp 25 gói",
    image: teaBox25Icon,
  },
  {
    id: "tra-hop-20",
    name: "Trà hộp 20 gói",
    image: teaBox20Icon,
  },
  {
    id: "tra-hoa-thao-moc",
    name: "Trà hoa thảo mộc",
    image: blendedHerbalFlowerTeaIcon,
  },
  {
    id: "tra-hoa-don",
    name: "Trà hoa đơn",
    image: singleFlowerTeaIcon,
  },
  {
    id: "thao-duoc-tri-lieu",
    name: "Thảo dược trị liệu",
    image: herbalTherapyIcon,
  },
  {
    id: "bo-qua",
    name: "Bộ quà",
    image: giftSetIcon,
  },
];
