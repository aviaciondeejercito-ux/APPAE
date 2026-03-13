const Event = require('../models/Event');

// Obtener todos los eventos
const getEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ start: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener eventos' });
    }
};

// Crear un nuevo evento
const createEvent = async (req, res) => {
    try {
        const { title, start, end, description, color } = req.body;
        const newEvent = new Event({ title, start, end, description, color });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear evento' });
    }
};

// EXPORTACIÓN CRUCIAL: Si esto falla, el router da el error que viste
module.exports = {
    getEvents,
    createEvent
};