const Event = require('../models/Event');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Estándar: Boss (Solo Lectura) | User/Admin (Control Total)
 */

// @desc    Obtener todos los eventos para el calendario y la tabla de logs
const getEvents = async (req, res) => {
    try {
        // Ordenamos por fecha de inicio para que la tabla de logs sea coherente
        const events = await Event.find().sort({ start: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error al obtener registros del calendario.' });
    }
};

// @desc    Crear un nuevo evento con trazabilidad de usuario
const createEvent = async (req, res) => {
    try {
        // SEGURIDAD: El rol 'boss' (Jefe) tiene prohibida la creación/edición
        if (req.user.role === 'boss') {
            return res.status(403).json({ 
                message: 'Acceso denegado: El perfil Jefe (Boss) solo tiene permisos de visualización.' 
            });
        }

        const { title, start, end, notes, color } = req.body;

        // Validación de campos críticos según Estándar AE
        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Datos incompletos: Título, inicio y fin son obligatorios.' });
        }

        const newEvent = new Event({ 
            title, 
            start: new Date(start), 
            end: new Date(end), 
            notes: notes || '', 
            color: color || '#1b3a57', // Color institucional por defecto
            createdBy: req.user._id,
            userName: req.user.username // Trazabilidad para el Log de Auditoría
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al registrar el evento en la base de datos.' });
    }
};

// @desc    Actualizar/Editar un evento (Trazabilidad de última modificación)
const updateEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: Perfil sin permisos de edición.' });
        }

        // Preparamos los datos y actualizamos el nombre del usuario que realiza el cambio
        const updateData = { 
            ...req.body,
            userName: req.user.username // Registramos quién hizo la última modificación
        };
        
        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: 'Evento no localizado en el sistema.' });
        }

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Fallo al actualizar el registro operativo.' });
    }
};

// @desc    Eliminar un evento (Baja de registro)
const deleteEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: Perfil sin permisos de eliminación.' });
        }

        const event = await Event.findByIdAndDelete(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'El evento ya no existe en el sistema.' });
        }

        res.status(200).json({ message: 'Registro eliminado correctamente del sistema AE.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Error de servidor al procesar la baja del evento.' });
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};