const Event = require('../models/Event');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Boss: Solo Lectura | User/Admin: Control Total
 */

// @desc    Obtener todos los eventos para el calendario
// @route   GET /api/events
// @access  Privado (Admin, Boss, User)
const getEvents = async (req, res) => {
    try {
        // Obtenemos eventos y traemos el nombre del creador para el Panel Secundario
        const events = await Event.find()
            .sort({ start: 1 })
            .populate('createdBy', 'username');
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error al obtener eventos', error: error.message });
    }
};

// @desc    Crear un nuevo evento
// @route   POST /api/events
// @access  Privado (Admin, User)
const createEvent = async (req, res) => {
    try {
        // SEGURIDAD: El rol 'boss' tiene prohibida la creación
        if (req.user.role === 'boss') {
            return res.status(403).json({ 
                message: 'Acceso denegado: El perfil Jefe (Boss) solo tiene permisos de visualización.' 
            });
        }

        const { title, start, end, notes, color, type, status } = req.body;

        const newEvent = new Event({ 
            title, 
            start, 
            end, 
            notes, // Espacio para las notas detalladas
            color, // Color para materialización en calendario
            type, 
            status,
            createdBy: req.user._id 
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear evento', error: error.message });
    }
};

// @desc    Actualizar/Editar un evento (Desde el Panel Secundario)
// @route   PUT /api/events/:id
// @access  Privado (Admin, User)
const updateEvent = async (req, res) => {
    try {
        // SEGURIDAD: El Boss no puede editar
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: No posee permisos de edición.' });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true, runValidators: true }
        );

        if (!updatedEvent) return res.status(404).json({ message: 'Evento no encontrado' });

        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar evento', error: error.message });
    }
};

// @desc    Eliminar un evento (Desde el Panel Secundario)
// @route   DELETE /api/events/:id
// @access  Privado (Admin, User)
const deleteEvent = async (req, res) => {
    try {
        // SEGURIDAD: El Boss no puede eliminar
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: No posee permisos de eliminación.' });
        }

        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

        res.status(200).json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar evento', error: error.message });
    }
};

// EXPORTACIÓN DE MÓDULOS OPERATIVOS
module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};