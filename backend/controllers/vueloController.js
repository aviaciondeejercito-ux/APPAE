const Vuelo = require('../models/Vuelo');
const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

// Helper para evitar imprecisión flotante de JS (ej: 62.39999999999999 -> 62.4)
const redondearHs = (val) => Math.round(Number(val || 0) * 10) / 10;

/**
 * HELPER INTERNO DE VERIFICACIÓN DE PERMISOS DE ESCRITURA (ADMIN, OPERACIONES, JEFE)
 */
const verificarPermisoEscritura = (user, unidadVuelo = null) => {
    const rawRole = user?.role || user?.rol || '';
    const rolNormalizado = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
    
    // Admins y mandos globales tienen permiso total
    const esMandoGlobal = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINATECNICA'].includes(rolNormalizado);
    if (esMandoGlobal) return true;

    // JEFE y OPERACIONES tienen permiso solo en su misma unidad
    const rolesEscrituraUnidad = ['OPERACIONES', 'JEFE'];
    if (rolesEscrituraUnidad.includes(rolNormalizado)) {
        if (!unidadVuelo) return true; // Carga inicial
        const unidadUsuario = (user.elemento || user.unidad || '').trim().toUpperCase();
        return unidadUsuario !== '' && unidadUsuario === unidadVuelo.trim().toUpperCase();
    }

    return false;
};

/**
 * HELPER INTERNO PARA REVERTIR IMPACTO DE VUELO EN LEGAJOS DE TRIPULANTES
 */
const revertirImpactoLegajos = async (vuelo) => {
    const hs = redondearHs(vuelo.horasVoladas);
    const esNocturno = vuelo.condicion === 'Nocturno';
    const esIFR = vuelo.reglasVuelo === 'IFR';
    const esNVG = vuelo.usoNVG === true;
    const esVisual = !esNocturno && !esIFR && !esNVG;

    const mapaTripulantes = new Map();
    if (vuelo.segundoMecanico) mapaTripulantes.set(vuelo.segundoMecanico.toString(), 'Mecánico');
    if (vuelo.mecanico)        mapaTripulantes.set(vuelo.mecanico.toString(), 'Mecánico');
    if (vuelo.copiloto)        mapaTripulantes.set(vuelo.copiloto.toString(), 'Copiloto');
    if (vuelo.piloto)          mapaTripulantes.set(vuelo.piloto.toString(), 'Piloto');
    if (vuelo.instructor)      mapaTripulantes.set(vuelo.instructor.toString(), 'Instructor');

    for (const [idTripulante, rolVuelo] of mapaTripulantes.entries()) {
        const tripulante = await Tripulante.findById(idTripulante);
        if (!tripulante) continue;

        // 1. Restar de Habilitaciones por SdA y Rol
        const indexHab = tripulante.habilitaciones.findIndex(h => 
            h.aeronave === vuelo.aeronave && h.rolActual === rolVuelo
        );
        
        if (indexHab !== -1) {
            if (esVisual)     tripulante.habilitaciones[indexHab].hsVisual = redondearHs(Math.max(0, tripulante.habilitaciones[indexHab].hsVisual - hs));
            if (esIFR)        tripulante.habilitaciones[indexHab].hsInstrumental = redondearHs(Math.max(0, tripulante.habilitaciones[indexHab].hsInstrumental - hs));
            if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno = redondearHs(Math.max(0, tripulante.habilitaciones[indexHab].hsNocturno - hs));
            if (esNVG)        tripulante.habilitaciones[indexHab].hsNVG = redondearHs(Math.max(0, tripulante.habilitaciones[indexHab].hsNVG - hs));
            
            tripulante.habilitaciones[indexHab].totalHorasSistema = redondearHs(
                Number(tripulante.habilitaciones[indexHab].hsVisual || 0) +
                Number(tripulante.habilitaciones[indexHab].hsInstrumental || 0) +
                Number(tripulante.habilitaciones[indexHab].hsNocturno || 0) +
                Number(tripulante.habilitaciones[indexHab].hsNVG || 0)
            );
        }

        // 2. Recálculo de Totales Históricos Generales
        const mapaSdA = {};
        tripulante.habilitaciones.forEach(hab => {
            const sdaId = hab.aeronave;
            if (!mapaSdA[sdaId]) mapaSdA[sdaId] = { v: 0, i: 0, n: 0, nvg: 0 };
            mapaSdA[sdaId].v = Math.max(mapaSdA[sdaId].v, Number(hab.hsVisual || 0));
            mapaSdA[sdaId].i = Math.max(mapaSdA[sdaId].i, Number(hab.hsInstrumental || 0));
            mapaSdA[sdaId].n = Math.max(mapaSdA[sdaId].n, Number(hab.hsNocturno || 0));
            mapaSdA[sdaId].nvg = Math.max(mapaSdA[sdaId].nvg, Number(hab.hsNVG || 0));
        });

        const totalesLimpios = { v: 0, i: 0, n: 0, nvg: 0 };
        Object.values(mapaSdA).forEach(sistema => {
            totalesLimpios.v += sistema.v;
            totalesLimpios.i += sistema.i;
            totalesLimpios.n += sistema.n;
            totalesLimpios.nvg += sistema.nvg;
        });

        tripulante.totalesHistoricos.vueloDiurno = redondearHs(totalesLimpios.v);
        tripulante.totalesHistoricos.vueloInstrumental = redondearHs(totalesLimpios.i);
        tripulante.totalesHistoricos.vueloNocturno = redondearHs(totalesLimpios.n);
        tripulante.totalesHistoricos.vueloVisual = redondearHs(totalesLimpios.nvg);

        // 3. Restar de Capacitaciones Tácticas
        const indexTactico = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === vuelo.tipoMision);
        if (indexTactico !== -1) {
            const hsCap = Number(tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas || 0);
            tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas = redondearHs(Math.max(0, hsCap - hs));
        }
        if (esNVG) {
            const indexNVG = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === "NVG");
            if (indexNVG !== -1) {
                const hsCapNVG = Number(tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas || 0);
                tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas = redondearHs(Math.max(0, hsCapNVG - hs));
            }
        }

        await tripulante.save();
    }
};

