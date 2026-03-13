const Event = require('../models/Event');

// @desc    Obtener todos los eventos
// @route   GET /api/events
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find().populate('createdBy', 'username');
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener eventos', error: error.message });
    }
};

// @desc    Crear un nuevo evento
// @route   POST /api/events
exports.createEvent = async (req, res) => {
    try {
        const { title, description, start, end, type } = req.body;

        const newEvent = await Event.create({
            title,
            description,
            start,
            end,
            type,
            createdBy: req.user._id // Este ID vendrá del middleware de autenticación
        });

        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear evento', error: error.message });
    }
};