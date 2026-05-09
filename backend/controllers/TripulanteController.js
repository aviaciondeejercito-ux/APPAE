const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria'); // Importamos el modelo de auditoría

// 1. Crear Tripulante (Solo ADMIN o USER de la misma unidad)
exports.crearTripulante = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        
        if (usuarioLogueado.role !== 'admin' && usuarioLogueado.unidad !== req.body.unidad) {
            return res.status(403).json({ mensaje: "No tienes permiso para dar de alta personal en otra unidad" });
        }

        // Asignamos el creador como primer editor
        const datosNuevoTripulante = {
            ...req.body,
            ultimoEditor: usuarioLogueado._id,
            fechaUltimaModificacion: Date.now()
        };

        const nuevoTripulante = new Tripulante(datosNuevoTripulante);
        await nuevoTripulante.save();

        // Registro en Auditoría
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            accion: 'CREACION',
            entidadAfectada: `Tripulante: ${nuevoTripulante.grado} ${nuevoTripulante.apellido}`,
            cambios: { nuevo: nuevoTripulante }
        });

        res.status(201).json({ mensaje: "Tripulante creado con éxito", nuevoTripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al crear tripulante", error: error.message });
    }
};

// 2. Obtener Tripulantes (Filtro automático por unidad)
exports.obtenerTripulantes = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        let filtro = {};

        if (usuarioLogueado.role !== 'admin') {
            filtro.unidad = usuarioLogueado.unidad;
        } else if (req.query.unidad) {
            filtro.unidad = req.query.unidad;
        }

        const tripulantes = await Tripulante.find(filtro)
            .populate('ultimoEditor', 'grado apellido') // Para ver quién fue el último que lo tocó
            .sort({ apellido: 1 });
        res.status(200).json(tripulantes);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener tripulantes", error: error.message });
    }
};

// 3. Actualizar Tripulante (Con Auditoría de cambios)
exports.actualizarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;

        const tripulantePrevio = await Tripulante.findById(id);
        if (!tripulantePrevio) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        // Seguridad: ADMIN o misma Unidad
        if (usuarioLogueado.role !== 'admin' && usuarioLogueado.unidad !== tripulantePrevio.unidad) {
            return res.status(403).json({ mensaje: "Acceso denegado: No pertenece a tu unidad" });
        }

        // Actualizamos campos de auditoría interna
        req.body.ultimoEditor = usuarioLogueado._id;
        req.body.fechaUltimaModificacion = Date.now();

        const actualizado = await Tripulante.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

        // Registro detallado en Auditoría
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            accion: 'MODIFICACION',
            entidadAfectada: `Tripulante: ${actualizado.grado} ${actualizado.apellido}`,
            cambios: {
                anterior: tripulantePrevio.totalesHistoricos, // Ejemplo: trackear si cambiaron las horas
                nuevo: actualizado.totalesHistoricos
            }
        });

        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ mensaje: "Error al actualizar", error: error.message });
    }
};

// 4. Eliminar Tripulante
exports.eliminarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (usuarioLogueado.role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No tienes permiso para eliminar este registro" });
        }

        await Tripulante.findByIdAndDelete(id);

        // Registro en Auditoría
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante: ${tripulante.grado} ${tripulante.apellido} (Unidad: ${tripulante.unidad})`,
            cambios: { eliminado: tripulante }
        });

        res.status(200).json({ mensaje: "Tripulante eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar", error: error.message });
    }
};

// 5. Agregar Capacitación
exports.agregarCapacitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const tripulante = await Tripulante.findById(id);
        
        if (req.user.role !== 'admin' && req.user.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No autorizado" });
        }

        // Actualizamos auditoría interna del modelo
        tripulante.capacitacionesEspeciales.push(req.body);
        tripulante.ultimoEditor = req.user._id;
        tripulante.fechaUltimaModificacion = Date.now();
        
        await tripulante.save();

        // Registro en Auditoría
        await Auditoria.create({
            usuarioId: req.user._id,
            usuarioNombre: `${req.user.grado} ${req.user.apellido}`,
            accion: 'MODIFICACION',
            entidadAfectada: `Nueva Capacitación: ${req.body.tipo} para ${tripulante.apellido}`,
        });

        res.status(200).json({ mensaje: "Capacitación añadida", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error", error: error.message });
    }
};

// 6. Buscar por Apellido/Nombre
exports.buscarTripulante = async (req, res) => {
    try {
        const { termino } = req.params;
        const usuario = req.user;
        
        let query = {
            $or: [
                { apellido: { $regex: termino, $options: 'i' } },
                { nombre: { $regex: termino, $options: 'i' } }
            ]
        };

        if (usuario.role !== 'admin') query.unidad = usuario.unidad;

        const resultados = await Tripulante.find(query).populate('ultimoEditor', 'grado apellido');
        res.status(200).json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: "Error", error: error.message });
    }
};