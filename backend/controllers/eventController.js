const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Optimizado)
 * - Actualizaciones Atómicas en MongoDB.
 * - Sincro Real-Time: Integración con WebSockets para el Mapa Táctico.
 * - Lógica de Permisos: Filtro por Unidad para Carga Táctica.
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
        const { elemento, role } = req.user; 
        let query = {}; 

        const isMando = role === 'admin' || role === 'boss' || elemento === 'DIR AE';

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
        const { elemento, role } = req.user;
        const isMando = role === 'admin' || role === 'boss' || elemento === 'DIR AE';

        let query = { 
            isRealTime: true,
            status: { $in: ['en_curso', 'en_desarrollo', 'operativo', 'emergencia'] } 
        };

        // Si no es mando, solo ve los vuelos de su unidad en el mapa
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
            aeronave, matricula, tipoIcono, lat, lng
        } = req.body;

        if (!title) return res.status(400).json({ message: 'Título requerido.' });

        const isMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';
        const notasProcesadas = (notasMarginales || notes || '').toString().toUpperCase();

        const eventData = {
            title: (title || '').toString().toUpperCase(),
            notes: notasProcesadas,
            notasMarginales: notasProcesadas,
            color: color || '#d35400',
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: ((isMando && elemento) ? elemento : req.user.elemento).toUpperCase(),
            status: status || 'programado'
        };

        if (isRealTime) {
            const finalLat = lat !== undefined ? lat : (ubicacion?.lat || 0);
            const finalLng = lng !== undefined ? lng : (ubicacion?.lng || 0);

            Object.assign(eventData, {
                isRealTime: true,
                tipoApoyo: 'VUELO',
                start: null,
                end: null,
                etapa: 'operativo',
                lat: parseFloat(finalLat),
                lng: parseFloat(finalLng),
                ubicacion: {
                    nombre: (ubicacion?.nombre || 'POSICIÓN TÁCTICA').toUpperCase(),
                    lat: parseFloat(finalLat),
                    lng: parseFloat(finalLng)
                },
                aeronave: (aeronave || '').toString().toUpperCase(),
                matricula: (matricula || '').toString().toUpperCase(),
                tipoIcono: tipoIcono || 'ala_rotativa'
            });
        } else {
            Object.assign(eventData, {
                isRealTime: false,
                tipoApoyo: (tipoApoyo || 'GESTION').toUpperCase(),
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

        const { elemento, role } = req.user;
        const isMando = role === 'admin' || role === 'boss' || elemento === 'DIR AE';
        
        // El usuario puede editar si es mando O si el evento pertenece a su unidad
        const perteneceAUnidad = event.elemento && event.elemento.toUpperCase().includes(elemento.toUpperCase());
        const isOwner = event.createdBy.toString() === req.user._id.toString();

        if (!isMando && !isOwner && !perteneceAUnidad) {
            return res.status(403).json({ message: 'No tiene permisos para modificar este vuelo.' });
        }

        const updateData = { ...req.body };
        delete updateData._id; 
        delete updateData.createdBy;
        updateData.updatedBy = req.user._id; 

        if (updateData.notasMarginales || updateData.notes) {
            const txt = (updateData.notasMarginales || updateData.notes || '').toString().toUpperCase();
            updateData.notasMarginales = txt;
            updateData.notes = txt;
        }

        ['title', 'elemento', 'aeronave', 'matricula'].forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[field] = (updateData[field] || '').toString().toUpperCase();
            }
        });

        if (updateData.lat !== undefined || updateData.lng !== undefined) {
            const nLat = parseFloat(updateData.lat ?? event.lat);
            const nLng = parseFloat(updateData.lng ?? event.lng);
            
            updateData.lat = nLat;
            updateData.lng = nLng;
            updateData['ubicacion.lat'] = nLat;
            updateData['ubicacion.lng'] = nLng;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        const io = req.app.get('socketio');
        if (io && updatedEvent.isRealTime) {
            io.emit('updateOperation', updatedEvent);
        }

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al actualizar registro.' });
    }
};

// @desc    Eliminar registro y limpiar radar
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        const { elemento, role } = req.user;
        const isMando = role === 'admin' || role === 'boss' || elemento === 'DIR AE';
        const perteneceAUnidad = event.elemento && event.elemento.toUpperCase().includes(elemento.toUpperCase());
        const isOwner = event.createdBy.toString() === req.user._id.toString();

        if (!isMando && !isOwner && !perteneceAUnidad) {
            return res.status(403).json({ message: 'No tiene permisos para finalizar este vuelo.' });
        }

        const isRealTime = event.isRealTime;
        const eventId = event._id;

        await event.deleteOne();

        const io = req.app.get('socketio');
        if (io && isRealTime) {
            io.emit('deleteOperation', eventId);
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