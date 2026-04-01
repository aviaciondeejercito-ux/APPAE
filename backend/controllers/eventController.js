const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Optimizado)
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
            query.elemento = { $regex: elemento, $options: 'i' };
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
            isRealTime, ubicacion, notasMarginales, status,
            aeronave, matricula, tipoIcono, lat, lng,
            misionDetalle 
        } = req.body;

        if (!title) return res.status(400).json({ message: 'Título requerido.' });

        const isMando = req.isMando;
        const notasProcesadas = (notasMarginales || notes || '').toString().toUpperCase();
        
        // Normalización de coordenadas
        const finalLat = parseFloat(lat !== undefined ? lat : (ubicacion?.lat || -34.61315));
        const finalLng = parseFloat(lng !== undefined ? lng : (ubicacion?.lng || -58.37723));

        const eventData = {
            title: (title || '').toString().toUpperCase(),
            notes: notasProcesadas,
            notasMarginales: notasProcesadas,
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: ((isMando && elemento) ? elemento : req.user.elemento).toUpperCase(),
            status: status || 'programado',
            isRealTime: isRealTime || false,
            // Estructura anidada obligatoria según imagen de DB
            misionDetalle: {
                comandante: (misionDetalle?.comandante || '').toUpperCase(),
                copiloto: (misionDetalle?.copiloto || '').toUpperCase(),
                mecanico: (misionDetalle?.mecanico || '').toUpperCase(),
                pax: (misionDetalle?.pax || '').toUpperCase(),
                carga: (misionDetalle?.carga || '').toUpperCase(),
                aeronave: (aeronave || misionDetalle?.aeronave || '').toString().toUpperCase(),
                matricula: (matricula || misionDetalle?.matricula || '').toString().toUpperCase(),
                tipoIcono: tipoIcono || misionDetalle?.tipoIcono || 'ala_rotativa',
                isRealTime: isRealTime || false,
                lat: finalLat,
                lng: finalLng
            },
            lat: finalLat,
            lng: finalLng,
            ubicacion: {
                nombre: (ubicacion?.nombre || req.body.locNombre || 'POSICIÓN TÁCTICA').toUpperCase(),
                lat: finalLat,
                lng: finalLng
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
        res.status(400).json({ message: 'Error en la persistencia.' });
    }
};

// @desc    Actualizar registro (Sincronización Atómica)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Registro no localizado.' });

        const userUnidad = req.user.elemento?.toUpperCase();
        const isMando = req.isMando;
        
        const eventElemento = event.elemento ? event.elemento.toUpperCase() : "";
        const perteneceAUnidad = eventElemento.includes(userUnidad);
        const isOwner = event.createdBy.toString() === req.user._id.toString();

        if (!isMando && !isOwner && !perteneceAUnidad) {
            return res.status(403).json({ message: 'No tiene permisos.' });
        }

        const updateData = { ...req.body };
        delete updateData._id; 
        delete updateData.createdBy;
        updateData.updatedBy = req.user._id; 

        // Normalización de Strings
        ['title', 'elemento', 'tipoApoyo', 'notasMarginales', 'notes', 'status'].forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[field] = (updateData[field] || '').toString().toUpperCase();
            }
        });

        // Manejo Atómico de MisionDetalle (Mantiene lo que ya está en DB si no viene nuevo)
        const nLat = parseFloat(updateData.lat ?? updateData.misionDetalle?.lat ?? updateData.ubicacion?.lat ?? event.lat);
        const nLng = parseFloat(updateData.lng ?? updateData.misionDetalle?.lng ?? updateData.ubicacion?.lng ?? event.lng);

        updateData.misionDetalle = {
            ...event.misionDetalle,
            ...updateData.misionDetalle,
            comandante: (updateData.misionDetalle?.comandante || event.misionDetalle?.comandante || '').toUpperCase(),
            copiloto: (updateData.misionDetalle?.copiloto || event.misionDetalle?.copiloto || '').toUpperCase(),
            mecanico: (updateData.misionDetalle?.mecanico || event.misionDetalle?.mecanico || '').toUpperCase(),
            aeronave: (updateData.aeronave || updateData.misionDetalle?.aeronave || event.misionDetalle?.aeronave || '').toUpperCase(),
            matricula: (updateData.matricula || updateData.misionDetalle?.matricula || event.misionDetalle?.matricula || '').toUpperCase(),
            lat: nLat,
            lng: nLng
        };

        updateData.lat = nLat;
        updateData.lng = nLng;
        updateData.ubicacion = {
            nombre: (updateData.locNombre || updateData.ubicacion?.nombre || event.ubicacion?.nombre || 'POSICIÓN TÁCTICA').toUpperCase(),
            lat: nLat,
            lng: nLng
        };

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
        res.status(400).json({ message: 'Error al actualizar registro.' });
    }
};

// @desc    Eliminar registro
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        const isMando = req.isMando;
        const isOwner = event.createdBy.toString() === req.user._id.toString();

        if (!isMando && !isOwner) {
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

        res.status(200).json({ message: 'Eliminado correctamente.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Error al eliminar.' });
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