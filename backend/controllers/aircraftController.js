const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - ESTÁNDAR DE SEGURIDAD AE
 * Gestión de Material, Horas y Novedades por Unidad.
 * Estándar: SINCRO JOKER - Trazabilidad total de material aéreo.
 */

// Función auxiliar interna para estandarizar los chequeos de rol (Case-Insensitive)
const verificarRol = (req) => {
    const rawRole = req.user && req.user.role ? String(req.user.role).trim().toUpperCase() : '';
    // CORRECCIÓN: Si el rol incluye ADMIN (ej: ADMINISTRADOR, SUPER_ADMIN, ADMIN), es mando superior global.
    const esMando = ['ADMIN', 'BOSS', 'OTO', 'DIRECTOR'].includes(rawRole) || rawRole.includes('ADMIN');
    
    return {
        role: rawRole,
        esMandoSuperior: esMando,
        esTecnicoAutorizado: ['S4', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA'].includes(rawRole),
        esUsuarioRestringido: !esMando
    };
};

// 1. Obtener aeronaves (Con filtrado jerárquico por Unidad)
exports.getAircrafts = async (req, res) => {
    try {
        let query = {};
        const control = verificarRol(req);
        const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        // Filtro estricto SOLO si no es mando superior / administrador
        if (control.esUsuarioRestringido) {
            if (!userElemento) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Error de Seguridad: Usuario sin unidad asignada en credenciales." 
                });
            }
            query.unidad = userElemento;
        }

        // Permitir a Mandos Superiores filtrar por unidad específica vía query si la solicitan
        if (req.query.unidad && control.esMandoSuperior) {
            query.unidad = String(req.query.unidad).trim().toUpperCase();
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircrafts):', error);
        res.status(500).json({ success: false, message: "Error al acceder al registro de flota", error: error.message });
    }
};

/**
 * 2. Obtener aeronaves por Elemento (Ruta por Params)
 */
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
        res.status(500).json({ success: false, message: "Error al filtrar aeronaves por unidad", error: error.message });
    }
};

// 3. Crear una nueva aeronave (Incorporación al Inventario)
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body; 
        
        const control = verificarRol(req);
        const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        if (control.esMandoSuperior) {
            if (!unidad) return res.status(400).json({ message: "El level de mando debe especificar una unidad de destino." });
        } else if (control.esTecnicoAutorizado) {
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil para dar el alta." });
            unidad = userElemento;
        } else {
            return res.status(403).json({ message: `Acceso denegado: Su rol (${req.user.role}) no posee permisos de alta de material.` });
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

// 4. Actualizar Estado, Horas, VENCIMIENTOS y TRANSFERENCIAS entre unidades
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada en el inventario." });

        const control = verificarRol(req);
        const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        // VALIDACIÓN DE AUTORIDAD DE ORIGEN:
        if (!control.esMandoSuperior && userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ 
                success: false,
                message: `Denegado: Su unidad (${userElemento}) no tiene autoridad sobre material de ${aircraft.unidad}.` 
            });
        }

        // --- MAPEO DE CAMPOS TÉCNICOS ---
        if (updates.estado) aircraft.estado = updates.estado;
        if (updates.horasRemanentes !== undefined) aircraft.horasRemanentes = Number(updates.horasRemanentes);
        if (updates.horasPlaneador !== undefined) aircraft.horasPlaneador = Number(updates.horasPlaneador);
        
        if (updates.motores) aircraft.motores = updates.motores;
        if (updates.helices) aircraft.helices = updates.helices;

        // --- VENCIMIENTOS (FIX RAAC 91.207) ---
        if (updates.vencimientoSeguro) aircraft.vencimientoSeguro = updates.vencimientoSeguro;
        if (updates.vencimientoAvionica) aircraft.vencimientoAvionica = updates.vencimientoAvionica;
        if (updates.vencimientoRAAC91207) aircraft.vencimientoRAAC91207 = updates.vencimientoRAAC91207;
        if (updates.vencimientoRAAC91411) aircraft.vencimientoRAAC91411 = updates.vencimientoRAAC91411;
        if (updates.vencimientoRAAC91413) aircraft.vencimientoRAAC91413 = updates.vencimientoRAAC91413;
        
        if (updates.novedades !== undefined) {
            aircraft.novedades = String(updates.novedades).toUpperCase().trim(); 
        }

        // --- EDICIÓN ESTRUCTURAL Y LOGICA DE TRANSFERENCIAS ---
        if (control.esMandoSuperior || control.esTecnicoAutorizado) {
            if (updates.matricula) aircraft.matricula = updates.matricula.toUpperCase().trim();
            if (updates.sda) aircraft.sda = updates.sda.toUpperCase().trim();
            if (updates.tipoIcono) aircraft.tipoIcono = updates.tipoIcono.toLowerCase().trim();
            
            if (updates.unidad) {
                aircraft.unidad = updates.unidad.toUpperCase().trim();
            }
        }
        
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username || 'SISTEMA'} (${control.role})`;

        await aircraft.save();
        res.json({ success: true, message: "Registro actualizado y procesado correctamente", aircraft });

    } catch (error) {
        console.error('❌ Error AE (updateAircraftStatus):', error);
        res.status(500).json({ success: false, message: "Error técnico en la actualización", error: error.message });
    }
};

// 5. Eliminar aeronave (Baja Definitiva)
exports.deleteAircraft = async (req, res) => {
    try {
        const control = verificarRol(req);
        const userElemento = req.user && req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        const aircraft = await Aircraft.findById(req.params.id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no encontrada." });

        const esMandoConPermiso = ['ADMIN', 'OTO'].includes(control.role) || control.role.includes('ADMIN');
        const esPersonalAutorizadoUnidad = (control.esTecnicoAutorizado && userElemento === String(aircraft.unidad).trim().toUpperCase());

        if (!esMandoConPermiso && !esPersonalAutorizadoUnidad) {
            return res.status(403).json({ message: "Seguridad: No posee permisos para tramitar la baja de este material." });
        }

        await Aircraft.findByIdAndDelete(req.params.id);
        res.json({ message: "Aeronave dada de baja del registro." });
    } catch (error) {
        console.error('❌ Error AE (deleteAircraft):', error);
        res.status(500).json({ message: "Error al procesar la baja definitiva", error: error.message });
    }
};