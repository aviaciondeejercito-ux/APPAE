const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware');

// Solo necesitamos el GET de totales
router.get('/totales-vuelo', protect, ebmController.getTotalesVueloTrimestral);

module.exports = router;