const express = require('express');
const router = express.Router();
const { getEvents, createEvent } = require('../controllers/eventController');

// Ruta para obtener eventos
router.get('/', getEvents);

// Ruta para crear eventos
router.post('/', createEvent);

module.exports = router;