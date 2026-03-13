const express = require('express');
const router = express.Router();
const { getEvents, createEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

// GET /api/events -> Cualquier usuario autenticado puede verlos
router.get('/', protect, getEvents);

// POST /api/events -> SOLO el admin puede crear eventos
router.post('/', protect, authorize('admin'), createEvent);

module.exports = router;