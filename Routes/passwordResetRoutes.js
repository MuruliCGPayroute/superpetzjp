const express = require("express");
const router = express.Router();
const db = require("../database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

router.post("/request-reset", async (req, res) => {
  const email = req.body.email;
  console.log("Request received at /request-reset with body:", req.body);

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (users.length === 0) {
      return res
        .status(200)
        .json({ message: "If email exists, reset link sent" });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiry = Date.now() + 3600000;

    await db.query(
      `INSERT INTO password_reset_token (user_id, token, expiry) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expiry = ?`,
      [user.user_id, hashedToken, expiry, hashedToken, expiry]
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: 'SUPER PETZ',
      to: email,
      subject: "Password Reset Link",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });

    return res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    console.error("Reset request error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  const hashedIncoming = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  try {
    const [tokenResults] = await db.query(
      "SELECT * FROM password_reset_token WHERE token = ? AND expiry > ?",
      [hashedIncoming, Date.now()]
    );

    if (tokenResults.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const userId = tokenResults[0].user_id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // ✅ Update the `passwords` table
    await db.query(
      `INSERT INTO passwords (user_id, password, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE password = VALUES(password), updated_at = NOW()`,
      [userId, hashedPassword]
    );

    // ✅ Also update the `users` table password
    await db.query(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [hashedPassword, userId]
    );

    // ✅ Clean up used token
    await db.query("DELETE FROM password_reset_token WHERE user_id = ?", [userId]);

    return res.status(200).json({ message: "Password reset successfully" });

  } catch (err) {
    console.error("Reset-password error:", err);
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
