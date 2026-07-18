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
        isMandoEstrategico, // Puede ver toda la flota global y borrar registros
        canChangeUnit: isMandoEstrategico || esOficinaTecnica, // Puede realizar transferencias
        hasEditPrivileges: isMandoEstrategico || esOficinaTecnica || roleUpper === 'S4UNIDAD', // Puede editar campos
        userElemento
    };
};

/**
 * 1. OBTENER FLOTA (FILTRADO RESTRICTIVO)
 */
exports.getAircrafts = async (req, res) => {
    try {
        const { isMandoEstrategico, userElemento } = obtenerPrivilegios(req.user);

        // Si es mando estratégico ve todo. Si es local, se fuerza el filtro de su elemento.
        const query = isMandoEstrategico ? {} : { unidad: userElemento };
        
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

        // REGLA DE NEGOCIO: Si no tiene rango para cambiar unidad, el sistema le auto-asigna su base nativa
        if (!canChangeUnit) {
            payload.unidad = userElemento;
        } else if (!payload.unidad) {
            return res.status(400).json({ success: false, message: "Debe especificar una unidad de destino válida." });
        }

        payload.creadoPor = `${req.user.username || 'Usuario'} (${req.user.role})`;
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
 * 3. ACTUALIZACIÓN / TRASLADO DE AERONAVE
 */
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { hasEditPrivileges, canChangeUnit, isMandoEstrategico, userElemento } = obtenerPrivilegios(req.user);

        if (!hasEditPrivileges) {
            return res.status(403).json({ success: false, message: "Acceso denegado. No posee credenciales de modificación." });
        }

        const aeronaveExistente = await Aircraft.findById(id);
        if (!aeronaveExistente) {
            return res.status(404).json({ success: false, message: "Aeronave no localizada." });
        }

        // SEGURIDAD PERIMETRAL: Si no es mando global, solo puede editar aeronaves que estén físicamente en su base actual
        if (!isMandoEstrategico && aeronaveExistente.unidad !== userElemento) {
            return res.status(403).json({ success: false, message: "Acceso denegado. El recurso pertenece a otro Elemento Operativo." });
        }

        const camposAActualizar = { ...req.body };

        // Proteger el cambio de unidad si carece del permiso de transferencia
        if (!canChangeUnit) {
            delete camposAActualizar.unidad; // Ignora intentos de alteración de base
        }

        camposAActualizar.actualizadoPor = `${req.user.username || 'Usuario'} (${req.user.role})`;

        const aeronaveActualizada = await Aircraft.findByIdAndUpdate(
            id,
            { $set: camposAActualizar },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ 
            success: true, 
            data: aeronaveActualizada, 
            message: "Aeronave procesada / transferida correctamente." 
        });
    } catch (error) {
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

        // REGLA CRÍTICA DE NEGOCIO: Ninguna unidad local (Oficina Técnica o S4) puede eliminar aeronaves de la base de datos global.
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