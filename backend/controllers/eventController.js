const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft'); // IMPORTANTE: Importamos el modelo de aeronaves

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Estándar actualizado: BOSS y ADMIN (Control Total y Gestión Global).
 */

// @desc    Obtener aeronaves disponibles para la unidad (Solo las que están En Servicio E/S)
const getAvailableAircraft = async (req, res) => {
    try {
        const { elemento } = req.params;
        
        // Buscamos aeronaves que pertenezcan al elemento y estén En Servicio (E/S)
        const aircrafts = await Aircraft.find({ 
            unidad: { $regex: elemento, $options: 'i' },
            estado: 'E/S' 
        });
        
        res.status(200).json(aircrafts);
    } catch (error) {
        console.error(`❌ Error en getAvailableAircraft: ${error.message}`);
        res.status(500).json({ message: "Error al obtener aeronaves disponibles" });
    }
};

// @desc    Obtener eventos filtrados por jerarquía, unidad y estado de aprobación
const getEvents = async (req, res) => {
    try {
        const { elemento, role } = req.user; 
        let query = {};

        if (role === 'admin' || role === 'boss' || elemento === 'DIR AE') {
            query = {}; 
        } 
        else {
            query = {
                $or: [
                    { elemento: { $regex: elemento, $options: 'i' } },
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
        const { 
            title, start, end, notes, color, esGlobal, 
            elemento, etapa, tipoApoyo, sdaListado 
        } = req.body;

        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Datos incompletos.' });
        }

        const isMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';
        
        const newEvent = new Event({ 
            title, 
            start: new Date(start), 
            end: new Date(end), 
            notes: notes || '', 
            color: color || '#1b3a57',
            tipoApoyo: tipoApoyo || '',
            sdaListado: sdaListado || [], 
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: (isMando && elemento) ? elemento : req.user.elemento,
            etapa: etapa || 'recepcion', 
            tipoOrigen: isMando ? 'COMANDO' : 'LOCAL',
            esGlobal: isMando ? (esGlobal || false) : false
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
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Evento no localizado.' });

        const esDuenio = event.createdBy && event.createdBy.toString() === req.user._id.toString();
        const esMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';

        // Seguridad: Solo el dueño o personal de mando/DIR AE puede editar
        if (!esDuenio && !esMando) {
            return res.status(403).json({ message: 'No tiene permisos para modificar esta orden.' });
        }

        // --- SOLUCIÓN ERROR 400: Limpieza de datos críticos ---
        const updateData = { ...req.body };
        
        // Eliminamos campos que MongoDB no permite actualizar manualmente o que causan conflicto
        delete updateData._id; 
        delete updateData.__v;
        delete updateData.createdBy; // Protegemos la autoría original

        // Trazabilidad: Actualizamos quién fue el último en editar
        updateData.userName = req.user.username; 

        // Conversión robusta de fechas (Soluciona problemas de formato de strings)
        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        // Restricciones de seguridad por Rol (Usuarios comunes no pueden cambiar etapa o visibilidad global)
        if (!esMando) {
            delete updateData.esGlobal;
            delete updateData.etapa;
            delete updateData.elemento; // Un usuario local no puede mover el evento a otra unidad
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ 
            message: 'Fallo al actualizar el registro operativo.',
            details: error.message 
        });
    }
};

// @desc    Eliminar un evento
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'El evento no existe.' });

        // Solo Admin o Boss pueden borrar para mantener integridad histórica
        if (req.user.role !== 'admin' && req.user.role !== 'boss') {
            return res.status(403).json({ message: 'Baja denegada: Requiere nivel BOSS o superior.' });
        }

        await event.deleteOne();
        res.status(200).json({ message: 'Registro eliminado correctamente.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Error al procesar la baja del evento.' });
    }
};

module.exports = {
    getEvents,
    getAvailableAircraft, // Exportamos la nueva función
    createEvent,
    updateEvent,
    deleteEvent
};