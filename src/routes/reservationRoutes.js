const express = require('express');
const router = express.Router();

router.get('/reservations', (req, res) => {
    res.render('reservations');
});

module.exports = router;