/**
 * REGISTRO DE VUELO E IMPACTO EN LEGAJOS
 */
exports.registrarVuelo = async (req, res) => {
    try {
        const datosVuelo = req.body;
        const usuarioLogueado = req.user;

        if (!verificarPermisoEscritura(usuarioLogueado)) {
            return res.status(403).json({ mensaje: "Acceso denegado: Su rol no cuenta con permisos para registrar vuelos." });
        }

        // Limpieza y Normalización de IDs
        const limpiarId = (id) => (id && id.toString().trim() !== "" && id !== "undefined") ? id : null;
        const hsVoladasSanitizadas = redondearHs(datosVuelo.horasVoladas);

        // Crear el registro del vuelo
        const nuevoVuelo = new Vuelo({
            ...datosVuelo,
            horasVoladas: hsVoladasSanitizadas,
            aeronave: datosVuelo.aeronave?.trim(),
            matricula: datosVuelo.matricula?.toUpperCase().trim(),
            elementoApoyado: datosVuelo.elementoApoyado?.toUpperCase().trim(),
            
            instructor: limpiarId(datosVuelo.instructor),
            piloto: limpiarId(datosVuelo.piloto),
            copiloto: limpiarId(datosVuelo.copiloto),
            mecanico: limpiarId(datosVuelo.mecanico),
            segundoMecanico: limpiarId(datosVuelo.segundoMecanico),

            unidadResponsable: usuarioLogueado.unidad || usuarioLogueado.elemento,
            creadoPor: usuarioLogueado._id
        });

        // El .save() dispara automáticamente el hook 'pre-save' para legajos
        await nuevoVuelo.save();

        // Procesamiento de capacitaciones tácticas
        const mapaTripulantes = new Map();
        if (nuevoVuelo.segundoMecanico) mapaTripulantes.set(nuevoVuelo.segundoMecanico.toString(), 'Mecánico');
        if (nuevoVuelo.mecanico)        mapaTripulantes.set(nuevoVuelo.mecanico.toString(), 'Mecánico');
        if (nuevoVuelo.copiloto)        mapaTripulantes.set(nuevoVuelo.copiloto.toString(), 'Copiloto');
        if (nuevoVuelo.piloto)          mapaTripulantes.set(nuevoVuelo.piloto.toString(), 'Piloto');
        if (nuevoVuelo.instructor)      mapaTripulantes.set(nuevoVuelo.instructor.toString(), 'Instructor');

        const hs = redondearHs(nuevoVuelo.horasVoladas);
        const esNVG = datosVuelo.usoNVG === true;

        for (const idTripulante of mapaTripulantes.keys()) {
            const tripulante = await Tripulante.findById(idTripulante);
            if (!tripulante) continue;

            let flagModificado = false;

            const indexTactico = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === nuevoVuelo.tipoMision);
            if (indexTactico !== -1) {
                const hsActuales = Number(tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas || 0);
                tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas = redondearHs(hsActuales + hs);
                flagModificado = true;
            }

            if (esNVG) {
                const indexNVG = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === "NVG");
                if (indexNVG !== -1) {
                    const hsActualesNVG = Number(tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas || 0);
                    tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas = redondearHs(hsActualesNVG + hs);
                    flagModificado = true;
                }
            }

            if (flagModificado) await tripulante.save();
        }

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'CARGA_HS',
            entidadAfectada: `Vuelo ${nuevoVuelo.aeronave} Mat: ${nuevoVuelo.matricula}`,
            details: `Apoyo: ${nuevoVuelo.elementoApoyado} | Pax: ${nuevoVuelo.cantidadPasajeros} | Carga: ${nuevoVuelo.pesoCarga}kg | Modo: ${nuevoVuelo.localTravesia} | Reglas: ${nuevoVuelo.reglasVuelo}`
        });

        res.status(201).json({ mensaje: "Vuelo registrado e impacto total procesado con éxito", vuelo: nuevoVuelo });

    } catch (error) {
        console.error("❌ Error en carga de vuelo:", error);
        res.status(400).json({ mensaje: "Error al registrar vuelo", detalles: error.message });
    }
};

