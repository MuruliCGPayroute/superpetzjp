const express = require("express");
const db = require("../database");
const router = express.Router();

const isAuthenticated = (req, res, next) => {
  if (req.session?.user?.user_id) {
    next();
  } else {
    res.status(403).json({ success: false, msg: "Not authenticated" });
  }
};

// POST /api/cart - add or increment quantity
router.post("/", isAuthenticated, async (req, res) => {
  const user_id = req.session.user.user_id;
  const { product_id, quantity } = req.body;

  if (!product_id || typeof quantity !== "number") {
    return res.status(400).json({ success: false, msg: "Missing or invalid product_id or quantity" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
      [user_id, product_id]
    );

    if (rows.length > 0) {
      const newQty = rows[0].quantity + quantity;
      await db.execute(
        "UPDATE cart_items SET quantity = ?, added_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?",
        [newQty, user_id, product_id]
      );
      return res.json({ success: true, msg: "Cart item quantity updated" });
    } else {
      await db.execute(
        "INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        [user_id, product_id, quantity]
      );
      return res.status(201).json({ success: true, msg: "Item added to cart" });
    }
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ success: false, msg: "Database error" });
  }
});

// PUT /api/cart - set exact quantity
router.put("/", isAuthenticated, async (req, res) => {
  const user_id = req.session.user.user_id;
  const { product_id, quantity } = req.body;

  if (!product_id || typeof quantity !== "number" || quantity < 1) {
    return res.status(400).json({ success: false, msg: "Invalid product_id or quantity" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
      [user_id, product_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, msg: "Item not found in cart" });
    }

    await db.execute(
      "UPDATE cart_items SET quantity = ?, added_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?",
      [quantity, user_id, product_id]
    );

    return res.json({ success: true, msg: "Quantity updated" });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ success: false, msg: "Database error" });
  }
});

// DELETE /api/cart - remove one item
router.delete("/", isAuthenticated, async (req, res) => {
  const user_id = req.session.user.user_id;
  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ success: false, msg: "Missing product_id" });
  }

  try {
    await db.execute(
      "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
      [user_id, product_id]
    );
    return res.json({ success: true, msg: "Item removed from cart" });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ success: false, msg: "Delete failed" });
  }
});

// DELETE /api/cart/all - clear entire cart for user
router.delete("/all", isAuthenticated, async (req, res) => {
  const user_id = req.session.user.user_id;
  try {
    await db.execute("DELETE FROM cart_items WHERE user_id = ?", [user_id]);
    return res.json({ success: true, msg: "Cart cleared" });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ success: false, msg: "Failed to clear cart" });
  }
});

// GET /api/cart - get cart items
router.get("/", isAuthenticated, async (req, res) => {
  const user_id = req.session.user.user_id;

  try {
    const [results] = await db.execute(
      `SELECT ci.cart_item_id, ci.product_id, ci.quantity, ci.added_at,
              p.name, p.price, p.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.product_id
       WHERE ci.user_id = ?
       ORDER BY ci.added_at DESC`,
      [user_id]
    );

    return res.json({ success: true, items: results });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ success: false, msg: "Database error" });
  }
});

module.exports = router;