const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const router = express.Router();

function getProductCatalog() {
  const bundledCatalogPath = path.resolve(__dirname, "../product-catalog.json");
  if (!fs.existsSync(bundledCatalogPath)) return [];
  try {
    const rawCatalog = fs.readFileSync(bundledCatalogPath, "utf8");
    return JSON.parse(rawCatalog);
  } catch (err) {
    return [];
  }
}

router.get("/", (_req, res) => {
  return res.json({
    inventory: db.getInventory(),
    productOverrides: db.getProductOverrides(),
    updatedAt: new Date().toISOString(),
  });
});

router.get("/products", (_req, res) => {
  try {
    const inventory = db.getInventory();
    const overrides = db.getProductOverrides();
    const catalog = getProductCatalog();
    
    const products = catalog.map((p) => {
      const override = overrides[String(p.id)] || {};
      const entry = inventory[String(p.id)] || {};
      return {
        ...p,
        ...override,
        stock: entry.stock ?? null,
        enabled: entry.enabled !== false,
        visible: entry.visible !== false,
      };
    });

    return res.json({ products });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
