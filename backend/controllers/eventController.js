const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Independencia: Soporte para vuelos tácticos sin registro en calendario.
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

// @desc    Obtener eventos filtrados por jerarquía (El calendario ignora vuelos sin fechas)
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

        // Importante: El calendario solo recibe eventos que tengan fecha de inicio definida
        const events = await Event.find(query).sort({ start: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(`❌ Error en getEvents: ${error.message}`);
        res.status(500).json({ message: 'Error de seguridad al recuperar el calendario.' });
    }
};

/**
 * @desc    Obtener operaciones para el Mapa Táctico (Solo tiempo real y activas)
 */
const getActiveOperations = async (req, res) => {
    try {
        // Ahora busca tanto 'en_curso' como 'en_desarrollo' (el nuevo estado táctico)
        const activeOps = await Event.find({ 
            isRealTime: true, 
            status: { $in: ['en_curso', 'en_desarrollo'] } 
        }).sort({ updatedAt: -1 });

        res.status(200).json(activeOps);
    } catch (error) {
        console.error(`❌ Error en getActiveOperations: ${error.message}`);
        res.status(500).json({ message: 'Error al recuperar mapa táctico.' });
    }
};

// @desc    Crear un nuevo evento (Vuelo Táctico o Actividad Programada)
const createEvent = async (req, res) => {
    try {
        const { 
            title, start, end, notes, color, esGlobal, 
            elemento, etapa, tipoApoyo, sdaListado,
            isRealTime, ubicacion, notasMarginales, status 
        } = req.body;

        // --- CORRECCIÓN CRÍTICA PARA INDEPENDENCIA DEL CALENDARIO ---
        // Si NO es tiempo real, exigimos fechas. 
        // Si ES tiempo real, permitimos que start/end sean nulos.
        if (!title) {
            return res.status(400).json({ message: 'El título es obligatorio.' });
        }

        if (!isRealTime && (!start || !end)) {
            return res.status(400).json({ message: 'Las actividades de agenda requieren horarios.' });
        }

        const isMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';
        
        const newEvent = new Event({ 
            title: title.toUpperCase(), 
            // Si hay fechas se parsean, si no, quedan como null en la DB
            start: start ? new Date(start) : null, 
            end: end ? new Date(end) : null, 
            notes: notes || '', 
            color: color || '#1b3a57',
            tipoApoyo: tipoApoyo || 'OPERATIVO',
            sdaListado: sdaListado || [], 
            createdBy: req.user._id,
            userName: req.user.username,
            elemento: (isMando && elemento) ? elemento : req.user.elemento,
            etapa: etapa || 'recepcion', 
            tipoOrigen: isMando ? 'COMANDO' : 'LOCAL',
            esGlobal: isMando ? (esGlobal || false) : false,
            
            isRealTime: isRealTime || false,
            ubicacion: ubicacion || { nombre: 'Punto No Definido', lat: 0, lng: 0 },
            notasMarginales: notasMarginales ? notasMarginales.toUpperCase() : '',
            status: status || 'programado'
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Fallo en la persistencia del evento operativo.' });
    }
};

// @desc    Actualizar evento (Permite actualizar posición o finalizar)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Evento no localizado.' });

        const esDuenio = event.createdBy && event.createdBy.toString() === req.user._id.toString();
        const esMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';

        if (!esDuenio && !esMando) {
            return res.status(403).json({ message: 'No tiene permisos para modificar este registro.' });
        }

        const updateData = { ...req.body };
        
        delete updateData._id; 
        delete updateData.__v;
        delete updateData.createdBy; 
        updateData.userName = req.user.username; 

        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        if (!esMando) {
            delete updateData.esGlobal;
            delete updateData.etapa;
            delete updateData.elemento;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al actualizar el registro operativo.' });
    }
};

// @desc    Eliminar un evento (Solo BOSS o ADMIN)
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'El registro no existe.' });

        if (req.user.role !== 'admin' && req.user.role !== 'boss') {
            return res.status(403).json({ message: 'Baja denegada: Nivel jerárquico insuficiente.' });
        }

        await event.deleteOne();
        res.status(200).json({ message: 'Registro eliminado del sistema.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Fallo al procesar la baja del registro.' });
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