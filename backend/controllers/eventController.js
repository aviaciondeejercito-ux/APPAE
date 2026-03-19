const Event = require('../models/Event');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Estándar: Boss (Solo Lectura) | User/Admin (Control Total)
 * Mejora: Flujo de Aprobación DIR AE (Recepción -> Revisión -> Ordenada)
 */

// @desc    Obtener eventos filtrados por jerarquía, unidad y estado de aprobación
const getEvents = async (req, res) => {
    try {
        const { elemento, role } = req.user; 
        let query = {};

        /**
         * LÓGICA DE VISIÓN TOTAL (DIR AE / ADMIN / BOSS):
         * Acceso completo a todas las etapas del flujo de trabajo.
         */
        if (role === 'admin' || role === 'boss' || elemento === 'DIR AE') {
            query = {}; 
        } 
        /**
         * LÓGICA DE UNIDAD (FILTRO DE SEGURIDAD OPERATIVA):
         * Una unidad solo ve:
         * 1. Sus propios eventos (locales).
         * 2. Eventos donde es destinataria Y están en etapa 'ordenada'.
         */
        else {
            query = {
                $or: [
                    { elemento: elemento }, // Actividades creadas localmente
                    { 
                        $and: [
                            { etapa: 'ordenada' }, 
                            { 
                                $or: [
                                    { esGlobal: true }, 
                                    { elemento: { $regex: elemento, $options: 'i' } } 
                                ]
                            }
                        ]
                    }
                ]
            };
        }

        const events = await Event.find(query).sort({ start: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error de seguridad al recuperar el calendario.' });
    }
};

// @desc    Crear un nuevo evento con segmentación de etapa y destino
const createEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: El perfil Jefe solo visualiza.' });
        }

        const { title, start, end, notes, color, esGlobal, elemento, etapa, tipoApoyo } = req.body;

        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Datos incompletos.' });
        }

        const isDirAE = req.user.elemento === 'DIR AE' || req.user.role === 'admin';
        
        const newEvent = new Event({ 
            title, 
            start: new Date(start), 
            end: new Date(end), 
            notes: notes || '', 
            color: color || '#1b3a57',
            tipoApoyo: tipoApoyo || '',
            createdBy: req.user._id,
            userName: req.user.username,
            // Si es DIR AE, el 'elemento' puede ser una lista de unidades separadas por coma
            elemento: elemento || req.user.elemento,
            etapa: etapa || 'recepcion', 
            tipoOrigen: isDirAE ? 'COMANDO' : 'LOCAL',
            esGlobal: esGlobal || false
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al registrar el evento.' });
    }
};

// @desc    Actualizar evento (Permite avanzar etapas en el flujo DIR AE)
const updateEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado: Perfil sin permisos de edición.' });
        }

        // Trazabilidad: registramos quién hizo la última modificación
        const updateData = { 
            ...req.body,
            userName: req.user.username 
        };
        
        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: 'Evento no localizado.' });
        }

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Fallo al actualizar el registro operativo.' });
    }
};

// @desc    Eliminar un evento
const deleteEvent = async (req, res) => {
    try {
        if (req.user.role === 'boss') {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const event = await Event.findByIdAndDelete(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'El evento no existe.' });
        }

        res.status(200).json({ message: 'Registro eliminado correctamente.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Error al procesar la baja del evento.' });
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};