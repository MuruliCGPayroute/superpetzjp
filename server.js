const express = require('express');
const session = require('express-session');
const path=require('path');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./Routes/loginRoute');
const productRoutes = require('./Routes/productRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const passwordResetRoutes = require('./Routes/passwordResetRoutes');
const categoryRoutes = require('./Routes/categoryRoutes');
const customerRoutes = require('./Routes/customerRoutes');
const razorpayRoutes = require('./Routes/razorpayRoutes');
const orderRoutes = require('./Routes/orderRoutes');
const dashboardRoutes = require('./Routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 9292;

app.use(cors({
  origin: ["https://superpetz.in", "https://superpetz.in"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key_change_this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: false,
    httpOnly: true,
  },
}));

// Route mounts
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', authRoutes); // Admin routes
app.use('/api/products', productRoutes);
app.use('/api/admin/products', productRoutes); // Admin routes
app.use('/api/category', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api', passwordResetRoutes);
app.use('/api/customer',customerRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
