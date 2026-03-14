const Event = require('../models/Event');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Boss: Solo Lectura | User/Admin: Control Total
 */

// @desc    Obtener todos los eventos para el calendario y la tabla de logs
const getEvents = async (req, res) => {
    try {
        // Ordenamos por fecha de inicio para que la tabla de logs sea coherente
        const events = await Event.find().sort({ start: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error al obtener eventos' });
    }
};

// @desc    Crear un nuevo evento con trazabilidad de usuario
const createEvent = async (req, res) => {
    try {
        // SEGURIDAD: El rol 'boss' tiene prohibida la creación
        if (req.user.role === 'boss') {
            return res.status(403).json({ 
                message: 'Acceso denegado: El perfil Jefe (Boss) solo visualiza.' 
            });
        }

        const { title, start, end, notes, color } = req.body;

        // Validación de campos críticos para evitar errores de BD
        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Título, inicio y fin son obligatorios.' });
        }

        const newEvent = new Event({ 
            title, 
            start: new Date(start), // Forzamos formato fecha
            end: new Date(end), 
            notes, 
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username // Guardamos el nombre para el Log de Auditoría
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Fallo en la operación de base de datos.' });
    }
};

// @desc    Actualizar/Editar un evento (Desde el Panel Secundario)
const updateEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        // Limpiamos los datos de entrada para asegurar integridad
        const updateData = { ...req.body };
        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedEvent) return res.status(404).json({ message: 'Evento no encontrado' });

        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar base de datos.' });
    }
};

// @desc    Eliminar un evento (Desde el Panel Secundario)
const deleteEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

        res.status(200).json({ message: 'Evento eliminado del sistema operativo.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar registro.' });
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};