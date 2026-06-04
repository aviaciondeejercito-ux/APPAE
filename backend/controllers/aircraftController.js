const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - SEGURIDAD JERÁRQUICA
 * Lectura: Mando Global (ADMIN, BOSS, DIRECTOR, OTO) ve TODO. Resto ve su unidad.
 * Escritura: Solo ADMIN y OFICINA_TECNICA pueden editar/transferir/borrar.
 */

const verificarRol = (req) => {
    const rawRole = req.user && req.user.role ? String(req.user.role).trim().toUpperCase() : '';
    const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : '';
    
    const mandosGlobales = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'];
    
    return {
        role: rawRole,
        userElemento: userElemento,
        esMandoSuperior: mandosGlobales.includes(rawRole) || rawRole.includes('ADMIN'),
        esTecnicoAutorizado: ['OFICINA_TECNICA', 'OFICINA_CE_TECNICA', 'S4', 'S4_UNIDAD'].includes(rawRole)
    };
};

// 1. Obtener todas las aeronaves (Filtro jerárquico)
exports.getAircrafts = async (req, res) => {
    try {
        const control = verificarRol(req);
        let query = {};

        if (!control.esMandoSuperior) {
            if (!control.userElemento) {
                return res.status(403).json({ success: false, message: "Acceso restringido: Sin unidad asignada." });
            }
            query.unidad = control.userElemento;
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al acceder al registro", error: error.message });
    }
};

// 2. Obtener aeronaves por Elemento
exports.getAircraftsByElemento = async (req, res) => {
    try {
        const { elemento } = req.params;
        const control = verificarRol(req);
        let query = {};

        if (!control.esMandoSuperior) {
            query.unidad = control.userElemento;
        } else if (elemento && elemento !== 'all') {
            query.unidad = decodeURIComponent(elemento).trim().toUpperCase();
        }

        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al filtrar", error: error.message });
    }
};

// 3. Crear una nueva aeronave
exports.createAircraft = async (req, res) => {
    try {
        const control = verificarRol(req);
        // Validamos permiso de escritura: Solo Admin o Técnica
        if (!control.esMandoSuperior && !control.esTecnicoAutorizado) {
            return res.status(403).json({ message: "Acceso denegado: No posee permisos de alta." });
        }

        let { unidad } = req.body;
        if (control.esMandoSuperior) {
            if (!unidad) return res.status(400).json({ message: "El Mando debe especificar unidad." });
        } else {
            unidad = control.userElemento; // Técnica solo alta en su unidad
        }

        const newAircraft = new Aircraft({
            ...req.body,
            matricula: String(req.body.matricula || "").toUpperCase().trim(),
            sda: String(req.body.sda || "").toUpperCase().trim(),
            unidad: String(unidad).trim().toUpperCase(),
            creadoPor: `${req.user.username || 'SISTEMA'} (${control.role})`
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
        res.status(400).json({ message: "Error al incorporar aeronave", error: error.message });
    }
};

// 4. Actualizar Estado, Horas y Transferencias (SOLO ADMIN/TECNICA)
exports.updateAircraftStatus = async (req, res) => {
    try {
        const control = verificarRol(req);
        
        // Validación de permisos de escritura
        if (!control.esMandoSuperior && !control.esTecnicoAutorizado) {
            return res.status(403).json({ message: "Acceso denegado: No posee permisos de edición." });
        }

        const aircraft = await Aircraft.findById(req.params.id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada." });

        // Validación de unidad para Técnico
        if (!control.esMandoSuperior && control.userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ message: "No tiene autoridad sobre el material de otra unidad." });
        }

        const updates = req.body;
        // Aplicar actualizaciones...
        Object.assign(aircraft, updates);
        
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username || 'SISTEMA'} (${control.role})`;

        await aircraft.save();
        res.json({ success: true, message: "Registro actualizado", aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error técnico", error: error.message });
    }
};

// 5. Eliminar aeronave (SOLO ADMIN/TECNICA)
exports.deleteAircraft = async (req, res) => {
    try {
        const control = verificarRol(req);
        
        if (!control.esMandoSuperior && !control.esTecnicoAutorizado) {
            return res.status(403).json({ message: "No posee permisos para esta operación." });
        }

        const aircraft = await Aircraft.findById(req.params.id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no encontrada." });

        if (!control.esMandoSuperior && control.userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ message: "No tiene autoridad sobre este material." });
        }

        await Aircraft.findByIdAndDelete(req.params.id);
        res.json({ message: "Aeronave dada de baja." });
    } catch (error) {
        res.status(500).json({ message: "Error al procesar baja", error: error.message });
    }
};