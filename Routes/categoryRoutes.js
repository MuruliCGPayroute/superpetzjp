const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
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
const upload = multer({ storage });

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM product_categories');
    res.json({ success: true, categories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Fetch error', error: err.message });
  }
});

// GET single category by ID
router.get('/categories/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM product_categories WHERE category_id = ?',
      [req.params.id]
    );
    if (rows.length) res.json({ success: true, category: rows[0] });
    else res.status(404).json({ success: false, message: 'Not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Fetch error', error: err.message });
  }
});

// CREATE category with image
router.post('/add', upload.single('category_image'), async (req, res) => {
  try {
    const { category_name, category_description } = req.body;
    const category_image_url = req.file?.filename || null;
    if (!category_name || !category_description) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    const [result] = await db.query(
      'INSERT INTO product_categories (category_name, category_description, category_image_url) VALUES (?, ?, ?)',
      [category_name, category_description, category_image_url]
    );
    res.status(201).json({ success: true, category_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Insert error', error: err.message });
  }
});

// UPDATE category with optional image
router.put('/categories/:id', upload.single('category_image'), async (req, res) => {
  const { category_name, category_description } = req.body;
  const category_image_url = req.file?.filename || null;

  if (!category_name || !category_description) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    let sql = 'UPDATE product_categories SET category_name = ?, category_description = ?';
    const params = [category_name, category_description];

    if (category_image_url) {
      sql += ', category_image_url = ?';
      params.push(category_image_url);
    }

    sql += ' WHERE category_id = ?';
    params.push(req.params.id);

    const [result] = await db.query(sql, params);
    if (result.affectedRows) res.json({ success: true });
    else res.status(404).json({ success: false, message: 'Not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update error', error: err.message });
  }
});

// DELETE
router.delete('/categories/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM product_categories WHERE category_id = ?', [req.params.id]);
    res.json({ success: !!result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Delete error', error: err.message });
  }
});

module.exports = router;
