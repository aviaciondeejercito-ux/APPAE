const Event = require('../models/Event');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles y trazabilidad de autoría.
 */

// @desc    Obtener todos los eventos
// @route   GET /api/events
// @access  Privado (Admin, Boss, User)
const getEvents = async (req, res) => {
    try {
        // Ordenamos por fecha de inicio y traemos info del creador
        const events = await Event.find().sort({ start: 1 }).populate('createdBy', 'username');
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener eventos', error: error.message });
    }
};

// @desc    Crear un nuevo evento
// @route   POST /api/events
// @access  Privado (Admin, User) - BOSS PROHIBIDO
const createEvent = async (req, res) => {
    try {
        // SEGURIDAD: El rol 'boss' solo puede ver, no crear.
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: El Jefe (Boss) solo tiene permisos de lectura.' });
        }

        const { title, start, end, description, type, status } = req.body;

        // Creamos el evento vinculándolo al ID del usuario que tiene la sesión iniciada
        const newEvent = new Event({ 
            title, 
            start, 
            end, 
            description, 
            type, 
            status,
            createdBy: req.user._id // Viene del authMiddleware
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear evento', error: error.message });
    }
};

/**
 * SEGURIDAD ADICIONAL: Solo el Admin debería poder borrar o editar.
 * Agregamos estas funciones para completar la lógica de gestión.
 */

// @desc    Eliminar un evento
// @route   DELETE /api/events/:id
// @access  Privado (Solo Admin)
const deleteEvent = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo el Administrador puede eliminar actividades.' });
        }

        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

        res.json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar evento' });
    }
};

// EXPORTACIÓN COMPLETA
module.exports = {
    getEvents,
    createEvent,
    deleteEvent
};