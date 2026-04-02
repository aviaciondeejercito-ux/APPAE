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
        const userRole = req.user.role ? String(req.user.role).toUpperCase().trim() : '';
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
        if (req.query.unidad && (userRole === 'admin' || userRole === 'BOSS')) {
            query.unidad = String(req.query.unidad).trim().toUpperCase();
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1, matricula: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('❌ Error AE (getAircrafts):', error);
        res.status(500).json({ success: false, message: "Error al acceder al registro de flota", error: error.message });
    }
};

// 2. Crear una nueva aeronave (Incorporación al Inventario)
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body; // Tomamos la unidad que viene del frontend
        const userRole = req.user.role ? String(req.user.role).toUpperCase().trim() : '';
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        // --- LÓGICA DE SEGURIDAD SINCRO JOKER ---
        if (userRole === 'admin' || userRole === 'BOSS') {
            // El ADMIN/BOSS puede usar la unidad que viene en el body (la elegida en el select)
            if (!unidad) return res.status(400).json({ message: "El ADMIN debe especificar una unidad de destino." });
        } else if (['S4', 'S4_UNIDAD', 'OFICINA_TECNICA'].includes(userRole)) {
            // Personal técnico: Se ignora lo que envíen y se fuerza SU unidad de sesión
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil para dar el alta." });
            unidad = userElemento;
        } else {
            // Otros roles no tienen permiso de creación
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

// 3. Actualizar Estado, Horas y NOVEDADES (Gestión Operativa)
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, horasRemanentes, novedades, matricula, sda, unidad } = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada en el inventario." });

        // SEGURIDAD: Normalización de Roles
        const userRole = req.user.role ? String(req.user.role).toUpperCase().trim() : '';
        const esMandoSuperior = ['admin', 'BOSS'].includes(userRole);
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        // Verificación de pertenencia a la unidad para roles no-administradores
        if (!esMandoSuperior && userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ 
                message: `Denegado: Su unidad (${userElemento}) no tiene autoridad sobre material de ${aircraft.unidad}.` 
            });
        }

        // Actualización de campos técnicos y operativos
        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = Number(horasRemanentes);
        
        // Gestión de Novedades (Sincro Joker: Todo en Mayúsculas)
        if (novedades !== undefined) {
            aircraft.novedades = String(novedades).toUpperCase().trim(); 
        }

        // Solo Mandos, Oficina Técnica o S4_UNIDAD (de su unidad) pueden cambiar datos de identificación
        if (esMandoSuperior || userRole === 'OFICINA_TECNICA' || userRole === 'S4_UNIDAD') {
            if (matricula) aircraft.matricula = matricula.toUpperCase().trim();
            if (sda) aircraft.sda = sda.toUpperCase().trim();
            // Permitir cambiar la unidad solo a Mandos Superiores (Transferencia de Material)
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

// 4. Eliminar aeronave (Baja Definitiva del Registro)
exports.deleteAircraft = async (req, res) => {
    try {
        const userRole = req.user.role ? String(req.user.role).toUpperCase().trim() : '';
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        const aircraft = await Aircraft.findById(req.params.id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no encontrada." });

        // SEGURIDAD: Solo Admin Central, Oficina Técnica o S4_UNIDAD de la misma unidad
        const esAdmin = userRole === 'admin';
        const esPersonalAutorizadoUnidad = (['OFICINA_TECNICA', 'S4_UNIDAD'].includes(userRole) && userElemento === String(aircraft.unidad).trim().toUpperCase());

        if (!esAdmin && !esPersonalAutorizadoUnidad) {
            return res.status(403).json({ message: "Seguridad: No posee permisos para dar de baja definitiva a este material." });
        }

        await Aircraft.findByIdAndDelete(req.params.id);
        res.json({ message: "Aeronave dada de baja del registro." });
    } catch (error) {
        console.error('❌ Error AE (deleteAircraft):', error);
        res.status(500).json({ message: "Error al procesar la baja definitiva", error: error.message });
    }
};