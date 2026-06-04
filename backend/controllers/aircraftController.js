const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - SEGURIDAD JERÁRQUICA
 * Mando Global (ADMIN, BOSS, DIRECTOR, OTO): Ver toda la flota.
 * Resto de roles: Filtrado estricto por elemento/unidad del usuario.
 */

const verificarRol = (req) => {
    const rawRole = req.user && req.user.role ? String(req.user.role).trim().toUpperCase() : '';
    const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : '';
    
    // Roles que tienen acceso a ver TODO el inventario
    const mandosGlobales = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'];
    
    return {
        role: rawRole,
        userElemento: userElemento,
        esMandoSuperior: mandosGlobales.includes(rawRole) || rawRole.includes('ADMIN'),
        esTecnicoAutorizado: ['S4', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA'].includes(rawRole)
    };
};

// 1. Obtener todas las aeronaves (Filtro jerárquico aplicado)
exports.getAircrafts = async (req, res) => {
    try {
        const control = verificarRol(req);
        let query = {};

        // Si NO es mando superior, restringimos la consulta a su unidad
        if (!control.esMandoSuperior) {
            if (!control.userElemento) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Acceso restringido: No tiene una unidad/elemento asignado." 
                });
            }
            query.unidad = control.userElemento;
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircrafts):', error);
        res.status(500).json({ success: false, message: "Error al acceder al registro", error: error.message });
    }
};

// 2. Obtener aeronaves por Elemento (Blindado para usuarios restringidos)
exports.getAircraftsByElemento = async (req, res) => {
    try {
        const { elemento } = req.params;
        const control = verificarRol(req);
        let query = {};

        // Si no es mando global, ignoramos el parámetro y forzamos su unidad
        if (!control.esMandoSuperior) {
            query.unidad = control.userElemento;
        } else if (elemento && elemento !== 'all') {
            query.unidad = decodeURIComponent(elemento).trim().toUpperCase();
        }

        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircraftsByElemento):', error);
        res.status(500).json({ success: false, message: "Error al filtrar", error: error.message });
    }
};

// 3. Crear una nueva aeronave
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body; 
        
        const control = verificarRol(req);

        if (control.esMandoSuperior) {
            if (!unidad) return res.status(400).json({ message: "El nivel de mando debe especificar una unidad de destino." });
        } else if (control.esTecnicoAutorizado) {
            if (!control.userElemento) return res.status(403).json({ message: "Falta asignación de unidad para el alta." });
            unidad = control.userElemento;
        } else {
            return res.status(403).json({ message: "Acceso denegado: Su rol no posee permisos de alta." });
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
        res.status(400).json({ message: "Error al incorporar aeronave", error: error.message });
    }
};

// 4. Actualizar Estado, Horas y Transferencias
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const control = verificarRol(req);
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada." });

        // Validación de autoridad para editar
        if (!control.esMandoSuperior && control.userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ message: "No tiene autoridad sobre el material de otra unidad." });
        }

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
        const aircraft = await Aircraft.findById(req.params.id);
        
        if (!aircraft) return res.status(404).json({ message: "Aeronave no encontrada." });

        const tienePermisoBaja = control.esMandoSuperior || 
                                (control.esTecnicoAutorizado && control.userElemento === String(aircraft.unidad).trim().toUpperCase());

        if (!tienePermisoBaja) {
            return res.status(403).json({ message: "No posee permisos para dar de baja este material." });
        }

        await Aircraft.findByIdAndDelete(req.params.id);
        res.json({ message: "Aeronave dada de baja." });
    } catch (error) {
        res.status(500).json({ message: "Error al procesar baja", error: error.message });
    }
};