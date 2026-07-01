const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (_req, res) => {
  return res.json({
    inventory: db.getInventory(),
    productOverrides: db.getProductOverrides(),
    updatedAt: new Date().toISOString(),
  });
});

module.exports = router;
