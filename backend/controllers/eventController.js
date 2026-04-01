const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Optimizado)
 * - Actualizaciones Atómicas en MongoDB.
 * - Sincro Real-Time: Integración con WebSockets para el Mapa Táctico.
 * - Lógica de Permisos: Filtro por Unidad para Carga Táctica.
 * - Actualización: Integración de jerarquía OTO/OTOAE para visión global.
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
        let query = {}; 

        if (!isMando) {
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

        const events = await Event.find(query).sort({ start: 1, updatedAt: -1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar el registro.' });
    }
};

// @desc    Obtener operaciones activas para el MAPA TÁCTICO (Con filtro de Unidad)
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

        const eventData = {
            title: (title || '').toString().toUpperCase(),
            notes: notasProcesadas,
            notasMarginales: notasProcesadas,
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: ((isMando && elemento) ? elemento : req.user.elemento).toUpperCase(),
            status: status || 'programado',
            misionDetalle: {
                comandante: (misionDetalle?.comandante || '').toUpperCase(),
                copiloto: (misionDetalle?.copiloto || '').toUpperCase(),
                mecanico: (misionDetalle?.mecanico || '').toUpperCase(),
                pax: (misionDetalle?.pax || '').toUpperCase(),
                carga: (misionDetalle?.carga || '').toUpperCase()
            }
        };

        if (isRealTime) {
            const finalLat = parseFloat(lat !== undefined ? lat : (ubicacion?.lat || 0));
            const finalLng = parseFloat(lng !== undefined ? lng : (ubicacion?.lng || 0));

            Object.assign(eventData, {
                isRealTime: true,
                tipoApoyo: 'VUELO',
                start: start ? new Date(start) : new Date(),
                end: end ? new Date(end) : null,
                etapa: 'operativo',
                lat: finalLat,
                lng: finalLng,
                ubicacion: {
                    nombre: (ubicacion?.nombre || req.body.locNombre || 'POSICIÓN TÁCTICA').toUpperCase(),
                    lat: finalLat,
                    lng: finalLng
                },
                aeronave: (aeronave || '').toString().toUpperCase(),
                matricula: (matricula || '').toString().toUpperCase(),
                tipoIcono: tipoIcono || 'ala_rotativa'
            });
        } else {
            Object.assign(eventData, {
                isRealTime: false,
                tipoApoyo: (tipoApoyo || 'SOSTENIMIENTO').toUpperCase(),
                start: start ? new Date(start) : null,
                end: end ? new Date(end) : null,
                etapa: etapa || 'recepcion',
                esGlobal: isMando ? (esGlobal || false) : false,
                sdaListado: sdaListado || []
            });
        }

        const newEvent = new Event(eventData);
        await newEvent.save();

        const io = req.app.get('socketio');
        if (io && newEvent.isRealTime) {
            io.emit('newOperation', newEvent);
        }

        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Error en la persistencia.' });
    }
};

// @desc    Actualizar registro (Sincronización Atómica y Permisos de Unidad)
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
            return res.status(403).json({ message: 'No tiene permisos para modificar esta orden operativa.' });
        }

        const updateData = { ...req.body };
        delete updateData._id; 
        delete updateData.createdBy;
        updateData.updatedBy = req.user._id; 

        // Procesamiento de Mayúsculas
        ['title', 'elemento', 'aeronave', 'matricula', 'tipoApoyo', 'notasMarginales', 'notes'].forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[field] = (updateData[field] || '').toString().toUpperCase();
            }
        });

        if (updateData.misionDetalle) {
            updateData.misionDetalle = {
                comandante: (updateData.misionDetalle.comandante || '').toUpperCase(),
                copiloto: (updateData.misionDetalle.copiloto || '').toUpperCase(),
                mecanico: (updateData.misionDetalle.mecanico || '').toUpperCase(),
                pax: (updateData.misionDetalle.pax || '').toUpperCase(),
                carga: (updateData.misionDetalle.carga || '').toUpperCase()
            };
        }

        // --- CORRECCIÓN CRÍTICA: ESTRUCTURA DE UBICACIÓN ---
        if (updateData.lat !== undefined || updateData.lng !== undefined || updateData.ubicacion) {
            const nLat = parseFloat(updateData.lat ?? updateData.ubicacion?.lat ?? event.lat ?? event.ubicacion?.lat ?? 0);
            const nLng = parseFloat(updateData.lng ?? updateData.ubicacion?.lng ?? event.lng ?? event.ubicacion?.lng ?? 0);
            const nNombre = (updateData.locNombre || updateData.ubicacion?.nombre || (event.ubicacion && event.ubicacion.nombre) || 'POSICIÓN TÁCTICA').toUpperCase();

            updateData.lat = nLat;
            updateData.lng = nLng;
            updateData.ubicacion = {
                nombre: nNombre,
                lat: nLat,
                lng: nLng
            };
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
        res.status(400).json({ message: 'Error al actualizar registro. Verifique el formato de coordenadas.' });
    }
};

// @desc    Eliminar registro y limpiar radar
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        const userUnidad = req.user.elemento?.toUpperCase();
        const isMando = req.isMando;
        
        const eventElemento = event.elemento ? event.elemento.toUpperCase() : "";
        const perteneceAUnidad = eventElemento.includes(userUnidad);
        const isOwner = event.createdBy.toString() === req.user._id.toString();

        if (!isMando && !isOwner && !perteneceAUnidad) {
            return res.status(403).json({ message: 'Acceso denegado: No posee permisos sobre esta actividad.' });
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