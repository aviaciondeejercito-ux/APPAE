const express = require('express');
const router = express.getRouter ? express.getRouter() : express.Router();
const { getEvents, createEvent } = require('../controllers/eventController');
const auth = require('../middleware/authMiddleware');

// Ruta para obtener todos los eventos (Público o Privado según decidas)
router.get('/', getEvents);

// Ruta para crear un evento (Protegido por Token)
router.post('/', auth, createEvent);

module.exports = router;