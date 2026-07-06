const Event = require('../models/Event');
const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Acción: Segregación de Vuelos (Radar) vs Actividades (Calendario)
 */

// @desc    Obtener aeronaves disponibles (Solo las que están En Servicio E/S)
const getAvailableAircraft = async (req, res) => {
    try {
        let { elemento } = req.params;
        let query = { estado: 'E/S' };

        if (elemento && elemento !== 'all' && elemento !== 'undefined') {
            // Limpiamos espacios al inicio y al final
            elemento = elemento.trim();
            // Reemplazamos espacios múltiples por un comodín regex '.*' para evitar fallas de tipeo o formato
            const regexBusqueda = elemento.replace(/\s+/g, '.*');
            query.unidad = { $regex: regexBusqueda, $options: 'i' };
        }
        
        console.log(`✈️ [Backend] Buscando aeronaves con Query:`, query);
        
        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        
        console.log(`✅ [Backend] Aeronaves operativas devueltas: ${aircrafts.length}`);
        res.status(200).json(aircrafts);
    } catch (error) {
        console.error(`❌ Error en getAvailableAircraft: ${error.message}`);
        res.status(500).json({ message: "Error al obtener aeronaves disponibles" });
    }
};

// @desc    Obtener eventos para CALENDARIO (Excluye Vuelos en Tiempo Real)
const getEvents = async (req, res) => {
    try {
        const { elemento, role } = req.user; 
        const isMando = req.isMando; 
        
        let query = { isRealTime: false }; 

        const userRole = (role || '').toLowerCase();

        if (!isMando && userRole !== 'admin') {
            query.$or = [
                { 
                    isRealTime: false,
                    $or: [
                        { elemento: { $regex: elemento || '', $options: 'i' } },
                        { creadorUnidad: { $regex: elemento || '', $options: 'i' } }
                    ]
                },
                { 
                    isRealTime: false,
                    esGlobal: true,
                    etapa: 'ordenada'
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

// @desc    Obtener operaciones activas para el MAPA TÁCTICO Y LOG
const getActiveOperations = async (req, res) => {
    try {
        const { elemento, role } = req.user;
        const isMando = req.isMando;
        const userRole = (role || '').toLowerCase();

        let query = { 
            isRealTime: true,
            status: { $in: ['en_curso', 'en_desarrollo', 'operativo', 'emergencia', 'programado'] } 
        };

        if (!isMando && userRole !== 'admin') {
            query.$or = [
                { elemento: { $regex: elemento || '', $options: 'i' }, isRealTime: true },
                { esGlobal: true, isRealTime: true },
                { etapa: 'operativo', isRealTime: true }
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
            origen, destino, misionDetalle, mision,
            unidadApoyada, pntoContactoNom, pntoContactoTel,
            responsableNom, responsableTel
        } = req.body;

        if (!title) return res.status(400).json({ message: 'El título es obligatorio.' });

        const targetMatricula = matricula || misionDetalle?.matricula;
        if (targetMatricula && (isRealTime || tipoApoyo === 'VUELO')) {
            const aircraftExists = await Aircraft.findOne({ matricula: targetMatricula.toUpperCase() });
            if (!aircraftExists) {
                return res.status(404).json({ message: `La aeronave ${targetMatricula} no existe.` });
            }
        }

        const isMando = req.isMando || req.user.role?.toLowerCase() === 'admin';
        const userElemento = (req.user.elemento || 'DESCONOCIDO').toUpperCase();
        
        const eventData = {
            title: (title || '').toString().toUpperCase(),
            mision: (mision || 'OTROS').toString().toUpperCase(),
            notes: (notes || '').toString().toUpperCase(),
            notasMarginales: (notasMarginales || notes || '').toString().toUpperCase(),
            color: color || '#1b3a57',
            createdBy: req.user._id,
            userName: (req.user.username || req.user.name || 'OPERADOR').toUpperCase(),
            elemento: ((isMando && elemento) ? elemento : (elemento || userElemento)).toUpperCase(),
            creadorUnidad: userElemento, 
            status: (status || 'programado').toLowerCase(),
            isRealTime: isRealTime || false,
            matricula: (matricula || misionDetalle?.matricula || '').toUpperCase(),
            aeronave: (aeronave || misionDetalle?.aeronave || '').toUpperCase(),
            tipoIcono: tipoIcono || misionDetalle?.tipoIcono || 'ala_rotativa',
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
            unidadApoyada: (unidadApoyada || '').toUpperCase(),
            pntoContactoNom: (pntoContactoNom || '').toUpperCase(),
            pntoContactoTel: pntoContactoTel || '',
            responsableNom: (responsableNom || '').toUpperCase(),
            responsableTel: responsableTel || '',
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

        const isMando = req.isMando || req.user.role?.toLowerCase() === 'admin';
        const userElemento = (req.user.elemento || '').toUpperCase();
        const isOwner = event.createdBy.toString() === req.user._id.toString();
        const isCreatorUnit = event.creadorUnidad === userElemento;
        const isResponsibleUnit = event.elemento === userElemento;

        const canEdit = isMando || isOwner || isCreatorUnit || (isResponsibleUnit && ['revision', 'ordenada'].includes(event.etapa));

        if (!canEdit) {
            return res.status(403).json({ message: 'No tiene permisos para editar este registro.' });
        }

        const updateData = { ...req.body };
        delete updateData._id; 
        delete updateData.createdBy;
        delete updateData.creadorUnidad; 
        
        updateData.updatedBy = req.user._id; 
        updateData.userName = (req.user.username || req.user.name || 'OPERADOR').toUpperCase();

        if (updateData.title) updateData.title = updateData.title.toUpperCase();
        if (updateData.mision) updateData.mision = updateData.mision.toUpperCase();
        if (updateData.notes) updateData.notes = updateData.notes.toUpperCase();
        if (updateData.unidadApoyada) updateData.unidadApoyada = updateData.unidadApoyada.toUpperCase();

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

        const isMando = req.isMando || req.user.role?.toLowerCase() === 'admin';
        const isOwner = event.createdBy.toString() === req.user._id.toString();
        const isCreatorUnit = event.creadorUnidad === (req.user.elemento || '').toUpperCase();

        if (!isMando && !isOwner && !isCreatorUnit) {
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