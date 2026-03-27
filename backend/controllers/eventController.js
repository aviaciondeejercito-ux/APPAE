const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Optimizado)
 * - Actualizaciones Atómicas en MongoDB.
 * - Sincro Real-Time: Integración con WebSockets para el Mapa Táctico.
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

// @desc    Obtener eventos para CALENDARIO Y LOG (Filtra la gestión administrativa)
const getEvents = async (req, res) => {
    try {
        const { elemento, role } = req.user; 
        
        let query = { 
            isRealTime: { $ne: true },
            tipoApoyo: { $ne: 'VUELO' } 
        };

        const isMando = role === 'admin' || role === 'boss' || elemento === 'DIR AE';

        if (!isMando) {
            query = {
                ...query,
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
        res.status(500).json({ message: 'Error al recuperar el registro de órdenes.' });
    }
};

// @desc    Obtener operaciones activas para el MAPA TÁCTICO (Sincronizado con CargaTactica)
const getActiveOperations = async (req, res) => {
    try {
        // AJUSTE CRÍTICO: Eliminamos la restricción rígida de 'etapa' para que lea todo lo marcado como RealTime y Activo
        const activeOps = await Event.find({ 
            isRealTime: true,
            status: { $in: ['en_curso', 'en_desarrollo', 'programado', 'operativo', 'disponible', 'emergencia'] } 
        }).sort({ updatedAt: -1 });

        res.status(200).json(activeOps);
    } catch (error) {
        console.error(`❌ Error en getActiveOperations: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar mapa táctico.' });
    }
};

// @desc    Crear un nuevo registro (Diferencia automáticamente Vuelo de Orden Administrativa)
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
        
        const eventData = {
            title: title.toUpperCase(),
            notes: (notes || '').toUpperCase(),
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: ((isMando && elemento) ? elemento : req.user.elemento).toUpperCase(),
            status: status || 'programado'
        };

        if (isRealTime) {
            // Sincronización con el nuevo formato de CargaTactica
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
                    nombre: (ubicacion?.nombre || 'POSICIÓN POR COORDENADAS').toUpperCase(),
                    lat: parseFloat(finalLat),
                    lng: parseFloat(finalLng)
                },
                notasMarginales: notasMarginales ? notasMarginales.toUpperCase() : 'SIN NOVEDAD',
                aeronave: (aeronave || '').toUpperCase(),
                matricula: (matricula || '').toUpperCase(),
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
                tipoOrigen: isMando ? 'COMANDO' : 'LOCAL',
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
        res.status(400).json({ message: 'Error en la persistencia del registro.' });
    }
};

// @desc    Actualizar registro (Sincronización Atómica y Real-Time)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Registro no localizado.' });

        const updateData = { ...req.body };
        
        delete updateData._id; 
        delete updateData.createdBy;
        updateData.updatedBy = req.user._id; 

        ['title', 'notes', 'elemento', 'aeronave', 'matricula', 'notasMarginales'].forEach(field => {
            if (updateData[field]) updateData[field] = updateData[field].toUpperCase();
        });

        // PROTOCOLO ATÓMICO: Si viene lat/lng en raíz (CargaTactica), lo subimos a ubicacion también
        if (updateData.lat !== undefined) {
            updateData['ubicacion.lat'] = parseFloat(updateData.lat);
        }
        if (updateData.lng !== undefined) {
            updateData['ubicacion.lng'] = parseFloat(updateData.lng);
        }

        if (updateData.ubicacion && typeof updateData.ubicacion === 'object') {
            const { lat, lng, nombre } = updateData.ubicacion;
            if (lat !== undefined) {
                updateData['ubicacion.lat'] = parseFloat(lat);
                updateData.lat = parseFloat(lat); // Sincronía en raíz
            }
            if (lng !== undefined) {
                updateData['ubicacion.lng'] = parseFloat(lng);
                updateData.lng = parseFloat(lng); // Sincronía en raíz
            }
            if (nombre !== undefined) updateData['ubicacion.nombre'] = nombre.toUpperCase();
            delete updateData.ubicacion; 
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
        res.status(400).json({ message: 'Error al actualizar el registro operativo.' });
    }
};

// @desc    Eliminar registro y limpiar radar
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        const esDuenio = event.createdBy && event.createdBy.toString() === req.user._id.toString();
        const esMando = req.user.role === 'admin' || req.user.role === 'boss';

        if (!esDuenio && !esMando) {
            return res.status(403).json({ message: 'Permiso denegado para borrar.' });
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