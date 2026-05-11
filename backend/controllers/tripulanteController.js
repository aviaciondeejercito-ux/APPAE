const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * CONTROLADOR DE TRIPULANTES - GESTIÓN DE LEGAJOS AE
 * Estándar de seguridad: Restricción por Unidad y Rol.
 */

// 1. Crear Tripulante
exports.crearTripulante = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const { unidad } = req.body;

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
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento, 
            accion: 'CREACION',
            entidadAfectada: `Tripulante: ${nuevoTripulante.grado} ${nuevoTripulante.apellido}`,
            cambios: { nuevo: nuevoTripulante }
        });

        res.status(201).json({ mensaje: "Tripulante creado con éxito", nuevoTripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al crear tripulante", error: error.message });
    }
};

// 2. Gestionar Habilitación (NUEVA FUNCIÓN ACUMULATIVA)
exports.gestionarHabilitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { aeronave, fechaHabilitacion, rolActual, observaciones } = req.body;
        const usuarioLogueado = req.user;

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        // Verificación de permisos
        const role = usuarioLogueado.role?.toLowerCase();
        if (role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No autorizado para modificar este legajo" });
        }

        // Buscar si ya existe la habilitación para esa aeronave específica
        const index = tripulante.habilitaciones.findIndex(h => h.aeronave === aeronave);

        if (index !== -1) {
            // Si ya existe, guardamos el rol anterior en el historial si cambió
            const anterior = tripulante.habilitaciones[index];
            if (anterior.rolActual !== rolActual) {
                tripulante.habilitaciones[index].historialRoles.push({
                    rol: anterior.rolActual,
                    fechaDesde: anterior.fechaHabilitacion,
                    fechaHasta: new Date()
                });
            }
            // Actualizamos datos actuales
            tripulante.habilitaciones[index].rolActual = rolActual;
            tripulante.habilitaciones[index].fechaHabilitacion = fechaHabilitacion;
            tripulante.habilitaciones[index].observaciones = observaciones;
        } else {
            // Si no existe, la añadimos (Acumulativa)
            tripulante.habilitaciones.push({
                aeronave,
                fechaHabilitacion,
                rolActual,
                observaciones
            });
        }

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento,
            accion: 'MODIFICACION',
            entidadAfectada: `Habilitación SdA: ${aeronave} - ${tripulante.apellido}`,
            detalles: `Actualización de capacidad a ${rolActual}`
        });

        res.status(200).json({ mensaje: "Habilitación actualizada correctamente", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al gestionar habilitación", error: error.message });
    }
};

// 3. Obtener Tripulantes
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

// 4. Actualizar Tripulante (General)
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

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento,
            accion: 'MODIFICACION',
            entidadAfectada: `Tripulante: ${actualizado.grado} ${actualizado.apellido}`,
            cambios: cambiosRealizados 
        });

        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ mensaje: "Error al actualizar", error: error.message });
    }
};

// 5. Eliminar Tripulante
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
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento,
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante: ${tripulante.grado} ${tripulante.apellido} (Unidad: ${tripulante.unidad})`,
            cambios: { eliminado: tripulante }
        });

        res.status(200).json({ mensaje: "Tripulante eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar", error: error.message });
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