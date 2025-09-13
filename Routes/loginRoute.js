const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ========================
// User Signup (always role 'user')
// ========================
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, msg: 'All fields are required' });
  }

  try {
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, msg: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'user']
    );

    res.status(201).json({ success: true, msg: 'User registered successfully' });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ success: false, msg: 'Internal server error' });
  }
});

// ========================
// Admin Signup (protected by secret key)
// ========================
router.post('/signup', async (req, res) => {
  const { username, email, password, secretKey } = req.body;

  if (!username || !email || !password || !secretKey) {
    return res.status(400).json({ success: false, msg: 'All fields and secret key are required' });
  }

  if (secretKey !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, msg: 'Forbidden: Invalid secret key' });
  }

  try {
    const [existingUsers] = await db.execute('SELECT * FROM admin WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, msg: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO admin (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'admin']
    );

    res.status(201).json({ success: true, msg: 'Admin registered successfully' });
  } catch (err) {
    console.error('Admin Signup Error:', err);
    res.status(500).json({ success: false, msg: 'Internal server error' });
  }
});

// ========================
// Login
// ========================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, msg: 'Email and password are required' });
  }

  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    res.status(200).json({
      success: true,
      msg: 'Logged in successfully',
      user: req.session.user,
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, msg: 'Internal server error' });
  }
});

// ========================
// Logout
// ========================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, msg: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ success: true, msg: 'Logged out successfully' });
  });
});

// ========================
// Admin-only route example
// ========================
router.get('/admin-only', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, msg: 'Unauthorized: not logged in' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, msg: 'Forbidden: Admin access only' });
  }

  res.json({ success: true, msg: 'Welcome, Admin!' });
});

// ========================
// User-only route example
// ========================
router.get('/user-only', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, msg: 'Unauthorized: not logged in' });
  }

  if (req.session.user.role !== 'user') {
    return res.status(403).json({ success: false, msg: 'Forbidden: User access only' });
  }

  res.json({ success: true, msg: 'Welcome, User!' });
});

module.exports = router;
