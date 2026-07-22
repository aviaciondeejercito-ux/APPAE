const Aircraft = require('../models/Aircraft');

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

const parsearHs = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const num = parseFloat(String(val).replace(',', '.').trim());
    return isNaN(num) ? 0 : num;
};

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
        return res.status(500).json({ success: false, message: "Error al recuperar flota.", error: error.message });
    }
};

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

        payload.inicioAeHs = parsearHs(payload.inicioAeHs);
        payload.tgPlaneadorActual = parsearHs(payload.tgPlaneadorActual);
        payload.motorTsn = parsearHs(payload.motorTsn);
        payload.motorCsnCso = parsearHs(payload.motorCsnCso);
        payload.motor2Tsn = parsearHs(payload.motor2Tsn);
        payload.motor2CsnCso = parsearHs(payload.motor2CsnCso);
        payload.helice1Tsn = parsearHs(payload.helice1Tsn);
        payload.helice2Tsn = parsearHs(payload.helice2Tsn);

        payload.creadoPor = `${req.user?.username || 'Usuario'} (${req.user?.role || 'USER'})`;
        payload.actualizadoPor = payload.creadoPor;

        const nuevaAeronave = new Aircraft(payload);
        await nuevaAeronave.save();

        return res.status(201).json({ success: true, data: nuevaAeronave, message: "Alta de aeronave exitosa." });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "La matrícula ingresada ya existe en el sistema." });
        }
        return res.status(500).json({ success: false, message: "Error al registrar aeronave.", error: error.message });
    }
};

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

        Object.keys(campos).forEach(key => {
            if (key !== '_id' && key !== '__v') {
                aeronaveDoc[key] = campos[key];
            }
        });

        // Parseo seguro de números de cabecera
        aeronaveDoc.inicioAeHs = parsearHs(campos.inicioAeHs);
        aeronaveDoc.tgPlaneadorActual = parsearHs(campos.tgPlaneadorActual);
        aeronaveDoc.motorTsn = parsearHs(campos.motorTsn);
        aeronaveDoc.motorCsnCso = parsearHs(campos.motorCsnCso);
        aeronaveDoc.motor2Tsn = parsearHs(campos.motor2Tsn);
        aeronaveDoc.motor2CsnCso = parsearHs(campos.motor2CsnCso);
        aeronaveDoc.helice1Tsn = parsearHs(campos.helice1Tsn);
        aeronaveDoc.helice2Tsn = parsearHs(campos.helice2Tsn);

        // Notificar cambios explícitos
        aeronaveDoc.markModified('tgPlaneadorActual');
        aeronaveDoc.markModified('motorTsn');
        aeronaveDoc.markModified('motor2Tsn');
        aeronaveDoc.markModified('helice1Tsn');
        aeronaveDoc.markModified('helice2Tsn');
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
        return res.status(500).json({ success: false, message: "Error al actualizar la aeronave.", error: error.message });
    }
};

exports.deleteAircraft = async (req, res) => {
    try {
        const { id } = req.params;
        const { isMandoEstrategico } = obtenerPrivilegios(req.user);

        if (!isMandoEstrategico) {
            return res.status(403).json({ success: false, message: "Acceso denegado. Solo los Mandos Estratégicos pueden eliminar aeronaves." });
        }

        const aeronaveEliminada = await Aircraft.findByIdAndDelete(id);
        if (!aeronaveEliminada) {
            return res.status(404).json({ success: false, message: "No se encontró la aeronave solicitada." });
        }

        return res.status(200).json({ success: true, message: `La aeronave ${aeronaveEliminada.matricula} ha sido eliminada permanentemente.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error al eliminar la aeronave.", error: error.message });
    }
};