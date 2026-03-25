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
         * El Mapa SÍ lee los vuelos en tiempo real. 
         * Los estados cubren todo el ciclo de vida en CargaTactica.
         */
        const activeOps = await Event.find({ 
            isRealTime: true,
            status: { $in: ['en_curso', 'en_desarrollo', 'programado', 'operativo'] } 
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
        
        // Creamos el objeto base
        const eventData = {
            title: title.toUpperCase(),
            notes: notes || '',
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: (isMando && elemento) ? elemento : req.user.elemento,
            status: status || 'programado'
        };

        // LÓGICA DE RAMIFICACIÓN: Si es Vuelo, aplicamos flags de invisibilidad para el Log
        if (isRealTime) {
            Object.assign(eventData, {
                isRealTime: true,
                tipoApoyo: 'VUELO', // Tag de exclusión crítica para el Log
                start: null, // Evita que aparezcan en la agenda temporal
                end: null,
                etapa: 'operativo',
                ubicacion: ubicacion || { nombre: 'Punto No Definido', lat: 0, lng: 0 },
                notasMarginales: notasMarginales ? notasMarginales.toUpperCase() : '',
                aeronave: (aeronave || '').toUpperCase(),
                matricula: (matricula || '').toUpperCase(),
                tipoIcono: tipoIcono || 'ala_rotativa'
            });
        } else {
            // Es una Orden de Tarea / Calendario
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

// @desc    Actualizar registro (Independiente)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Registro no localizado.' });

        const updateData = { ...req.body };
        
        // Limpieza de auditoría
        delete updateData._id; 
        updateData.updatedBy = req.user._id; 

        // SINCRO JOKER: Actualización atómica de ubicación para el mapa
        if (updateData.ubicacion) {
            const { lat, lng, nombre } = updateData.ubicacion;
            const updates = {};
            if (lat !== undefined) updates['ubicacion.lat'] = lat;
            if (lng !== undefined) updates['ubicacion.lng'] = lng;
            if (nombre !== undefined) updates['ubicacion.nombre'] = nombre;
            
            const updatedEvent = await Event.findByIdAndUpdate(
                req.params.id,
                { $set: { ...updateData, ...updates } }, 
                { new: true, runValidators: true }
            );
            return res.status(200).json(updatedEvent);
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al actualizar registro.' });
    }
};

// @desc    Eliminar registro (Independiente)
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'No existe el registro.' });

        // Seguridad: Solo el dueño o niveles superiores pueden borrar
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