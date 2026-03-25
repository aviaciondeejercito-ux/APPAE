const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: Segregación total entre Gestión Administrativa y Operaciones de Vuelo.
 * Objetivo: Que los vuelos NO ensucien el Log de Órdenes ni el Calendario.
 */

// @desc    Obtener aeronaves disponibles (Solo las que están En Servicio E/S)
const getAvailableAircraft = async (req, res) => {
    try {
        const { elemento } = req.params;
        let query = { estado: 'E/S' };

        if (elemento !== 'all') {
            query.unidad = { $regex: elemento, $options: 'i' };
        }
        
        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        res.status(200).json(aircrafts);
    } catch (error) {
        console.error(`❌ Error en getAvailableAircraft: ${error.message}`);
        res.status(500).json({ message: "Error al obtener aeronaves disponibles" });
    }
};

// @desc    Obtener eventos para CALENDARIO Y LOG (Ignora Vuelos por completo)
const getEvents = async (req, res) => {
    try {
        const { elemento, role } = req.user; 
        
        /**
         * FILTRO DE INDEPENDENCIA: 
         * Se excluye todo lo que tenga 'isRealTime: true' (Vuelos)
         * y todo lo que tenga categoría 'VUELO'.
         */
        let query = { 
            isRealTime: { $ne: true },
            tipoApoyo: { $ne: 'VUELO' } 
        };

        if (role === 'admin' || role === 'boss' || elemento === 'DIR AE') {
            // Acceso total a órdenes, pero sigue ignorando vuelos
        } 
        else {
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

// @desc    Obtener operaciones para el MAPA (Único canal comunicado con vuelos)
const getActiveOperations = async (req, res) => {
    try {
        /**
         * SINCRO JOKER: Ajuste de filtros para asegurar visibilidad en el mapa.
         * Se incluyen todos los estados operativos definidos en el Modelo.
         */
        const activeOps = await Event.find({ 
            isRealTime: true,
            status: { $in: ['en_curso', 'en_desarrollo', 'programado', 'operativo', 'disponible'] } 
        }).sort({ updatedAt: -1 });

        res.status(200).json(activeOps);
    } catch (error) {
        console.error(`❌ Error en getActiveOperations: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar mapa táctico.' });
    }
};

// @desc    Crear un nuevo registro (Diferencia automáticamente Vuelo de Orden)
const createEvent = async (req, res) => {
    try {
        const { 
            title, start, end, notes, color, esGlobal, 
            elemento, etapa, tipoApoyo, sdaListado,
            isRealTime, ubicacion, notasMarginales, status,
            aeronave, matricula, tipoIcono 
        } = req.body;

        if (!title) return res.status(400).json({ message: 'Título requerido.' });

        const isMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';
        
        const eventData = {
            title: title.toUpperCase(),
            notes: notes || '',
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: (isMando && elemento) ? elemento : req.user.elemento,
            status: status || 'programado'
        };

        if (isRealTime) {
            Object.assign(eventData, {
                isRealTime: true,
                tipoApoyo: 'VUELO',
                start: null,
                end: null,
                etapa: 'operativo',
                ubicacion: {
                    nombre: ubicacion?.nombre || 'Punto No Definido',
                    lat: ubicacion?.lat ? parseFloat(ubicacion.lat) : 0,
                    lng: ubicacion?.lng ? parseFloat(ubicacion.lng) : 0
                },
                notasMarginales: notasMarginales ? notasMarginales.toUpperCase() : '',
                aeronave: (aeronave || '').toUpperCase(),
                matricula: (matricula || '').toUpperCase(),
                tipoIcono: tipoIcono || 'ala_rotativa'
            });
        } else {
            Object.assign(eventData, {
                isRealTime: false,
                tipoApoyo: tipoApoyo || 'GESTION',
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
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Error en la persistencia del registro.' });
    }
};

// @desc    Actualizar registro (Blindado contra Error 400 y Desplazamiento de Coordenadas)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Registro no localizado.' });

        const updateData = { ...req.body };
        
        // SEGURIDAD: Nunca modificar el _id ni el creador original
        delete updateData._id; 
        delete updateData.createdBy;
        updateData.updatedBy = req.user._id; 

        if (updateData.title) updateData.title = updateData.title.toUpperCase();

        /**
         * SINCRO JOKER - ACTUALIZACIÓN ATÓMICA DE UBICACIÓN
         * Si viene el objeto ubicacion, usamos la notación de punto para no sobrescribir 
         * el objeto entero en MongoDB, evitando perder datos parciales.
         */
        if (updateData.ubicacion && typeof updateData.ubicacion === 'object') {
            const { lat, lng, nombre } = updateData.ubicacion;
            
            if (lat !== undefined) updateData['ubicacion.lat'] = parseFloat(lat);
            if (lng !== undefined) updateData['ubicacion.lng'] = parseFloat(lng);
            if (nombre !== undefined) updateData['ubicacion.nombre'] = nombre;
            
            // Eliminamos el objeto raíz para usar los campos planos definidos arriba
            delete updateData.ubicacion;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al actualizar el registro operativo. Verifique el formato.' });
    }
};

// @desc    Eliminar registro (Independiente)
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        const esDuenio = event.createdBy && event.createdBy.toString() === req.user._id.toString();
        const esMando = req.user.role === 'admin' || req.user.role === 'boss';

        if (!esDuenio && !esMando) {
            return res.status(403).json({ message: 'Permiso denegado para borrar.' });
        }

        await event.deleteOne();
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