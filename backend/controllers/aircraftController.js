const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - ESTÁNDAR DE SEGURIDAD AE
 * Gestión de Material, Horas y Novedades por Unidad.
 */

// 1. Obtener aeronaves (Con filtrado automático por Unidad/Elemento)
exports.getAircrafts = async (req, res) => {
    try {
        let query = {};
        const userRole = req.user.role;
        const userElemento = req.user.elemento ? String(req.user.elemento).trim() : null;

        // SEGURIDAD: Los administradores y jefes (boss) ven todo el material. 
        // El S4 / S4_UNIDAD está restringido a ver solo el material de su elemento asignado.
        if (userRole === 'S4' || userRole === 'S4_UNIDAD') {
            if (!userElemento) {
                return res.status(403).json({ message: "Error de Seguridad: Usuario sin unidad asignada en credenciales." });
            }
            query.unidad = userElemento;
        }

        // Si el frontend envía una unidad específica por query (ej. Admin filtrando)
        if (req.query.unidad && (userRole === 'admin' || userRole === 'boss')) {
            query.unidad = String(req.query.unidad).trim();
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('Error AE (getAircrafts):', error);
        res.status(500).json({ message: "Error al acceder al registro de flota", error });
    }
};

// 2. Crear una nueva aeronave (Habilitado para Admin y S4)
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body;
        const userRole = req.user.role;
        const userElemento = req.user.elemento ? String(req.user.elemento).trim() : null;

        // VALIDACIÓN DE SEGURIDAD OPERATIVA Y ASIGNACIÓN AUTOMÁTICA
        if (userRole === 'S4' || userRole === 'S4_UNIDAD') {
            // El S4 solo puede crear aeronaves para SU unidad (forzamos el dato del token)
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil." });
            unidad = userElemento;
        } else if (userRole !== 'admin' && userRole !== 'boss') {
            return res.status(403).json({ message: "Acceso denegado: No posee permisos de escritura de material." });
        }

        // Estandarización de datos obligatorios
        const finalUnidad = String(unidad || "").trim();
        const finalMatricula = String(matricula || "").toUpperCase().trim();
        const finalSda = String(sda || "").toUpperCase().trim();

        if (!finalUnidad || !finalMatricula || !finalSda) {
            return res.status(400).json({ 
                message: "Faltan datos críticos: Unidad, SdA y Matrícula son obligatorios.",
                debug: { unidadRecibida: finalUnidad } 
            });
        }

        const newAircraft = new Aircraft({
            ...req.body,
            matricula: finalMatricula,
            sda: finalSda,
            unidad: finalUnidad,
            creadoPor: `${req.user.username} (${userRole})`,
            ultimaActualizacion: Date.now()
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
        console.error('Error AE (createAircraft):', error);
        res.status(400).json({ 
            message: "Error al incorporar aeronave. La matrícula podría estar duplicada.", 
            error: error.message 
        });
    }
};

// 3. Actualizar Estado de Aeronave (Lógica Crítica S4 / Admin)
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, horasRemanentes, novedades, matricula, sda } = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada en el sistema." });

        // SEGURIDAD OPERATIVA: Validar pertenencia de unidad
        const esAdminOBoss = ['admin', 'boss'].includes(req.user.role);
        const userElemento = req.user.elemento ? String(req.user.elemento).trim() : null;
        
        if (!esAdminOBoss && userElemento !== String(aircraft.unidad).trim()) {
            return res.status(403).json({ 
                message: `Violación de Seguridad: Su unidad (${userElemento}) no tiene permisos sobre material de ${aircraft.unidad}.` 
            });
        }

        // Actualización de Campos con Normalización
        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = Number(horasRemanentes);
        if (novedades !== undefined) aircraft.novedades = novedades;
        if (matricula) aircraft.matricula = matricula.toUpperCase().trim();
        if (sda) aircraft.sda = sda.toUpperCase().trim();
        
        // Registro de Auditoría
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username} (${req.user.role})`;

        await aircraft.save();
        res.json({ message: "Estado de material actualizado y auditado correctamente", aircraft });

    } catch (error) {
        console.error('Error AE (updateAircraftStatus):', error);
        res.status(500).json({ message: "Error técnico en la actualización de material", error });
    }
};

// 4. Eliminar aeronave (Restringido estrictamente a Admin)
exports.deleteAircraft = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Operación de alta seguridad: Solo permitida para Administradores." });
        }

        const deleted = await Aircraft.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Aeronave no encontrada." });

        res.json({ message: "Aeronave dada de baja del registro central exitosamente." });
    } catch (error) {
        console.error('Error AE (deleteAircraft):', error);
        res.status(500).json({ message: "Error al procesar la baja definitiva", error });
    }
};