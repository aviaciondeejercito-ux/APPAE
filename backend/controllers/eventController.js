const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Optimizado)
 * Acción: Auditoría de identidad y Validación de Flota E/S
 */

// @desc    Obtener aeronaves disponibles (Solo las que están En Servicio E/S)
const getAvailableAircraft = async (req, res) => {
    try {
        const { elemento } = req.params;
        let query = { estado: 'E/S' };

        if (elemento && elemento !== 'all') {
            query.unidad = { $regex: elemento, $options: 'i' };
        }
        
        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        res.status(200).json(aircrafts);
    } catch (error) {
        console.error(`❌ Error en getAvailableAircraft: ${error.message}`);
        res.status(500).json({ message: "Error al obtener aeronaves disponibles" });
    }
};

// @desc    Obtener eventos para CALENDARIO Y LOG
const getEvents = async (req, res) => {
    try {
        const { elemento } = req.user; 
        const isMando = req.isMando; 
        
        let query = { isRealTime: false }; 

        if (!isMando) {
            query.$or = [
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
            ];
        }

        const events = await Event.find(query).sort({ start: 1, updatedAt: -1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar el registro.' });
    }
};

// @desc    Obtener operaciones activas para el MAPA TÁCTICO
const getActiveOperations = async (req, res) => {
    try {
        const { elemento } = req.user;
        const isMando = req.isMando;

        let query = { 
            isRealTime: true,
            status: { $in: ['en_curso', 'en_desarrollo', 'operativo', 'emergencia'] } 
        };

        if (!isMando) {
            query.$or = [
                { elemento: { $regex: elemento, $options: 'i' } },
                { esGlobal: true },
                { etapa: 'operativo' }
            ];
        }

        const activeOps = await Event.find(query).sort({ updatedAt: -1 });
        res.status(200).json(activeOps);
    } catch (error) {
        console.error(`❌ Error en getActiveOperations: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar mapa táctico.' });
    }
};

// @desc    Crear un nuevo registro (Sincronizado con CargaTactica)
const createEvent = async (req, res) => {
    try {
        const { 
            title, start, end, notes, color, esGlobal, 
            elemento, etapa, tipoApoyo, sdaListado,
            isRealTime, notasMarginales, status,
            aeronave, matricula, tipoIcono,
            origen, destino, misionDetalle 
        } = req.body;

        if (!title) return res.status(400).json({ message: 'El título es obligatorio.' });

        // Validación de aeronave si es vuelo
        if (isRealTime || tipoApoyo === 'VUELO') {
            const targetMatricula = matricula || misionDetalle?.matricula;
            const aircraftExists = await Aircraft.findOne({ matricula: targetMatricula?.toUpperCase() });
            if (!aircraftExists) {
                return res.status(404).json({ message: `La aeronave ${targetMatricula} no existe.` });
            }
        }

        const isMando = req.isMando;
        const notasProcesadas = (notasMarginales || notes || '').toString().toUpperCase();
        
        const eventData = {
            title: (title || '').toString().toUpperCase(),
            notes: notasProcesadas,
            notasMarginales: notasProcesadas,
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username || req.user.name,
            elemento: ((isMando && elemento) ? elemento : req.user.elemento).toUpperCase(),
            status: (status || 'programado').toLowerCase(),
            isRealTime: isRealTime || false,
            
            // 1. Datos de Aeronave
            matricula: (matricula || misionDetalle?.matricula || '').toUpperCase(),
            aeronave: (aeronave || misionDetalle?.aeronave || '').toUpperCase(),
            tipoIcono: tipoIcono || misionDetalle?.tipoIcono || 'ala_rotativa',

            // 2. Coordenadas Independientes (Lógica Nueva)
            origen: {
                nombre: (origen?.nombre || 'ORIGEN').toUpperCase(),
                lat: origen?.lat ? parseFloat(origen.lat) : null,
                lng: origen?.lng ? parseFloat(origen.lng) : null
            },
            destino: {
                nombre: (destino?.nombre || 'DESTINO').toUpperCase(),
                lat: destino?.lat ? parseFloat(destino.lat) : null,
                lng: destino?.lng ? parseFloat(destino.lng) : null
            },

            // Detalle de misión (Compatibilidad con otros módulos)
            misionDetalle: {
                ...misionDetalle,
                matricula: (matricula || misionDetalle?.matricula || '').toUpperCase(),
                aeronave: (aeronave || misionDetalle?.aeronave || '').toUpperCase(),
            },

            start: start ? new Date(start) : new Date(),
            end: end ? new Date(end) : null,
            etapa: isRealTime ? 'operativo' : (etapa || 'recepcion'),
            tipoApoyo: isRealTime ? 'VUELO' : (tipoApoyo || 'SOSTENIMIENTO').toUpperCase(),
            esGlobal: isMando ? (esGlobal || false) : false,
            sdaListado: sdaListado || []
        };

        const newEvent = new Event(eventData);
        await newEvent.save();

        const io = req.app.get('socketio');
        if (io) {
            const channel = newEvent.isRealTime ? 'newOperation' : 'calendarUpdate';
            io.emit(channel, newEvent);
        }

        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Error en la persistencia.', details: error.message });
    }
};

// @desc    Actualizar registro
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Registro no localizado.' });

        const isMando = req.isMando;
        const isOwner = event.createdBy.toString() === req.user._id.toString();

        if (!isMando && !isOwner) {
            return res.status(403).json({ message: 'No tiene permisos.' });
        }

        const updateData = { ...req.body };
        delete updateData._id; 
        delete updateData.createdBy;
        updateData.updatedBy = req.user._id; 

        // Procesamiento de Origen/Destino en Update
        if (updateData.origen) {
            updateData.origen.nombre = (updateData.origen.nombre || '').toUpperCase();
            if (updateData.origen.lat) updateData.origen.lat = parseFloat(updateData.origen.lat);
            if (updateData.origen.lng) updateData.origen.lng = parseFloat(updateData.origen.lng);
        }

        if (updateData.destino) {
            updateData.destino.nombre = (updateData.destino.nombre || '').toUpperCase();
            if (updateData.destino.lat) updateData.destino.lat = parseFloat(updateData.destino.lat);
            if (updateData.destino.lng) updateData.destino.lng = parseFloat(updateData.destino.lng);
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        const io = req.app.get('socketio');
        if (io) {
            const emitChannel = updatedEvent.isRealTime ? 'updateOperation' : 'calendarUpdate';
            io.emit(emitChannel, updatedEvent);
        }

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al actualizar.', details: error.message });
    }
};

// @desc    Eliminar registro
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        if (!req.isMando && event.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const isRealTime = event.isRealTime;
        const eventId = event._id;

        await event.deleteOne();

        const io = req.app.get('socketio');
        if (io) {
            const deleteChannel = isRealTime ? 'deleteOperation' : 'deleteCalendarEvent';
            io.emit(deleteChannel, eventId);
        }

        res.status(200).json({ message: 'Vector eliminado correctamente.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Error al eliminar el registro.' });
    }
};

module.exports = {
    getEvents,
    getAvailableAircraft,
    getActiveOperations,
    createEvent,
    updateEvent,
    deleteEvent
};