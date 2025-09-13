const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../database");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    cb(null, allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// -----------------------------------------------
// GET all products for admin panel
// -----------------------------------------------
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products");
    res.status(200).json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch products", error: err.message });
  }
});

// -----------------------------------------------
// GET all products with optional filters (user site)
// -----------------------------------------------
router.get("/", async (req, res) => {
  const category = req.query.category;
  const classification = req.query.classification;

  try {
    let query = `
      SELECT DISTINCT 
        p.product_id, p.name, p.price, p.stock_quantity, p.created_at, 
        p.description, p.content, p.image_url,
        cat.background_color,
        cat.category_description,
        cat.category_image_url
      FROM products p
      INNER JOIN product_categories cat ON p.category_id = cat.category_id
      LEFT JOIN product_classification pc ON p.product_id = pc.product_id
      LEFT JOIN classification c ON pc.classification_id = c.classification_id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += " AND cat.category_name = ?";
      params.push(category);
    }

    if (classification) {
      query += " AND c.classification_name = ?";
      params.push(classification);
    }

    query += " ORDER BY p.created_at DESC";

    const [products] = await db.query(query, params);

    const productIds = products.map((p) => p.product_id);
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const [classifications] = await db.query(
        `SELECT pc.product_id, c.classification_name 
         FROM product_classification pc
         JOIN classification c ON pc.classification_id = c.classification_id
         WHERE pc.product_id IN (${placeholders})`,
        productIds
      );

      const classificationMap = {};
      classifications.forEach(({ product_id, classification_name }) => {
        if (!classificationMap[product_id]) classificationMap[product_id] = [];
        classificationMap[product_id].push(classification_name);
      });

      products.forEach((p) => {
        p.classifications = classificationMap[p.product_id] || [];
      });
    }

    res.json({ success: true, total: products.length, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch products", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  try {
    const [rows] = await db.query(
      `SELECT product_id, name, price, stock_quantity, description, content, image_url,
              jan_code, purpose, raw_materials,
              country_of_origin, package_size, package_weight,
              product_size, product_weight, category_id
       FROM products
       WHERE product_id = ?
       LIMIT 1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error", error: err.message });
  }
});

router.post("/add", upload.single("image"), async (req, res) => {
  const {
    name = "", price = "", stock_quantity = "", category_id = "",
    description = "", content = "", jan_code = "", purpose = "",
    raw_materials = "", country_of_origin = "",
    package_size = "", package_weight = "",
    product_size = "", product_weight = ""
  } = req.body;

  if (!name || !price || !stock_quantity || !category_id) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Validate category exists
  const [[catExist]] = await db.query(
    "SELECT 1 FROM product_categories WHERE category_id = ?",
    [category_id]
  );
  if (!catExist) {
    return res.status(400).json({ success: false, message: "Invalid category_id" });
  }

  const imageUrl = req.file ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` : null;

  try {
    const [result] = await db.query(
      `INSERT INTO products
        (name, description, content, price, stock_quantity,
         purpose, category_id, image_url, jan_code,
         raw_materials, country_of_origin,
         package_size, package_weight,
         product_size, product_weight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, content, price, stock_quantity,
       purpose, category_id, imageUrl, jan_code,
       raw_materials, country_of_origin,
       package_size, package_weight,
       product_size, product_weight]
    );
    res.status(201).json({ success: true, message: "Product added", product_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error", error: err.message });
  }
});

// Update product – PUT /update/:id
router.put("/update/:id", upload.single("image"), async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id <= 0) return res.status(400).json({ success: false, message: "Invalid product ID" });

  const {
    name = "", price = "", stock_quantity = "", category_id = "",
    description = "", content = "", jan_code = "", purpose = "",
    raw_materials = "", country_of_origin = "",
    package_size = "", package_weight = "",
    product_size = "", product_weight = ""
  } = req.body;

  if (!name || !price || !stock_quantity || !category_id) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const [[catExist]] = await db.query(
    "SELECT 1 FROM product_categories WHERE category_id = ?",
    [category_id]
  );
  if (!catExist) {
    return res.status(400).json({ success: false, message: "Invalid category_id" });
  }

  const imageUrl = req.file ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` : null;

  try {
    await db.query(
      `UPDATE products SET
         name=?, description=?, content=?, price=?, stock_quantity=?,
         purpose=?, category_id=?, image_url=?, jan_code=?, raw_materials=?,
         country_of_origin=?, package_size=?, package_weight=?,
         product_size=?, product_weight=?
       WHERE product_id=?`,
      [name, description, content, price, stock_quantity,
       purpose, category_id, imageUrl, jan_code, raw_materials,
       country_of_origin, package_size, package_weight,
       product_size, product_weight, id]
    );
    res.json({ success: true, message: "Product updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error", error: err.message });
  }
});

// DELETE product
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  try {
    await db.query("DELETE FROM products WHERE product_id = ?", [id]);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error", error: err.message });
  }
});

module.exports = router;
