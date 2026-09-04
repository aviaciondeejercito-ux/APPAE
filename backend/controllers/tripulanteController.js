const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');
// Ya no es necesario requerir Vuelo aquí porque no lo consultamos en este controlador
// const Vuelo = require('../models/Vuelo'); 

/**
 * CONTROLADOR DE TRIPULANTES - GESTIÓN DE LEGAJOS AE
 * ESTÁNDAR: SINCRO JOKER v3.7 (Refactorizado - Fuente de verdad en BD)
 */

// Función auxiliar para normalizar cadenas
const normalizarTexto = (texto) => {
    if (!texto) return "";
    return String(texto)
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remueve acentos
};

// Función auxiliar para normalizar la unidad/elemento
const obtenerUnidadLimpia = (userOrBody) => {
    if (!userOrBody) return "";
    const u = userOrBody.elemento || userOrBody.unidad || "";
    return normalizarTexto(u);
};

// 1. Crear Tripulante
exports.crearTripulante = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const unidadDestino = obtenerUnidadLimpia(req.body);
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        const roleBase = normalizarTexto(usuarioLogueado.rol || usuarioLogueado.role).replace(/[\s_-]/g, '');
        
        const esMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorUnidad = ['OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleBase);

        if (!esMando && (!esGestorUnidad || miUnidad !== unidadDestino)) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El nivel ${roleBase} no tiene permisos para dar de alta personal en la unidad [${unidadDestino}]` 
            });
        }

        const datosNuevoTripulante = {
            ...req.body,
            apellido: req.body.apellido ? normalizarTexto(req.body.apellido) : "",
            nombre: req.body.nombre ? normalizarTexto(req.body.nombre) : "",
            elemento: unidadDestino,
            unidad: unidadDestino,
            activo: true,
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

// 2. Gestionar Habilitación SdA (Asignación manual de base X)
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
        if (!tripulante || tripulante.activo === false) {
            return res.status(404).json({ mensaje: "Tripulante no disponible o inactivo" });
        }

        const roleBase = normalizarTexto(usuarioLogueado.rol || usuarioLogueado.role).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);
        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        const esMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorUnidad = ['OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleBase);

        if (!esMando && (!esGestorUnidad || miUnidad !== unidadTripulante)) {
            return res.status(403).json({ mensaje: "No autorizado para modificar este legajo" });
        }

        const v = Math.round(Number(hsVisual || 0) * 10) / 10;
        const i = Math.round(Number(hsInstrumental || 0) * 10) / 10;
        const n = Math.round(Number(hsNocturno || 0) * 10) / 10;
        const nvg = Math.round(Number(hsNVG || 0) * 10) / 10;
        const totalSdA = Math.round((v + i + n + nvg) * 10) / 10;

        const aeroNorm = normalizarTexto(aeronave);
        const rolNorm = normalizarTexto(rolActual);

        const index = tripulante.habilitaciones.findIndex(h => 
            normalizarTexto(h.aeronave) === aeroNorm && normalizarTexto(h.rolActual) === rolNorm
        );

        if (index !== -1) {
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
            detalles: `Actualización manual de base inicial X`
        });

        res.status(200).json({ mensaje: "Habilitación registrada con éxito", tripulante });
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
        if (!tripulante || tripulante.activo === false) {
            return res.status(404).json({ mensaje: "Tripulante no encontrado" });
        }

        const roleBase = normalizarTexto(usuarioLogueado.rol || usuarioLogueado.role).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);
        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OPERACIONES', 'JEFE'].includes(roleBase) || (roleBase !== 'ADMIN' && miUnidad !== unidadTripulante)) {
            return res.status(403).json({ mensaje: "No autorizado para agregar capacitaciones" });
        }

        tripulante.capacitacionesEspeciales.push(req.body);

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
            accion: 'MODIFICACION',
            entidadAfectada: `Capacitación Táctica: ${req.body.tipo} para ${tripulante.apellido}`,
            entidadId: tripulante._id
        });

        res.status(200).json({ mensaje: "Capacitación añadida con éxito", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al agregar capacitación", error: error.message });
    }
};

// 4. Agregar Aptitud Adicional
exports.agregarAptitudAdicional = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const tripulante = await Tripulante.findById(id);
        
        if (!tripulante || tripulante.activo === false) {
            return res.status(404).json({ mensaje: "Tripulante no encontrado" });
        }

        const roleBase = normalizarTexto(usuarioLogueado.rol || usuarioLogueado.role).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);
        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OPERACIONES', 'JEFE'].includes(roleBase) || (roleBase !== 'ADMIN' && miUnidad !== unidadTripulante)) {
            return res.status(403).json({ mensaje: "No autorizado para agregar aptitudes adicionales" });
        }

        if (!tripulante.aptitudesAdicionales) {
            tripulante.aptitudesAdicionales = [];
        }

        tripulante.aptitudesAdicionales.push(req.body);

        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
            accion: 'MODIFICACION',
            entidadAfectada: `Aptitud Adicional: ${req.body.tipo} para ${tripulante.apellido}`,
            entidadId: tripulante._id
        });

        res.status(200).json({ mensaje: "Aptitud adicional añadida con éxito", tripulante });
    } catch (error) {
        res.status(400).json({ mensaje: "Error al agregar aptitud adicional", error: error.message });
    }
};

// 5. Obtener Tripulantes (Optimizado: La BD ya es la fuente de verdad)
exports.obtenerTripulantes = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const miRol = usuarioLogueado.rol || usuarioLogueado.role || '';
        const roleBase = normalizarTexto(miRol).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        let filtro = { activo: { $ne: false } };

        // Filtro por permisos y unidad
        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase)) {
            if (!miUnidad) return res.status(200).json([]);
            filtro.$or = [{ elemento: miUnidad }, { unidad: miUnidad }];
        } else if (req.query.unidad && req.query.unidad !== 'all') {
            const unidadQuery = normalizarTexto(req.query.unidad);
            filtro.$or = [{ elemento: unidadQuery }, { unidad: unidadQuery }];
        }

        // Se trae la información directa y limpia de la BD
        const tripulantes = await Tripulante.find(filtro)
            .populate('ultimoEditor', 'grado apellido')
            .sort({ apellido: 1 })
            .lean();

        res.status(200).json(tripulantes || []);
    } catch (error) {
        console.error("❌ ERROR 500 EN OBTENER_TRIPULANTES:", error);
        res.status(500).json({ mensaje: "Error al obtener tripulantes", detalle: error.message });
    }
};

// 6. Actualizar Tripulante
exports.actualizarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        const roleBase = normalizarTexto(usuarioLogueado.rol || usuarioLogueado.role).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        const tripulantePrevio = await Tripulante.findById(id);
        if (!tripulantePrevio || tripulantePrevio.activo === false) {
            return res.status(404).json({ mensaje: "Tripulante no encontrado" });
        }

        const unidadTrip = obtenerUnidadLimpia(tripulantePrevio);
        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase) && miUnidad !== unidadTrip) {
            return res.status(403).json({ mensaje: "Acceso denegado: Jurisdicción cruzada no permitida" });
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
            req.body.elemento = normalizarTexto(u);
            req.body.unidad = normalizarTexto(u);
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
        res.status(400).json({ mensaje: "Error al actualizar legajo", error: error.message });
    }
};

// 7. Eliminar Tripulante (Baja lógica)
exports.eliminarTripulante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioLogueado = req.user;
        
        const roleBase = normalizarTexto(usuarioLogueado.rol || usuarioLogueado.role).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuarioLogueado);

        const tripulante = await Tripulante.findById(id);
        if (!tripulante || tripulante.activo === false) {
            return res.status(404).json({ mensaje: "El legajo que intentás eliminar no existe" });
        }

        const unidadTripulante = obtenerUnidadLimpia(tripulante);

        const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase);
        const esGestorConPermisoBorrado = ['OPERACIONES', 'JEFE'].includes(roleBase);

        const tienePermiso = esMandoEstrategico || (esGestorConPermisoBorrado && miUnidad === unidadTripulante);

        if (!tienePermiso) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El nivel ${roleBase} no tiene permisos para eliminar legajos de esta sección.` 
            });
        }

        tripulante.activo = false;
        tripulante.ultimoEditor = usuarioLogueado._id;
        tripulante.fechaUltimaModificacion = Date.now();
        await tripulante.save();

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: miUnidad,
            accion: 'ELIMINACION',
            entidadAfectada: `Tripulante (Baja Lógica): ${tripulante.grado} ${tripulante.apellido} (Unidad: ${unidadTripulante})`,
            entidadId: tripulante._id,
            cambios: { estado: "INACTIVO_BAJA" }
        });

        res.status(200).json({ mensaje: "Legajo dado de baja del panel operativo correctamente." });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al procesar la baja del tripulante", error: error.message });
    }
};

// 8. Buscar Tripulante
exports.buscarTripulante = async (req, res) => {
    try {
        const { termino } = req.params;
        const usuario = req.user;
        const roleBase = normalizarTexto(usuario.rol || usuario.role).replace(/[\s_-]/g, '');
        const miUnidad = obtenerUnidadLimpia(usuario);
        
        let query = {
            activo: { $ne: false },
            $or: [
                { apellido: { $regex: termino, $options: 'i' } },
                { nombre: { $regex: termino, $options: 'i' } }
            ]
        };

        if (!['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleBase)) {
            query = {
                activo: { $ne: false },
                $and: [
                    { $or: [{ apellido: { $regex: termino, $options: 'i' } }, { nombre: { $regex: termino, $options: 'i' } }] },
                    { $or: [{ elemento: miUnidad }, { unidad: miUnidad }] }
                ]
            };
        }

        const resultados = await Tripulante.find(query)
            .populate('ultimoEditor', 'grado apellido')
            .limit(10)
            .lean();

        res.status(200).json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al ejecutar la búsqueda de tripulantes", error: error.message });
    }
};