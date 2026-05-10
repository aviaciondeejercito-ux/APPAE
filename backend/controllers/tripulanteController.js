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

// 2. Obtener Tripulantes (Optimizado con índices)
exports.obtenerTripulantes = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const role = usuarioLogueado.role?.toLowerCase();
        let filtro = { activo: true };

        // Si no es admin, solo ve su unidad
        if (role !== 'admin') {
            filtro.unidad = usuarioLogueado.unidad;
        } else if (req.query.unidad && req.query.unidad !== 'all') {
            filtro.unidad = req.query.unidad;
        }

        const tripulantes = await Tripulante.find(filtro)
            .populate('ultimoEditor', 'grado apellido')
            .sort({ apellido: 1 })
            .lean(); // .lean() para mayor velocidad de lectura

        res.status(200).json(tripulantes);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener tripulantes", error: error.message });
    }
};

// 3. Actualizar Tripulante (Auditoría Forense de cambios)
exports.actualizarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const role = usuarioLogueado.role?.toLowerCase();

        const tripulantePrevio = await Tripulante.findById(id);
        if (!tripulantePrevio) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        // Solo admin o user de la misma unidad
        if (role !== 'admin' && usuarioLogueado.unidad !== tripulantePrevio.unidad) {
            return res.status(403).json({ mensaje: "Acceso denegado: No pertenece a tu unidad" });
        }

        // Detectar qué campos específicos cambiaron para la auditoría
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

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            accion: 'MODIFICACION',
            entidadAfectada: `Tripulante: ${actualizado.grado} ${actualizado.apellido}`,
            cambios: cambiosRealizados // Registro detallado de cada campo modificado
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

// 5. Agregar Capacitación Especial
exports.agregarCapacitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const tripulante = await Tripulante.findById(id);
        const role = req.user.role?.toLowerCase();

        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (role !== 'admin' && req.user.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No autorizado" });
        }

        tripulante.capacitacionesEspeciales.push(req.body);
        tripulante.ultimoEditor = req.user._id;
        tripulante.fechaUltimaModificacion = Date.now();
        
        await tripulante.save();

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

// 6. Buscar Tripulante (Búsqueda optimizada por índices)
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

        // Uso de limit para optimizar la velocidad de respuesta del buscador
        const resultados = await Tripulante.find(query)
            .populate('ultimoEditor', 'grado apellido')
            .limit(10)
            .lean();

        res.status(200).json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: "Error", error: error.message });
    }
};