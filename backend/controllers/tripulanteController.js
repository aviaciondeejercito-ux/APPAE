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
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U", 
            accion: 'CREACION',
            entidadAfectada: `Tripulante: ${nuevoTripulante.grado} ${nuevoTripulante.apellido}`,
            entidadId: nuevoTripulante._id,
            cambios: { nuevo: nuevoTripulante }
        });

        res.status(201).json({ mensaje: "Tripulante creado con éxito", nuevoTripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al crear tripulante", error: error.message });
    }
};

// 2. Gestionar Habilitación SdA (Corregido con Desglose de Horas)
exports.gestionarHabilitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            aeronave, 
            fechaHabilitacion, 
            rolActual, 
            hsVisual, 
            hsInstrumental, 
            hsNocturno, 
            hsNVG, 
            observaciones 
        } = req.body;
        const usuarioLogueado = req.user;

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        const role = usuarioLogueado.role?.toLowerCase();
        if (role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No autorizado para modificar este legajo" });
        }

        // Convertimos a números para evitar errores de concatenación de strings
        const v = Number(hsVisual || 0);
        const i = Number(hsInstrumental || 0);
        const n = Number(hsNocturno || 0);
        const nvg = Number(hsNVG || 0);
        const totalSdA = v + i + n + nvg;

        const index = tripulante.habilitaciones.findIndex(h => h.aeronave === aeronave);

        if (index !== -1) {
            const anterior = tripulante.habilitaciones[index];
            if (anterior.rolActual !== rolActual) {
                tripulante.habilitaciones[index].historialRoles.push({
                    rol: anterior.rolActual,
                    fechaDesde: anterior.fechaHabilitacion,
                    fechaHasta: new Date()
                });
            }
            // Actualización de datos y desgloses
            tripulante.habilitaciones[index].rolActual = rolActual;
            tripulante.habilitaciones[index].fechaHabilitacion = fechaHabilitacion;
            tripulante.habilitaciones[index].hsVisual = v;
            tripulante.habilitaciones[index].hsInstrumental = i;
            tripulante.habilitaciones[index].hsNocturno = n;
            tripulante.habilitaciones[index].hsNVG = nvg;
            tripulante.habilitaciones[index].totalHorasSistema = totalSdA;
            tripulante.habilitaciones[index].observaciones = observaciones;
        } else {
            // Nueva habilitación con desgloses iniciales
            tripulante.habilitaciones.push({
                aeronave,
                fechaHabilitacion,
                rolActual,
                hsVisual: v,
                hsInstrumental: i,
                hsNocturno: n,
                hsNVG: nvg,
                totalHorasSistema: totalSdA,
                observaciones
            });
        }

        // --- RECALCULO DE TOTALES HISTÓRICOS (Sincronización hacia arriba) ---
        const recalculo = tripulante.habilitaciones.reduce((acc, hab) => {
            acc.v += Number(hab.hsVisual || 0);
            acc.i += Number(hab.hsInstrumental || 0);
            acc.n += Number(hab.hsNocturno || 0);
            acc.nvg += Number(hab.hsNVG || 0);
            return acc;
        }, { v: 0, i: 0, n: 0, nvg: 0 });

        tripulante.totalesHistoricos.vueloDiurno = recalculo.v;
        tripulante.totalesHistoricos.vueloInstrumental = recalculo.i;
        tripulante.totalesHistoricos.vueloNocturno = recalculo.n;
        tripulante.totalesHistoricos.vueloVisual = recalculo.nvg; // Guardamos NVG en el campo Visual histórico (ajustar según prefieras)

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'MODIFICACION',
            entidadAfectada: `Habilitación SdA: ${aeronave} - ${tripulante.apellido}`,
            entidadId: tripulante._id,
            detalles: `Actualización de capacidad y horas desglosadas`
        });

        res.status(200).json({ mensaje: "Habilitación y totales actualizados", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al gestionar habilitación", error: error.message });
    }
};

// 3. Agregar Capacitación Especial (Táctica)
exports.agregarCapacitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const tripulante = await Tripulante.findById(id);
        
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        const role = usuarioLogueado.role?.toLowerCase();
        if (role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No autorizado" });
        }

        tripulante.capacitacionesEspeciales.push(req.body);
        
        // Sumar horas de capacitación al total general si corresponde
        if (req.body.horasAcreditadas) {
            tripulante.totalesHistoricos.vueloDiurno += Number(req.body.horasAcreditadas);
        }

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'MODIFICACION',
            entidadAfectada: `Capacitación: ${req.body.tipo} para ${tripulante.apellido}`,
            entidadId: tripulante._id
        });

        res.status(200).json({ mensaje: "Capacitación añadida con éxito", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al agregar capacitación", error: error.message });
    }
};

// 4. Obtener Tripulantes
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

// 5. Actualizar Tripulante (General)
exports.actualizarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const role = usuarioLogueado.role?.toLowerCase();

        const tripulantePrevio = await Tripulante.findById(id);
        if (!tripulantePrevio) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (role !== 'admin' && usuarioLogueado.unidad !== tripulantePrevio.unidad) {
            return res.status(403).json({ mensaje: "Acceso denegado" });
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
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'MODIFICACION',
            entidadAfectada: `Tripulante: ${actualizado.grado} ${actualizado.apellido}`,
            entidadId: actualizado._id,
            cambios: cambiosRealizados 
        });

        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ mensaje: "Error al actualizar", error: error.message });
    }
};

// 6. Eliminar Tripulante
exports.eliminarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const role = usuarioLogueado.role?.toLowerCase();

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        if (role !== 'admin' && usuarioLogueado.unidad !== tripulante.unidad) {
            return res.status(403).json({ mensaje: "No tienes permiso para eliminar" });
        }

        await Tripulante.findByIdAndDelete(id);

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante: ${tripulante.grado} ${tripulante.apellido} (Unidad: ${tripulante.unidad})`,
            entidadId: tripulante._id,
            cambios: { eliminado: tripulante }
        });

        res.status(200).json({ mensaje: "Tripulante eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar", error: error.message });
    }
};

// 7. Buscar Tripulante
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