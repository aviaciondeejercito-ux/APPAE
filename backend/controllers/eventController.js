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
            query.elemento = { $regex: elemento, $options: 'i' };
        }

        const activeOps = await Event.find(query).sort({ updatedAt: -1 });
        res.status(200).json(activeOps);
    } catch (error) {
        console.error(`❌ Error en getActiveOperations: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar mapa táctico.' });
    }
};

// @desc    Crear un nuevo registro (Sincronizado con CargaTactica y Trayectos)
const createEvent = async (req, res) => {
    try {
        const { 
            title, start, end, notes, color, esGlobal, 
            elemento, etapa, tipoApoyo, sdaListado,
            isRealTime, ubicacion, notasMarginales, status,
            aeronave, matricula, tipoIcono, lat, lng,
            misionDetalle 
        } = req.body;

        if (!title) return res.status(400).json({ message: 'El título es obligatorio.' });

        // SEGURIDAD: Validación de aeronave si es un vuelo operativo
        if (isRealTime || tipoApoyo === 'VUELO') {
            const targetMatricula = matricula || misionDetalle?.matricula;
            const aircraftExists = await Aircraft.findOne({ matricula: targetMatricula?.toUpperCase() });
            if (!aircraftExists) {
                return res.status(404).json({ message: `La aeronave ${targetMatricula} no existe en la base de datos.` });
            }
        }

        const isMando = req.isMando;
        const notasProcesadas = (notasMarginales || notes || '').toString().toUpperCase();
        
        // Normalización de coordenadas principales
        const finalLat = parseFloat(ubicacion?.salida?.lat ?? lat ?? misionDetalle?.lat ?? -34.61315);
        const finalLng = parseFloat(ubicacion?.salida?.lng ?? lng ?? misionDetalle?.lng ?? -58.37723);

        const eventData = {
            title: (title || '').toString().toUpperCase(),
            notes: notasProcesadas,
            notasMarginales: notasProcesadas,
            color: color || '#1b3a57',
            createdBy: req.user._id, // SEGURIDAD: Auditoría real desde el token
            userName: req.user.username || req.user.name, // SEGURIDAD: Nombre real desde el token
            elemento: ((isMando && elemento) ? elemento : req.user.elemento).toUpperCase(),
            status: (status || 'programado').toLowerCase(),
            isRealTime: isRealTime || false,
            misionDetalle: {
                comandante: (misionDetalle?.comandante || 'S/D').toUpperCase(),
                copiloto: (misionDetalle?.copiloto || 'S/D').toUpperCase(),
                mecanico: (misionDetalle?.mecanico || 'S/D').toUpperCase(),
                pax: (misionDetalle?.pax || '0').toUpperCase(),
                carga: (misionDetalle?.carga || '0').toUpperCase(),
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
                salida: {
                    nombre: (ubicacion?.salida?.nombre || 'ORIGEN').toUpperCase(),
                    lat: parseFloat(ubicacion?.salida?.lat ?? finalLat),
                    lng: parseFloat(ubicacion?.salida?.lng ?? finalLng)
                },
                llegada: {
                    nombre: (ubicacion?.llegada?.nombre || 'DESTINO').toUpperCase(),
                    lat: parseFloat(ubicacion?.llegada?.lat ?? finalLat),
                    lng: parseFloat(ubicacion?.llegada?.lng ?? finalLng)
                },
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
        res.status(400).json({ message: 'Error en la persistencia del vector.', details: error.message });
    }
};

// @desc    Actualizar registro (Sincronización Atómica de Trayecto)
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
            return res.status(403).json({ message: 'No tiene permisos para modificar este vector.' });
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

        // Manejo Atómico de Coordenadas
        const nLat = parseFloat(updateData.ubicacion?.salida?.lat ?? updateData.lat ?? updateData.misionDetalle?.lat ?? event.lat);
        const nLng = parseFloat(updateData.ubicacion?.salida?.lng ?? updateData.lng ?? updateData.misionDetalle?.lng ?? event.lng);

        updateData.misionDetalle = {
            ...event.misionDetalle,
            ...updateData.misionDetalle,
            comandante: (updateData.misionDetalle?.comandante || event.misionDetalle?.comandante || 'S/D').toUpperCase(),
            copiloto: (updateData.misionDetalle?.copiloto || event.misionDetalle?.copiloto || 'S/D').toUpperCase(),
            mecanico: (updateData.misionDetalle?.mecanico || event.misionDetalle?.mecanico || 'S/D').toUpperCase(),
            aeronave: (updateData.aeronave || updateData.misionDetalle?.aeronave || event.misionDetalle?.aeronave || '').toUpperCase(),
            matricula: (updateData.matricula || updateData.misionDetalle?.matricula || event.misionDetalle?.matricula || '').toUpperCase(),
            lat: nLat,
            lng: nLng
        };

        updateData.lat = nLat;
        updateData.lng = nLng;
        
        updateData.ubicacion = {
            nombre: (updateData.locNombre || updateData.ubicacion?.nombre || event.ubicacion?.nombre || 'POSICIÓN TÁCTICA').toUpperCase(),
            salida: {
                nombre: (updateData.ubicacion?.salida?.nombre || event.ubicacion?.salida?.nombre || 'ORIGEN').toUpperCase(),
                lat: parseFloat(updateData.ubicacion?.salida?.lat ?? event.ubicacion?.salida?.lat ?? nLat),
                lng: parseFloat(updateData.ubicacion?.salida?.lng ?? event.ubicacion?.salida?.lng ?? nLng)
            },
            llegada: {
                nombre: (updateData.ubicacion?.llegada?.nombre || event.ubicacion?.llegada?.nombre || 'DESTINO').toUpperCase(),
                lat: parseFloat(updateData.ubicacion?.llegada?.lat ?? event.ubicacion?.llegada?.lat ?? nLat),
                lng: parseFloat(updateData.ubicacion?.llegada?.lng ?? event.ubicacion?.llegada?.lng ?? nLng)
            },
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
        res.status(400).json({ message: 'Error al actualizar registro.', details: error.message });
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
            return res.status(403).json({ message: 'Acceso denegado. Solo el creador o mando superior pueden finalizar.' });
        }

        const isRealTime = event.isRealTime;
        const eventId = event._id;

        await event.deleteOne();

        const io = req.app.get('socketio');
        if (io) {
            const deleteChannel = isRealTime ? 'deleteOperation' : 'deleteCalendarEvent';
            io.emit(deleteChannel, eventId);
        }

        res.status(200).json({ message: 'Vector eliminado correctamente del radar.' });
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