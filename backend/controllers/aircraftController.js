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
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        // Filtro estricto para usuarios de unidad y S4
        if (['user', 's4', 's4_unidad'].includes(userRole)) {
            if (!userElemento) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Error de Seguridad: Usuario sin unidad asignada en credenciales." 
                });
            }
            query.unidad = userElemento;
        }

        // Permitir a Mandos Superiores filtrar por unidad específica vía query
        if (req.query.unidad && (userRole === 'admin' || userRole === 'boss')) {
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
        let { unidad } = req.body;
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;

        // Validación de permisos para creación
        if (['s4', 's4_unidad'].includes(userRole)) {
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil para dar el alta." });
            unidad = userElemento;
        } else if (userRole !== 'admin' && userRole !== 'boss') {
            return res.status(403).json({ message: "Acceso denegado: Su rol no posee permisos de alta de material." });
        }

        const finalUnidad = String(unidad || "").trim().toUpperCase();
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
            creadoPor: `${req.user.username || 'SISTEMA'} (${userRole.toUpperCase()})`,
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

        // SEGURIDAD: Solo Mandos o el S4 de la unidad responsable
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
        const esMandoSuperior = ['admin', 'boss'].includes(userRole);
        const userElemento = req.user.elemento ? String(req.user.elemento).trim().toUpperCase() : null;
        
        if (!esMandoSuperior && userElemento !== String(aircraft.unidad).trim().toUpperCase()) {
            return res.status(403).json({ 
                message: `Denegado: Su unidad (${userElemento}) no tiene autoridad sobre material de ${aircraft.unidad}.` 
            });
        }

        // Actualización de campos técnicos y operativos
        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = Number(horasRemanentes);
        
        // Gestión de Novedades: Permite limpieza enviando string vacío
        if (novedades !== undefined) {
            aircraft.novedades = String(novedades).toUpperCase().trim(); 
        }

        // Solo Mandos pueden cambiar datos de identificación o reasignar unidad
        if (esMandoSuperior) {
            if (matricula) aircraft.matricula = matricula.toUpperCase().trim();
            if (sda) aircraft.sda = sda.toUpperCase().trim();
            if (unidad) aircraft.unidad = unidad.toUpperCase().trim();
        }
        
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username || 'SISTEMA'} (${userRole.toUpperCase()})`;

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
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
        
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Seguridad: Solo el Administrador Central puede dar de baja definitiva al material." });
        }

        const deleted = await Aircraft.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Aeronave no encontrada." });

        res.json({ message: "Aeronave dada de baja del registro central." });
    } catch (error) {
        console.error('❌ Error AE (deleteAircraft):', error);
        res.status(500).json({ message: "Error al procesar la baja definitiva", error: error.message });
    }
};