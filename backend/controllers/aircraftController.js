const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - ESTÁNDAR DE SEGURIDAD AE
 * Gestión de Material, Horas y Novedades por Unidad.
 * Estándar: SINCRO JOKER - Trazabilidad total de material aéreo.
 */

// 1. Obtener aeronaves (Con filtrado jerárquico por Unidad)
exports.getAircrafts = async (req, res) => {
    try {
        let query = {};
        // Normalización Sincro Joker: Mayúsculas y Guion Bajo
        const rawRole = req.user.role ? String(req.user.role).trim() : '';
        const userRole = (rawRole === 'admin' || rawRole === 'OTO') ? rawRole : rawRole.toUpperCase();
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        // Filtro estricto para usuarios de unidad y niveles técnicos
        const unidadRestrictedRoles = ['USER', 'S4', 'S4_UNIDAD', 'OFICINA_TECNICA'];
        
        if (unidadRestrictedRoles.includes(userRole)) {
            if (!userElemento) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Error de Seguridad: Usuario sin unidad asignada en credenciales." 
                });
            }
            query.unidad = userElemento;
        }

        // Permitir a Mandos Superiores filtrar por unidad específica vía query
        if (req.query.unidad && (userRole === 'admin' || userRole === 'BOSS' || userRole === 'OTO')) {
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
 * 2. NUEVA FUNCIÓN: Obtener aeronaves por Elemento (Ruta por Params)
 * Resuelve la llamada de EventService.js: /api/aircraft/:elemento
 */
exports.getAircraftsByElemento = async (req, res) => {
    try {
        const { elemento } = req.params;
        let query = {};

        if (elemento && elemento !== 'all') {
            // Decodificamos por si viene con espacios (%20)
            query.unidad = decodeURIComponent(elemento).trim().toUpperCase();
        }

        // En esta ruta específica, devolvemos solo aeronaves con estado operativo o en inspección 
        // (Configurable según necesidad táctica)
        const aircrafts = await Aircraft.find(query).sort({ sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircraftsByElemento):', error);
        res.status(500).json({ 
            success: false, 
            message: "Error al filtrar aeronaves por unidad", 
            error: error.message 
        });
    }
};

// 3. Crear una nueva aeronave (Incorporación al Inventario)
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body; 
        const rawRole = req.user.role ? String(req.user.role).trim() : '';
        const userRole = (rawRole === 'admin' || rawRole === 'OTO') ? rawRole : rawRole.toUpperCase();
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        // --- LÓGICA DE SEGURIDAD SINCRO JOKER ---
        if (userRole === 'admin' || userRole === 'BOSS' || userRole === 'OTO') {
            if (!unidad) return res.status(400).json({ message: "El nivel de mando debe especificar una unidad de destino." });
        } else if (['S4', 'S4_UNIDAD', 'OFICINA_TECNICA'].includes(userRole)) {
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil para dar el alta." });
            unidad = userElemento;
        } else {
            return res.status(403).json({ message: "Acceso denegado: Su rol no posee permisos de alta de material." });
        }

        const finalUnidad = String(unidad).trim().toUpperCase();
        const finalMatricula = String(matricula || "").toUpperCase().trim();
        const finalSda = String(sda || "").toUpperCase().trim();

        if (!finalUnidad || !finalMatricula || !finalSda) {
            return res.status(400).json({ 
                message: "Faltan datos críticos: Unidad, SdA y Matrícula son obligatorios." 
            });
        }

        const newAircraft = new Aircraft({
            ...req.body,
            matricula: finalMatricula,
            sda: finalSda,
            unidad: finalUnidad,
            creadoPor: `${req.user.username || 'SISTEMA'} (${userRole})`,
            ultimaActualizacion: Date.now()
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
        console.error('❌ Error AE (createAircraft):', error);
        res.status(400).json({ 
            message: "Error al incorporar aeronave. Verifique si la matrícula ya existe.", 
            error: error.message 
        });
    }
};

// 4. Actualizar Estado, Horas y NOVEDADES (Gestión Operativa)
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, horasRemanentes, novedades, matricula, sda, unidad, tipoIcono } = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada en el inventario." });

        const rawRole = req.user.role ? String(req.user.role).trim() : '';
        const userRole = (rawRole === 'admin' || rawRole === 'OTO') ? rawRole : rawRole.toUpperCase();
        const esMandoSuperior = ['admin', 'BOSS', 'OTO'].includes(userRole);
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        if (!esMandoSuperior && userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ 
                message: `Denegado: Su unidad (${userElemento}) no tiene autoridad sobre material de ${aircraft.unidad}.` 
            });
        }

        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = Number(horasRemanentes);
        
        if (novedades !== undefined) {
            aircraft.novedades = String(novedades).toUpperCase().trim(); 
        }

        // Permite actualización de datos estructurales incluyendo el nuevo campo tipoIcono
        if (esMandoSuperior || userRole === 'OFICINA_TECNICA' || userRole === 'S4_UNIDAD') {
            if (matricula) aircraft.matricula = matricula.toUpperCase().trim();
            if (sda) aircraft.sda = sda.toUpperCase().trim();
            if (tipoIcono) aircraft.tipoIcono = tipoIcono.toLowerCase().trim();
            if (unidad && esMandoSuperior) aircraft.unidad = unidad.toUpperCase().trim(); 
        }
        
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username || 'SISTEMA'} (${userRole})`;

        await aircraft.save();
        res.json({ 
            success: true, 
            message: "Registro operativo actualizado correctamente", 
            aircraft 
        });

    } catch (error) {
        console.error('❌ Error AE (updateAircraftStatus):', error);
        res.status(500).json({ success: false, message: "Error técnico en la actualización", error: error.message });
    }
};

// 5. Eliminar aeronave (Baja Definitiva del Registro)
exports.deleteAircraft = async (req, res) => {
    try {
        const rawRole = req.user.role ? String(req.user.role).trim() : '';
        const userRole = (rawRole === 'admin' || rawRole === 'OTO') ? rawRole : rawRole.toUpperCase();
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        const aircraft = await Aircraft.findById(req.params.id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no encontrada." });

        const esAdminMando = (userRole === 'admin' || userRole === 'OTO');
        const esPersonalAutorizadoUnidad = (['OFICINA_TECNICA', 'S4_UNIDAD'].includes(userRole) && userElemento === String(aircraft.unidad).trim().toUpperCase());

        if (!esAdminMando && !esPersonalAutorizadoUnidad) {
            return res.status(403).json({ message: "Seguridad: No posee permisos para dar de baja definitiva a este material." });
        }

        await Aircraft.findByIdAndDelete(req.params.id);
        res.json({ message: "Aeronave dada de baja del registro." });
    } catch (error) {
        console.error('❌ Error AE (deleteAircraft):', error);
        res.status(500).json({ message: "Error al procesar la baja definitiva", error: error.message });
    }
};