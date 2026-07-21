const Aircraft = require('../models/Aircraft');

/**
 * FUNCIÓN AUXILIAR UTILITARIA PARA PROCESAR ROLES Y PRIVILEGIOS DE SESIÓN
 */
const obtenerPrivilegios = (user) => {
    const rawRole = user?.role || "";
    const roleUpper = String(rawRole).trim().toUpperCase().replace(/[\s_]/g, '');
    const userElemento = user?.elemento?.toUpperCase().trim() || "";

    const esAdminPorContenido = roleUpper.includes('ADMIN');
    const esMandoPorLista = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleUpper);
    
    const isMandoEstrategico = esAdminPorContenido || esMandoPorLista || userElemento === 'COMANDO';
    const esOficinaTecnica = roleUpper === 'OFICINATECNICA';
    
    return {
        isMandoEstrategico,
        canChangeUnit: isMandoEstrategico || esOficinaTecnica,
        hasEditPrivileges: isMandoEstrategico || esOficinaTecnica || roleUpper === 'S4UNIDAD',
        userElemento
    };
};

/**
 * Helper para asegurar parseo numérico estricto
 */
const parsearHs = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const num = parseFloat(String(val).replace(',', '.').trim());
    return isNaN(num) ? 0 : num;
};

/**
 * 1. OBTENER FLOTA
 */
exports.getAircrafts = async (req, res) => {
    try {
        const { isMandoEstrategico, userElemento } = obtenerPrivilegios(req.user);
        const { elemento } = req.params;

        let query = {};
        
        if (!isMandoEstrategico) {
            query.unidad = userElemento;
        } else if (elemento) {
            query.unidad = elemento.toUpperCase().trim();
        }
        
        const data = await Aircraft.find(query).sort({ matricula: 1 });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Fallo de sincronización metricial.", error: error.message });
    }
};

/**
 * 2. ALTA DE NUEVA AERONAVE
 */
exports.createAircraft = async (req, res) => {
    try {
        const { hasEditPrivileges, canChangeUnit, userElemento } = obtenerPrivilegios(req.user);

        if (!hasEditPrivileges) {
            return res.status(403).json({ success: false, message: "Acceso denegado. Privilegios de edición insuficientes." });
        }

        const payload = { ...req.body };

        if (!canChangeUnit) {
            payload.unidad = userElemento;
        } else if (!payload.unidad) {
            return res.status(400).json({ success: false, message: "Debe especificar una unidad de destino válida." });
        }

        // Sanitización de números en cabecera
        payload.tgPlaneadorActual = parsearHs(payload.tgPlaneadorActual);
        payload.motorTsn = parsearHs(payload.motorTsn);

        payload.creadoPor = `${req.user?.username || 'Usuario'} (${req.user?.role || 'USER'})`;
        payload.actualizadoPor = payload.creadoPor;

        const nuevaAeronave = new Aircraft(payload);
        await nuevaAeronave.save();

        return res.status(201).json({ success: true, data: nuevaAeronave, message: "Alta de aeronave metricial exitosa." });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "La matrícula ingresada ya se encuentra registrada en el sistema." });
        }
        return res.status(500).json({ success: false, message: "Error al registrar aeronave.", error: error.message });
    }
};

/**
 * 3. ACTUALIZACIÓN / TRASLADO DE AERONAVE (USANDO .save() PARA DISPARAR MARKMODIFIED)
 */
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { hasEditPrivileges, canChangeUnit, isMandoEstrategico, userElemento } = obtenerPrivilegios(req.user);

        if (!hasEditPrivileges) {
            return res.status(403).json({ success: false, message: "Acceso denegado. No posee credenciales de modificación." });
        }

        const aeronaveDoc = await Aircraft.findById(id);
        if (!aeronaveDoc) {
            return res.status(404).json({ success: false, message: "Aeronave no localizada." });
        }

        if (!isMandoEstrategico && aeronaveDoc.unidad !== userElemento) {
            return res.status(403).json({ success: false, message: "Acceso denegado. El recurso pertenece a otro Elemento Operativo." });
        }

        const campos = { ...req.body };

        if (!canChangeUnit) {
            delete campos.unidad;
        }

        // Asignación de campos directos
        Object.keys(campos).forEach(key => {
            if (key !== '_id' && key !== '__v') {
                aeronaveDoc[key] = campos[key];
            }
        });

        // Parseo seguro de números principales
        if (campos.tgPlaneadorActual !== undefined) aeronaveDoc.tgPlaneadorActual = parsearHs(campos.tgPlaneadorActual);
        if (campos.motorTsn !== undefined) aeronaveDoc.motorTsn = parsearHs(campos.motorTsn);

        // Notificar a Mongoose las modificaciones en estructuras complejas
        aeronaveDoc.markModified('tgPlaneadorActual');
        aeronaveDoc.markModified('motorTsn');
        if (campos.compPlaneador) aeronaveDoc.markModified('compPlaneador');
        if (campos.motores) aeronaveDoc.markModified('motores');
        if (campos.helices) aeronaveDoc.markModified('helices');

        aeronaveDoc.actualizadoPor = `${req.user?.username || 'Usuario'} (${req.user?.role || 'USER'})`;

        const aeronaveGuardada = await aeronaveDoc.save();

        return res.status(200).json({ 
            success: true, 
            data: aeronaveGuardada, 
            message: "Aeronave y sus componentes actualizados correctamente." 
        });
    } catch (error) {
        console.error("❌ Error en updateAircraftStatus:", error);
        return res.status(500).json({ success: false, message: "Error en la operación de actualización.", error: error.message });
    }
};

/**
 * 4. BAJA DEFINITIVA DE MATRÍCULA
 */
exports.deleteAircraft = async (req, res) => {
    try {
        const { id } = req.params;
        const { isMandoEstrategico } = obtenerPrivilegios(req.user);

        if (!isMandoEstrategico) {
            return res.status(403).json({ success: false, message: "Acceso denegado. Solo los Mandos Estratégicos del Comando pueden destruir registros aeronáuticos." });
        }

        const aeronaveEliminada = await Aircraft.findByIdAndDelete(id);
        if (!aeronaveEliminada) {
            return res.status(404).json({ success: false, message: "No se encontró la aeronave solicitada para eliminación." });
        }

        return res.status(200).json({ success: true, message: `El registro de la aeronave ${aeronaveEliminada.matricula} ha sido eliminado permanentemente.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error al ejecutar la baja.", error: error.message });
    }
};