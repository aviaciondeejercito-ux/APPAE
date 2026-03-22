const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Estándar actualizado: BOSS y ADMIN (Control Total y Gestión Global).
 */

// @desc    Obtener aeronaves disponibles (Solo las que están En Servicio E/S)
const getAvailableAircraft = async (req, res) => {
    try {
        const { elemento } = req.params;
        let query = { estado: 'E/S' };

        // Si el elemento no es 'all', filtramos por la unidad específica
        if (elemento !== 'all') {
            query.unidad = { $regex: elemento, $options: 'i' };
        }
        
        // Buscamos aeronaves que cumplan el estado E/S
        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        
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

        // BOSS y ADMIN ven TODO el despliegue
        if (role === 'admin' || role === 'boss' || elemento === 'DIR AE') {
            query = {}; 
        } 
        else {
            // Usuarios de unidad ven lo suyo y lo que DIR AE marca como Global
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

/**
 * @desc    Obtener operaciones para el Mapa Táctico (Solo tiempo real y activas)
 * @access  Privado (Admin/Boss)
 */
const getActiveOperations = async (req, res) => {
    try {
        // Solo misiones marcadas como RealTime que no hayan finalizado
        const activeOps = await Event.find({ 
            isRealTime: true, 
            status: 'en_curso' 
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

        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Datos críticos faltantes (Título/Horarios).' });
        }

        const isMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';
        
        const newEvent = new Event({ 
            title: title.toUpperCase(), 
            start: new Date(start), 
            end: new Date(end), 
            notes: notes || '', 
            color: color || '#1b3a57',
            tipoApoyo: tipoApoyo || 'OPERATIVO',
            sdaListado: sdaListado || [], 
            createdBy: req.user._id,
            userName: req.user.username,
            // Si es mando puede asignar a otra unidad, si no, se auto-asigna su unidad
            elemento: (isMando && elemento) ? elemento : req.user.elemento,
            etapa: etapa || 'recepcion', 
            tipoOrigen: isMando ? 'COMANDO' : 'LOCAL',
            esGlobal: isMando ? (esGlobal || false) : false,
            
            // Lógica para el Mapa Táctico
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

// @desc    Actualizar evento (Permite actualizar posición en tiempo real)
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
        
        // Limpieza de datos sensibles
        delete updateData._id; 
        delete updateData.__v;
        delete updateData.createdBy; 
        updateData.userName = req.user.username; 

        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        // Seguridad: Solo el mando cambia la etapa o la unidad responsable
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

        // Restricción jerárquica para eliminar
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