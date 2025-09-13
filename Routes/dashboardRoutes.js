const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/counts', async (req, res) => {
    try {
        const [[{products}]] = await db.query('SELECT COUNT(*) AS products FROM products');
        const [[{categories}]] = await db.query('SELECT COUNT(*) AS categories FROM product_categories');
        const [[{customers}]] = await db.query("SELECT COUNT(*) AS customers FROM users WHERE role = 'user'");
        
        res.json({products, categories, customers})
    } catch (error) {
        console.error("Error Fetching Counts:", error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

module.exports = router;