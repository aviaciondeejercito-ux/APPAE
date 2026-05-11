const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * CONTROLADOR DE TRIPULANTES - GESTIÓN DE LEGAJOS AE
 * Restricción estricta: Solo ADMIN y USER de la unidad.
 */

// 1. Crear Tripulante
exports.crearTripulante = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const { unidad } = req.body;

        // Solo admin o user de la misma unidad
        const role = usuarioLogueado.role?.toLowerCase();
        if (role !== 'admin' && usuarioLogueado.unidad !== unidad) {
            return res.status(403).json({ mensaje: "No tienes permiso para dar de alta personal en otra unidad" });
        }

        const datosNuevoTripulante = {
            ...req.body,
            ultimoEditor: usuarioLogueado._id,
            fechaUltimaModificacion: Date.now()
        };

        const nuevoTripulante = new Tripulante(datosNuevoTripulante);
        await nuevoTripulante.save();

        // CORRECCIÓN: Se añade usuarioUnidad
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad, // <--- CAMPO REQUERIDO POR EL MODELO
            accion: 'CREACION',
            entidadAfectada: `Tripulante: ${nuevoTripulante.grado} ${nuevoTripulante.apellido}`,
            cambios: { nuevo: nuevoTripulante }
        });

        res.status(201).json({ mensaje: "Tripulante creado con éxito", nuevoTripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al crear tripulante", error: error.message });
    }
};

// 2. Obtener Tripulantes (Optimizado con índices)
exports.obtenerTripulantes = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const role = usuarioLogueado.role?.toLowerCase();
        let filtro = { activo: true };

        if (role !== 'admin') {
            filtro.unidad = usuarioLogueado.unidad;
        } else if (req.query.unidad && req.query.unidad !== 'all') {
            filtro.unidad = req.query.unidad;
        }

        const tripulantes = await Tripulante.find(filtro)
            .populate('ultimoEditor', 'grado apellido')
            .sort({ apellido: 1 })
            .lean();

        res.status(200).json(tripulantes);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener tripulantes", error: error.message });
    }
};

// 3. Actualizar Tripulante
exports.actualizarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const role = usuarioLogueado.role?.toLowerCase();

        const tripulantePrevio = await Tripulante.findById(id);
        if (!tripulantePrevio) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (role !== 'admin' && usuarioLogueado.unidad !== tripulantePrevio.unidad) {
            return res.status(403).json({ mensaje: "Acceso denegado: No pertenece a tu unidad" });
        }

        const cambiosRealizados = {};
        for (const key in req.body) {
            if (JSON.stringify(tripulantePrevio[key]) !== JSON.stringify(req.body[key])) {
                cambiosRealizados[key] = {
                    anterior: tripulantePrevio[key],
                    nuevo: req.body[key]
                };
            }
        }

        req.body.ultimoEditor = usuarioLogueado._id;
        req.body.fechaUltimaModificacion = Date.now();

        const actualizado = await Tripulante.findByIdAndUpdate(
            id, 
            { $set: req.body }, 
            { new: true, runValidators: true }
        );

        // CORRECCIÓN: Se añade usuarioUnidad
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad, // <--- CAMPO REQUERIDO POR EL MODELO
            accion: 'MODIFICACION',
            entidadAfectada: `Tripulante: ${actualizado.grado} ${actualizado.apellido}`,
            cambios: cambiosRealizados 
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
        const role = usuarioLogueado.role?.toLowerCase();

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No tienes permiso para eliminar este registro" });
        }

        await Tripulante.findByIdAndDelete(id);

        // CORRECCIÓN: Se añade usuarioUnidad
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad, // <--- CAMPO REQUERIDO POR EL MODELO
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante: ${tripulante.grado} ${tripulante.apellido} (Unidad: ${tripulante.unidad})`,
            cambios: { eliminado: tripulante }
        });

        res.status(200).json({ mensaje: "Tripulante eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar", error: error.message });
    }
};

// 5. Agregar Capacitación Especial
exports.agregarCapacitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const tripulante = await Tripulante.findById(id);
        const role = usuarioLogueado.role?.toLowerCase();

        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No autorizado" });
        }

        tripulante.capacitacionesEspeciales.push(req.body);
        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        
        await tripulante.save();

        // CORRECCIÓN: Se añade usuarioUnidad
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad, // <--- CAMPO REQUERIDO POR EL MODELO
            accion: 'MODIFICACION',
            entidadAfectada: `Nueva Capacitación: ${req.body.tipo} para ${tripulante.apellido}`,
        });

        res.status(200).json({ mensaje: "Capacitación añadida", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error", error: error.message });
    }
};

// 6. Buscar Tripulante
exports.buscarTripulante = async (req, res) => {
    try {
        const { termino } = req.params;
        const usuario = req.user;
        const role = usuario.role?.toLowerCase();
        
        let query = {
            $or: [
                { apellido: { $regex: termino, $options: 'i' } },
                { nombre: { $regex: termino, $options: 'i' } }
            ]
        };

        if (role !== 'admin') query.unidad = usuario.unidad;

        const resultados = await Tripulante.find(query)
            .populate('ultimoEditor', 'grado apellido')
            .limit(10)
            .lean();

        res.status(200).json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: "Error", error: error.message });
    }
};