/**
 * EDITAR VUELO - HABILITADO PARA ADMIN, OPERACIONES Y JEFE DE LA UNIDAD
 */
exports.editarVuelo = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const { id } = req.params;
        const vueloExistente = await Vuelo.findById(id);
        
        if (!vueloExistente) return res.status(404).json({ mensaje: "Vuelo no encontrado" });

        if (!verificarPermisoEscritura(usuarioLogueado, vueloExistente.unidadResponsable)) {
            return res.status(403).json({ mensaje: "Acceso denegado: Su perfil o unidad no le permite editar este registro." });
        }

        // 1. Revertimos las horas anteriores en los legajos
        await revertirImpactoLegajos(vueloExistente);

        // 2. Limpieza de IDs y sanitización de horas para el nuevo objeto
        const datosNuevos = req.body;
        const limpiarId = (id) => (id && id.toString().trim() !== "" && id !== "undefined") ? id : null;

        vueloExistente.fecha = datosNuevos.fecha || vueloExistente.fecha;
        vueloExistente.aeronave = datosNuevos.aeronave?.trim() || vueloExistente.aeronave;
        vueloExistente.matricula = datosNuevos.matricula?.toUpperCase().trim() || vueloExistente.matricula;
        vueloExistente.elementoApoyado = datosNuevos.elementoApoyado?.toUpperCase().trim() || vueloExistente.elementoApoyado;
        vueloExistente.horasVoladas = redondearHs(datosNuevos.horasVoladas);
        vueloExistente.desde = datosNuevos.desde?.toUpperCase() || vueloExistente.desde;
        vueloExistente.hasta = datosNuevos.hasta?.toUpperCase() || vueloExistente.hasta;
        vueloExistente.condicion = datosNuevos.condicion || vueloExistente.condicion;
        vueloExistente.reglasVuelo = datosNuevos.reglasVuelo || vueloExistente.reglasVuelo;
        vueloExistente.usoNVG = datosNuevos.usoNVG ?? vueloExistente.usoNVG;
        vueloExistente.tipoMision = datosNuevos.tipoMision || vueloExistente.tipoMision;
        vueloExistente.localTravesia = datosNuevos.localTravesia || vueloExistente.localTravesia;
        vueloExistente.cantidadPasajeros = Number(datosNuevos.cantidadPasajeros || 0);
        vueloExistente.pesoCarga = Number(datosNuevos.pesoCarga || 0);

        vueloExistente.instructor = limpiarId(datosNuevos.instructor);
        vueloExistente.piloto = limpiarId(datosNuevos.piloto);
        vueloExistente.copiloto = limpiarId(datosNuevos.copiloto);
        vueloExistente.mecanico = limpiarId(datosNuevos.mecanico);
        vueloExistente.segundoMecanico = limpiarId(datosNuevos.segundoMecanico);

        // 3. El .save() vuelve a ejecutar el hook 'pre-save' para sumar los nuevos datos
        await vueloExistente.save();

        // 4. Auditoría de modificación
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'EDICION_-12',
            entidadAfectada: `Vuelo ${vueloExistente.aeronave} Mat: ${vueloExistente.matricula}`,
            details: `Edición de Formulario -12 realizada por ${usuarioLogueado.grado} ${usuarioLogueado.apellido}. ID: ${id}`
        });

        res.json({ mensaje: "Formulario -12 modificado y recalculado correctamente", vuelo: vueloExistente });

    } catch (error) {
        console.error("❌ Error en edicion de vuelo:", error);
        res.status(500).json({ mensaje: "Error al editar el vuelo", detalles: error.message });
    }
};

