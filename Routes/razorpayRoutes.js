// routes/razorpay.js
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../database'); // your DB helper
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

// Create order endpoint
router.post('/create-order', async (req, res) => {
  const { amount, currency, user_id } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}`
    });

    await db.query(
      `INSERT INTO payments (user_id, razorpay_order_id, amount, currency, payment_status)
       VALUES (?, ?, ?, ?, 'created')`,
      [user_id, order.id, amount, currency]
    );

    res.json(order);
  } catch (err) {
    console.error('Order creation failed', err);
    res.status(500).json({ success: false, message: 'Order creation failed' });
  }
});

// Verify payment endpoint
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected === razorpay_signature) {
    await db.query(
      `UPDATE payments SET razorpay_payment_id = ?, razorpay_signature = ?, payment_status = 'paid'
       WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );
    res.json({ success: true });
  } else {
    await db.query(
      `UPDATE payments SET payment_status = 'failed' WHERE razorpay_order_id = ?`,
      [razorpay_order_id]
    );
    res.json({ success: false });
  }
});

module.exports = router;
