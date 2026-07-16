/**
 * Sinh backend/product-catalog.json TỪ CHÍNH nguồn dữ liệu của mini app
 * (src/services/product/product.mock.ts) để dữ liệu sản phẩm hiển thị trên
 * Admin Dashboard trùng khớp 100% với những gì mini app hiển thị: ảnh đại diện,
 * ảnh phụ, video, mô tả, quy cách (variantGroups)...
 *
 * Cách chạy:  node backend/scripts/generate-product-catalog.js
 * Chạy lại mỗi khi sửa product.mock.ts.
 */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const MOCK_PATH = path.join(ROOT, "src/services/product/product.mock.ts");
const OUT_PATH = path.join(ROOT, "backend/product-catalog.json");

function loadMockModule() {
  let source = fs.readFileSync(MOCK_PATH, "utf8");
  // Loại bỏ import type (chỉ chứa kiểu, không có runtime) để esbuild transform
  // không tạo require() tới alias "@/..." không phân giải được.
  source = source.replace(/^\s*import\s+[^;]*;\s*$/m, "");

  const { code } = esbuild.transformSync(source, {
    loader: "ts",
    format: "cjs",
    target: "es2019",
  });

  const moduleObj = { exports: {} };
  const context = {
    module: moduleObj,
    exports: moduleObj.exports,
    require,
    console,
  };
  vm.runInNewContext(code, context, { filename: "product.mock.ts" });
  return moduleObj.exports;
}

function main() {
  const mod = loadMockModule();
  const list = mod.mockListOfProduct;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Khong doc duoc mockListOfProduct tu product.mock.ts");
  }

  // Giữ đúng toàn bộ field mà mini app dùng. Không lược bớt để đảm bảo
  // Admin hiển thị y hệt mini app.
  const catalog = list
    .map((p) => ({
      id: Number(p.id),
      categoryId: p.categoryId || "",
      subCategoryId: p.subCategoryId || "",
      name: p.name || "",
      description: p.description || "",
      image: p.image || "",
      video: p.video || "",
      videoPoster: p.videoPoster || "",
      images: Array.isArray(p.images) ? p.images : [],
      descriptionImages: Array.isArray(p.descriptionImages) ? p.descriptionImages : [],
      descriptionSections: Array.isArray(p.descriptionSections) ? p.descriptionSections : [],
      price: Number(p.price || 0),
      listPrice: Number(p.listPrice || 0),
      sku: p.sku || "",
      variantGroups: Array.isArray(p.variantGroups) ? p.variantGroups : [],
      features: Array.isArray(p.features) ? p.features : [],
    }))
    .filter((p) => Number.isFinite(p.id))
    .sort((a, b) => a.id - b.id);

  fs.writeFileSync(OUT_PATH, JSON.stringify(catalog, null, 2), "utf8");
  const withVideo = catalog.filter((p) => p.video).length;
  const withImages = catalog.filter((p) => p.images.length).length;
  console.log(
    `Da sinh ${catalog.length} san pham -> ${path.relative(ROOT, OUT_PATH)} ` +
      `(co video: ${withVideo}, co anh phu: ${withImages})`,
  );
}

main();