/**
 * OBTENER HISTORIAL DE VUELOS (FILTRO ESTRICTO POR UNIDAD PARA JEFE Y OPERACIONES)
 */
exports.obtenerVuelos = async (req, res) => {
    try {
        const { unit } = req.query;
        const unidadQuery = unit || req.query.unidad;
        let filtro = {};
        
        const rawRole = req.user?.role || req.user?.rol || 'user';
        const rolUsuario = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        // Solo la conducción estratégica global puede ver el historial de todas las unidades
        const esMandoGlobal = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINATECNICA'].includes(rolUsuario);

        if (!esMandoGlobal) {
            // OPERACIONES, JEFE y USER quedan restringidos estrictamente a su unidad
            const unidadUsuario = (req.user.elemento || req.user.unidad || '').trim();
            if (unidadUsuario) {
                filtro.unidadResponsable = new RegExp(`^${unidadUsuario}$`, 'i');
            } else {
                filtro.unidadResponsable = 'SIN_UNIDAD_ASIGNADA';
            }
        } else if (unidadQuery && unidadQuery !== 'all' && unidadQuery !== 'TODAS') {
            filtro.unidadResponsable = new RegExp(`^${unidadQuery.trim()}$`, 'i');
        }
        
        const vuelos = await Vuelo.find(filtro)
            .populate('instructor piloto copiloto mecanico segundoMecanico', 'grado apellido nombre')
            .sort({ fecha: -1 });

        const vuelosSanitizados = vuelos.map(v => {
            const doc = v.toObject();
            doc.horasVoladas = redondearHs(doc.horasVoladas);
            return doc;
        });

        res.json(vuelosSanitizados);
    } catch (error) {
        console.error("❌ Error al obtener vuelos:", error);
        res.status(500).json({ mensaje: "Error al obtener historial de vuelos" });
    }
};

/**
 * ELIMINAR VUELO
 */
exports.eliminarVuelo = async (req, res) => {
    try {
        const usuarioLogueado = req.user;
        const vuelo = await Vuelo.findById(req.params.id);
        if (!vuelo) return res.status(404).json({ mensaje: "Vuelo no encontrado" });

        if (!verificarPermisoEscritura(usuarioLogueado, vuelo.unidadResponsable)) {
            return res.status(403).json({ mensaje: "Acceso denegado: Su perfil o unidad no le permite eliminar este registro." });
        }

        // Revertir impacto en legajos de tripulantes
        await revertirImpactoLegajos(vuelo);

        // Eliminación física del vuelo
        await Vuelo.findByIdAndDelete(req.params.id);

        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'ELIMINACION_VUELO',
            entidadAfectada: `Vuelo ${vuelo.aeronave} Mat: ${vuelo.matricula}`,
            details: `Eliminación de registro -12 procesada correctamente.`
        });

        res.json({ mensaje: "Vuelo eliminado y horas descontadas correctamente" });
    } catch (error) {
        console.error("❌ Error al eliminar vuelo:", error);
        res.status(500).json({ mensaje: "Error al eliminar el vuelo", error: error.message });
    }
};