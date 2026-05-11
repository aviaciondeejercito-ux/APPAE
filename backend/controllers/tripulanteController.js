const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * CONTROLADOR DE TRIPULANTES - GESTIÓN DE LEGAJOS AE
 * ESTÁNDAR: SINCRO JOKER v3.0
 */

// Función auxiliar para normalizar la unidad/elemento sin romper el código
const obtenerUnidadLimpia = (userOrBody) => {
    if (!userOrBody) return "";
    const u = userOrBody.elemento || userOrBody.unidad || "";
    return String(u).trim().toUpperCase();
};

// 1. Crear Tripulante
exports.crearTripulante = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        // Normalizamos la unidad que viene en el body y la del usuario que crea
        const unidadDestino = obtenerUnidadLimpia(req.body);
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        // Normalización Sincro Joker del Rol
        const roleBase = String(usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        
        // Permisos: Admin/Mandos o Gestores de la misma unidad
        const esMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorUnidad = ['OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleBase);

        if (!esMando && (!esGestorUnidad || miUnidad !== unidadDestino)) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El rol ${usuarioLogueado.role} no tiene permisos para dar altas en ${unidadDestino}` 
            });
        }

        const datosNuevoTripulante = {
            ...req.body,
            apellido: req.body.apellido.toUpperCase().trim(),
            nombre: req.body.nombre.toUpperCase().trim(),
            elemento: unidadDestino, // Sincronizamos con el nombre de campo detectado en MongoDB
            unidad: unidadDestino,   // Mantenemos unidad por compatibilidad
            ultimoEditor: usuarioLogueado._id,
            fechaUltimaModificacion: Date.now()
        };

        const nuevoTripulante = new Tripulante(datosNuevoTripulante);
        await nuevoTripulante.save();

        // AUDITORÍA
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad, 
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

// 2. Gestionar Habilitación SdA
exports.gestionarHabilitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const { 
            aeronave, fechaHabilitacion, rolActual, 
            hsVisual, hsInstrumental, hsNocturno, hsNVG, 
            observaciones 
        } = req.body;

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        // Seguridad por Unidad y Rol
        const roleBase = String(usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);
        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        const esMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorUnidad = ['OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleBase);

        if (!esMando && (!esGestorUnidad || miUnidad !== unidadTripulante)) {
            return res.status(403).json({ mensaje: "No autorizado para modificar este legajo" });
        }

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
            tripulante.habilitaciones[index].rolActual = rolActual;
            tripulante.habilitaciones[index].fechaHabilitacion = fechaHabilitacion;
            tripulante.habilitaciones[index].hsVisual = v;
            tripulante.habilitaciones[index].hsInstrumental = i;
            tripulante.habilitaciones[index].hsNocturno = n;
            tripulante.habilitaciones[index].hsNVG = nvg;
            tripulante.habilitaciones[index].totalHorasSistema = totalSdA;
            tripulante.habilitaciones[index].observaciones = observaciones;
        } else {
            tripulante.habilitaciones.push({
                aeronave, fechaHabilitacion, rolActual,
                hsVisual: v, hsInstrumental: i, hsNocturno: n, hsNVG: nvg,
                totalHorasSistema: totalSdA, observaciones
            });
        }

        // Recalcular Totales Históricos
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
        tripulante.totalesHistoricos.vueloVisual = recalculo.nvg;

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
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

// 3. Agregar Capacitación Especial
exports.agregarCapacitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        const roleBase = String(usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);
        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OPERACIONES', 'JEFE'].includes(roleBase) || (roleBase !== 'ADMIN' && miUnidad !== unidadTripulante)) {
            return res.status(403).json({ mensaje: "No autorizado para agregar capacitaciones" });
        }

        tripulante.capacitacionesEspeciales.push(req.body);
        if (req.body.horasAcreditadas) {
            tripulante.totalesHistoricos.vueloDiurno += Number(req.body.horasAcreditadas);
        }

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
            accion: 'MODIFICACION',
            entidadAfectada: `Capacitación: ${req.body.tipo} para ${tripulante.apellido}`,
            entidadId: tripulante._id
        });

        res.status(200).json({ mensaje: "Capacitación añadida con éxito", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al agregar capacitación", error: error.message });
    }
};

// 4. Obtener Tripulantes (Con Fix de Doble Campo unidad/elemento)
exports.obtenerTripulantes = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const roleBase = String(usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        let filtro = { activo: { $ne: false } };

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase)) {
            // Filtramos por CUALQUIERA de los dos campos para asegurar que aparezcan
            filtro.$or = [
                { elemento: miUnidad },
                { unidad: miUnidad }
            ];
        } else if (req.query.unidad && req.query.unidad !== 'all') {
            const unidadQuery = req.query.unidad.toUpperCase();
            filtro.$or = [{ elemento: unidadQuery }, { unidad: unidadQuery }];
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
        const roleBase = String(usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        const tripulantePrevio = await Tripulante.findById(id);
        if (!tripulantePrevio) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        const unidadTrip = obtenerUnidadLimpia(tripulantePrevio);
        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase) && miUnidad !== unidadTrip) {
            return res.status(403).json({ mensaje: "Acceso denegado" });
        }

        const cambiosRealizados = {};
        for (const key in req.body) {
            if (JSON.stringify(tripulantePrevio[key]) !== JSON.stringify(req.body[key])) {
                cambiosRealizados[key] = { anterior: tripulantePrevio[key], nuevo: req.body[key] };
            }
        }

        req.body.ultimoEditor = usuarioLogueado._id;
        req.body.fechaUltimaModificacion = Date.now();
        
        // Sincronización de unidad/elemento en el update
        if (req.body.unidad || req.body.elemento) {
            const u = req.body.elemento || req.body.unidad;
            req.body.elemento = u.toUpperCase().trim();
            req.body.unidad = u.toUpperCase().trim();
        }

        const actualizado = await Tripulante.findByIdAndUpdate(
            id, { $set: req.body }, { new: true, runValidators: true }
        );

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
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
        const roleBase = String(usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');

        if (roleBase !== 'ADMIN') {
            return res.status(403).json({ mensaje: "Solo el Administrador puede eliminar legajos" });
        }

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        await Tripulante.findByIdAndDelete(id);

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: obtenerUnidadLimpia(usuarioLogueado),
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante: ${tripulante.grado} ${tripulante.apellido}`,
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
        const roleBase = String(usuario.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuario);
        
        let query = {
            $or: [
                { apellido: { $regex: termino, $options: 'i' } },
                { nombre: { $regex: termino, $options: 'i' } }
            ]
        };

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase)) {
            query.$or = [
                { $and: [ { apellido: { $regex: termino, $options: 'i' } }, { elemento: miUnidad } ] },
                { $and: [ { nombre: { $regex: termino, $options: 'i' } }, { elemento: miUnidad } ] }
            ];
        }

        const resultados = await Tripulante.find(query)
            .populate('ultimoEditor', 'grado apellido')
            .limit(10)
            .lean();

        res.status(200).json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: "Error", error: error.message });
    }
};