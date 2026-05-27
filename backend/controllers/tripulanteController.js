const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * CONTROLADOR DE TRIPULANTES - GESTIÓN DE LEGAJOS AE
 * ESTÁNDAR: SINCRO JOKER v3.5 (Operativo 100% - Fix Duplicación por Rol)
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
        const unidadDestino = obtenerUnidadLimpia(req.body);
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        const roleBase = String(usuarioLogueado.rol || usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        
        const esMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorUnidad = ['OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleBase);

        if (!esMando && (!esGestorUnidad || miUnidad !== unidadDestino)) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El nivel ${roleBase} no tiene permisos en ${unidadDestino}` 
            });
        }

        const datosNuevoTripulante = {
            ...req.body,
            apellido: req.body.apellido.toUpperCase().trim(),
            nombre: req.body.nombre.toUpperCase().trim(),
            elemento: unidadDestino,
            unidad: unidadDestino,
            ultimoEditor: usuarioLogueado._id,
            fechaUltimaModificacion: Date.now()
        };

        const nuevoTripulante = new Tripulante(datosNuevoTripulante);
        await nuevoTripulante.save();

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

// 2. Gestionar Habilitación SdA (CORREGIDO: Evita duplicación cruzada de horas por rol)
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

        const roleBase = String(usuarioLogueado.rol || usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
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

        // BÚSQUEDA INTELIGENTE: Validamos tanto la Aeronave como la Función de vuelo para no solapar datos
        const index = tripulante.habilitaciones.findIndex(h => 
            h.aeronave === aeronave && h.rolActual === rolActual
        );

        if (index !== -1) {
            // Si coincide aeronave y función, se actualiza el desglose de ese registro específico
            tripulante.habilitaciones[index].fechaHabilitacion = fechaHabilitacion;
            tripulante.habilitaciones[index].hsVisual = v;
            tripulante.habilitaciones[index].hsInstrumental = i;
            tripulante.habilitaciones[index].hsNocturno = n;
            tripulante.habilitaciones[index].hsNVG = nvg;
            tripulante.habilitaciones[index].totalHorasSistema = totalSdA;
            tripulante.habilitaciones[index].observaciones = observaciones;
        } else {
            // Si es una función nueva para el SdA (ej: pasó de Piloto a Instructor), crea una nueva entrada
            tripulante.habilitaciones.push({
                aeronave, fechaHabilitacion, rolActual,
                hsVisual: v, hsInstrumental: i, hsNocturno: n, hsNVG: nvg,
                totalHorasSistema: totalSdA, observaciones
            });
        }

        // --- RECALCULO GENERAL DINÁMICO CORREGIDO ---
        // Agrupamos por Aeronave única para no duplicar horas si comparte roles de Instructor/Piloto
        const mapaSdA = {};
        
        tripulante.habilitaciones.forEach(hab => {
            const sda = hab.aeronave;
            if (!mapaSdA[sda]) {
                mapaSdA[sda] = { v: 0, i: 0, n: 0, nvg: 0 };
            }
            // Mantenemos el máximo valor alcanzado por condición en ese sistema de armas
            mapaSdA[sda].v = Math.max(mapaSdA[sda].v, Number(hab.hsVisual || 0));
            mapaSdA[sda].i = Math.max(mapaSdA[sda].i, Number(hab.hsInstrumental || 0));
            mapaSdA[sda].n = Math.max(mapaSdA[sda].n, Number(hab.hsNocturno || 0));
            mapaSdA[sda].nvg = Math.max(mapaSdA[sda].nvg, Number(hab.hsNVG || 0));
        });

        // Consolidamos la suma real definitiva sobre la libreta histórica
        const realesTotales = { v: 0, i: 0, n: 0, nvg: 0 };
        Object.values(mapaSdA).forEach(sistema => {
            realesTotales.v += sistema.v;
            realesTotales.i += sistema.i;
            realesTotales.n += sistema.n;
            realesTotales.nvg += sistema.nvg;
        });

        tripulante.totalesHistoricos.vueloDiurno = realesTotales.v;
        tripulante.totalesHistoricos.vueloInstrumental = realesTotales.i;
        tripulante.totalesHistoricos.vueloNocturno = realesTotales.n;
        tripulante.totalesHistoricos.vueloVisual = realesTotales.nvg;

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
            accion: 'MODIFICACION',
            entidadAfectada: `Habilitación SdA: ${aeronave} (${rolActual}) - ${tripulante.apellido}`,
            entidadId: tripulante._id,
            detalles: `Actualización de capacidad y horas desglosadas por rol`
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

        const roleBase = String(usuarioLogueado.rol || usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
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
            entityId: tripulante._id
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
        const miRol = usuarioLogueado.rol || usuarioLogueado.role || '';
        const roleBase = String(miRol).toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        let filtro = { activo: { $ne: false } };

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase)) {
            if (!miUnidad) return res.status(200).json([]);
            filtro.$or = [{ elemento: miUnidad }, { unidad: miUnidad }];
        } else if (req.query.unidad && req.query.unidad !== 'all') {
            const unidadQuery = req.query.unidad.toUpperCase();
            filter.$or = [{ elemento: unidadQuery }, { unidad: unidadQuery }];
        }

        const tripulantes = await Tripulante.find(filtro)
            .populate('ultimoEditor', 'grado apellido')
            .sort({ apellido: 1 })
            .lean();

        res.status(200).json(tripulantes);
    } catch (error) {
        console.error("ERROR 500 EN OBTENER_TRIPULANTES:", error);
        res.status(500).json({ mensaje: "Error al obtener tripulantes", detalle: error.message });
    }
};

// 5. Actualizar Tripulante (General)
exports.actualizarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const roleBase = String(usuarioLogueado.rol || usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
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
        
        const roleBase = String(usuarioLogueado.rol || usuarioLogueado.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        const tripulante = await Tripulante.findById(id);
        if (!tripulante) return res.status(404).json({ mensaje: "Tripulante no encontrado" });

        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorConPermisoBorrado = ['OPERACIONES', 'JEFE'].includes(roleBase);

        const tienePermiso = esMandoEstrategico || (esGestorConPermisoBorrado && miUnidad === unidadTripulante);

        if (!tienePermiso) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El nivel ${roleBase} no tiene permisos para eliminar legajos.` 
            });
        }

        await Tripulante.findByIdAndDelete(id);

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante: ${tripulante.grado} ${tripulante.apellido} (Unidad: ${unidadTripulante})`,
            entidadId: tripulante._id,
            cambios: { eliminado: tripulante }
        });

        res.status(200).json({ mensaje: "Legajo eliminado correctamente." });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al procesar la baja", error: error.message });
    }
};

// 7. Buscar Tripulante
exports.buscarTripulante = async (req, res) => {
    try {
        const { termino } = req.params;
        const usuario = req.user;
        const roleBase = String(usuario.rol || usuario.role || '').toUpperCase().replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuario);
        
        let query = {
            $or: [
                { apellido: { $regex: termino, $options: 'i' } },
                { nombre: { $regex: termino, $options: 'i' } }
            ]
        };

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase)) {
            query.$and = [
                { $or: [{ apellido: { $regex: termino, $options: 'i' } }, { nombre: { $regex: termino, $options: 'i' } }] },
                { $or: [{ elemento: miUnidad }, { unidad: miUnidad }] }
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