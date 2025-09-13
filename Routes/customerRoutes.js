const express = require('express');
const router = express.Router();
const db = require('../database'); // Make sure this is using mysql2/promise

// Get all customers
router.get('/all', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM users');
        res.json({ success: true, customers: results });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ success: false, message: 'Error fetching customers' });
    }
});

// Get single customer by ID
router.get('/:id', async (req, res) => {
    const customerId = req.params.id;
    try {
        const [results] = await db.query('SELECT * FROM users WHERE user_id = ?', [customerId]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, customer: results[0] });
    } catch (err) {
        console.error('Error fetching customer:', err);
        res.status(500).json({ success: false, message: 'Error fetching customer' });
    }
});

// Add customer (should be POST, not GET!)
router.post('/add', async (req, res) => {
    const { username, email } = req.body;
    try {
        const [results] = await db.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
        res.json({ success: true, message: 'Customer Added Successfully', customerId: results.insertId });
    } catch (err) {
        console.error('Error Adding Customer:', err);
        res.status(500).json({ success: false, message: 'Error Adding Customer' });
    }
});

// Update customer
router.put('/update/:id', async (req, res) => {
    const customerId = req.params.id;
    const { username, email } = req.body;
    try {
        const [results] = await db.query('UPDATE users SET username = ?, email = ? WHERE user_id = ?', [username, email, customerId]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, message: 'Customer Updated Successfully' });
    } catch (err) {
        console.error('Error Updating Customer:', err);
        res.status(500).json({ success: false, message: 'Error Updating Customer' });
    }
});

// Delete customer
router.delete('/delete/:id', async (req, res) => {
    const customerId = req.params.id;
    try {
        const [results] = await db.query('DELETE FROM users WHERE user_id = ?', [customerId]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, message: 'Customer Deleted Successfully' });
    } catch (err) {
        console.error('Error Deleting Customer:', err);
        res.status(500).json({ success: false, message: 'Error Deleting Customer' });
    }
});

module.exports = router;
