const Event = require('../models/Event');

/**
 * CONTROLADOR DE EVENTOS - SISTEMA GESTIÓN AE
 * Seguridad: Validación de roles, trazabilidad y permisos diferenciados.
 * Estándar actualizado: BOSS y ADMIN (Control Total y Gestión Global).
 * Flujo de Aprobación DIR AE: Recepción -> Revisión -> Ordenada.
 */

// @desc    Obtener eventos filtrados por jerarquía, unidad y estado de aprobación
const getEvents = async (req, res) => {
    try {
        const { elemento, role } = req.user; 
        let query = {};

        /**
         * LÓGICA DE VISIÓN TOTAL (DIR AE / ADMIN / BOSS):
         * Acceso completo a todas las etapas del flujo de trabajo y todas las unidades.
         */
        if (role === 'admin' || role === 'boss' || elemento === 'DIR AE') {
            query = {}; 
        } 
        /**
         * LÓGICA DE UNIDAD (FILTRO DE SEGURIDAD OPERATIVA):
         * Una unidad solo ve:
         * 1. Sus propios eventos (locales).
         * 2. Eventos donde es destinataria Y están en etapa 'ordenada'.
         */
        else {
            query = {
                $or: [
                    { elemento: { $regex: elemento, $options: 'i' } }, // Actividades donde la unidad está mencionada
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

// @desc    Crear un nuevo evento con segmentación de etapa y destino
const createEvent = async (req, res) => {
    try {
        // Capturamos sdaListado explícitamente del body
        const { 
            title, start, end, notes, color, esGlobal, 
            elemento, etapa, tipoApoyo, sdaListado 
        } = req.body;

        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Datos incompletos.' });
        }

        const isMando = req.user.role === 'admin' || req.user.role === 'boss' || req.user.elemento === 'DIR AE';
        
        const newEvent = new Event({ 
            title, 
            start: new Date(start), 
            end: new Date(end), 
            notes: notes || '', 
            color: color || '#1b3a57',
            tipoApoyo: tipoApoyo || '',
            sdaListado: sdaListado || [], // Persistencia del array de medios
            createdBy: req.user._id,
            userName: req.user.username,
            // Si es Mando, el 'elemento' puede ser una lista de unidades. Si no, su unidad.
            elemento: (isMando && elemento) ? elemento : req.user.elemento,
            etapa: etapa || 'recepcion', 
            tipoOrigen: isMando ? 'COMANDO' : 'LOCAL',
            esGlobal: isMando ? (esGlobal || false) : false
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`❌ Error en createEvent: ${error.message}`);
        res.status(400).json({ message: 'Error al registrar el evento.' });
    }
};

// @desc    Actualizar evento (Permite avanzar etapas en el flujo DIR AE)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Evento no localizado.' });

        // SEGURIDAD: Solo el creador, el ADMIN o el BOSS pueden editar.
        const esDuenio = event.createdBy && event.createdBy.toString() === req.user._id.toString();
        const esMando = req.user.role === 'admin' || req.user.role === 'boss';

        if (!esDuenio && !esMando) {
            return res.status(403).json({ message: 'No tiene permisos para modificar esta orden.' });
        }

        // Preparamos los datos para actualización atómica
        const updateData = { 
            ...req.body,
            userName: req.user.username // Trazabilidad de quién editó por última vez
        };
        
        // Conversión de fechas para asegurar formato Date en MongoDB
        if (updateData.start) updateData.start = new Date(updateData.start);
        if (updateData.end) updateData.end = new Date(updateData.end);

        // Si un usuario NO es mando, no puede cambiar el campo esGlobal ni la etapa por fuerza
        if (!esMando) {
            delete updateData.esGlobal;
            delete updateData.etapa;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, // Usamos $set para seguridad atómica
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error(`❌ Error en updateEvent: ${error.message}`);
        res.status(400).json({ message: 'Fallo al actualizar el registro operativo.' });
    }
};

// @desc    Eliminar un evento
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'El evento no existe.' });

        // SEGURIDAD MÁXIMA: Solo BOSS y ADMIN pueden borrar registros operativos.
        if (req.user.role !== 'admin' && req.user.role !== 'boss') {
            return res.status(403).json({ message: 'Baja denegada: Requiere nivel BOSS o superior.' });
        }

        await event.deleteOne();
        res.status(200).json({ message: 'Registro eliminado correctamente.' });
    } catch (error) {
        console.error(`❌ Error en deleteEvent: ${error.message}`);
        res.status(500).json({ message: 'Error al procesar la baja del evento.' });
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};