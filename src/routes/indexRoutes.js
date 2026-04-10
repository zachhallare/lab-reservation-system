const express = require('express');
const router = express.Router();

router.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

router.get('/profile', (req, res) => {
    res.render('profile');
});

router.get('/technician', (req, res) => {
    res.render('technician');
});

router.get('/about', (req, res) => {
    res.render('about');
});

module.exports = router;
