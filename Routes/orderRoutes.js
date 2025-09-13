const express = require('express');
const router = express.Router();
const db = require('../database');


router.get('/get-user', (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, message: "Not logged in" });
  }
});

router.post('/place-order', async(req, res) => {
    const {user_id, address, payment_method, total_amount, currency, cart_items} = req.body;

    try {
        let payment_status = payment_method === "COD" ? "pending" : "paid";

        const [result] = await db.query ('INSERT INTO payments (user_id, amount, currency, payment_status, razorpay_order_id) VALUES (?, ?, ?, ?, ?)',
            [user_id, total_amount, currency, payment_status, JSON.stringify(address)]
        );

        const payment_id = result.insertId;

        for (const item of cart_items) {
            await db.query("INSERT INTO order_items (payment_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", 
                [payment_id, item.product_id, item.quantity, item.price]
            )
        }

        await db.query("DELETE FROM cart_items WHERE user_id = ?", [user_id]);
        res.json({success : true, message : 'Order Placed Successfully', payment_id});
    } catch (error) {
        console.error("Error Placing Order:", error);
        res.status(500).json({success : false, message : 'Unable to Place Order'});
    }
})

module.exports = router;