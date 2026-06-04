const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - MODO ACCESO TOTAL
 * Se han eliminado las restricciones de lectura para permitir que todos los 
 * usuarios visualicen la totalidad del inventario de aeronaves.
 */

// Función auxiliar (mantenida para auditoría de roles en escritura)
const verificarRol = (req) => {
    const rawRole = req.user && req.user.role ? String(req.user.role).trim().toUpperCase() : '';
    const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : '';
    
    return {
        role: rawRole,
        esMandoSuperior: ['ADMIN', 'BOSS', 'OTO', 'DIRECTOR'].includes(rawRole) || rawRole.includes('ADMIN') || userElemento === 'COMANDO',
        esTecnicoAutorizado: ['S4', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA'].includes(rawRole)
    };
};

// 1. Obtener todas las aeronaves (SIN FILTROS - ACCESO GLOBAL)
exports.getAircrafts = async (req, res) => {
    try {
        // Find({}) sin parámetros recupera todos los documentos de la colección
        const aircrafts = await Aircraft.find({}).sort({ unidad: 1, sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircrafts):', error);
        res.status(500).json({ success: false, message: "Error al acceder al registro de flota", error: error.message });
    }
};

// 2. Obtener aeronaves por Elemento (Filtro opcional, no restrictivo)
exports.getAircraftsByElemento = async (req, res) => {
    try {
        const { elemento } = req.params;
        let query = {};

        if (elemento && elemento !== 'all') {
            query.unidad = decodeURIComponent(elemento).trim().toUpperCase();
        }

        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircraftsByElemento):', error);
        res.status(500).json({ success: false, message: "Error al filtrar aeronaves", error: error.message });
    }
};

// 3. Crear una nueva aeronave
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body; 
        
        const control = verificarRol(req);
        const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        if (control.esMandoSuperior) {
            if (!unidad) return res.status(400).json({ message: "El nivel de mando debe especificar una unidad de destino." });
        } else if (control.esTecnicoAutorizado) {
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil para dar el alta." });
            unidad = userElemento;
        } else {
            return res.status(403).json({ message: `Acceso denegado: Su rol no posee permisos de alta.` });
        }

        const newAircraft = new Aircraft({
            ...req.body,
            matricula: String(matricula || "").toUpperCase().trim(),
            sda: String(sda || "").toUpperCase().trim(),
            unidad: String(unidad).trim().toUpperCase(),
            creadoPor: `${req.user.username || 'SISTEMA'} (${control.role})`,
            ultimaActualizacion: Date.now()
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
        console.error('❌ Error AE (createAircraft):', error);
        res.status(400).json({ message: "Error al incorporar aeronave", error: error.message });
    }
};

// 4. Actualizar Estado, Horas y Transferencias
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada." });

        const control = verificarRol(req);
        
        // Mapeo de campos técnicos
        if (updates.estado) aircraft.estado = updates.estado;
        if (updates.horasRemanentes !== undefined) aircraft.horasRemanentes = Number(updates.horasRemanentes);
        if (updates.horasPlaneador !== undefined) aircraft.horasPlaneador = Number(updates.horasPlaneador);
        if (updates.motores) aircraft.motores = updates.motores;
        if (updates.helices) aircraft.helices = updates.helices;
        if (updates.vencimientoSeguro) aircraft.vencimientoSeguro = updates.vencimientoSeguro;
        if (updates.vencimientoAvionica) aircraft.vencimientoAvionica = updates.vencimientoAvionica;
        if (updates.novedades !== undefined) aircraft.novedades = String(updates.novedades).toUpperCase().trim();

        if (control.esMandoSuperior || control.esTecnicoAutorizado) {
            if (updates.unidad) aircraft.unidad = updates.unidad.toUpperCase().trim();
        }
        
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username || 'SISTEMA'} (${control.role})`;

        await aircraft.save();
        res.json({ success: true, message: "Registro actualizado", aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error técnico", error: error.message });
    }
};

// 5. Eliminar aeronave
exports.deleteAircraft = async (req, res) => {
    try {
        const control = verificarRol(req);
        const esMandoConPermiso = ['ADMIN', 'OTO'].includes(control.role) || control.role.includes('ADMIN');

        if (!esMandoConPermiso && !control.esTecnicoAutorizado) {
            return res.status(403).json({ message: "No posee permisos para esta operación." });
        }

        await Aircraft.findByIdAndDelete(req.params.id);
        res.json({ message: "Aeronave dada de baja." });
    } catch (error) {
        res.status(500).json({ message: "Error al procesar baja", error: error.message });
    }
};