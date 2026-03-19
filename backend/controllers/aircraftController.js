const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - ESTÁNDAR DE SEGURIDAD AE
 * Gestión de Material, Horas y Novedades por Unidad.
 */

// 1. Obtener aeronaves (Con filtrado automático por Unidad/Elemento)
exports.getAircrafts = async (req, res) => {
    try {
        let query = {};

        // SEGURIDAD: Los administradores y jefes ven todo. 
        // El S4_UNIDAD está restringido a ver solo el material de su elemento asignado.
        if (req.user.role === 'S4_UNIDAD') {
            query.unidad = req.user.elemento;
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('Error en getAircrafts:', error);
        res.status(500).json({ message: "Error al acceder al registro de flota", error });
    }
};

// 2. Crear una nueva aeronave (Habilitado para Admin y S4_UNIDAD)
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body;

        // VALIDACIÓN DE SEGURIDAD OPERATIVA
        if (req.user.role === 'S4_UNIDAD') {
            // El S4 solo puede crear aeronaves para SU unidad (ignoramos lo que venga del body)
            unidad = req.user.elemento;
        } else if (req.user.role !== 'admin') {
            // Cualquier otro rol que no sea Admin o S4 tiene el acceso denegado aquí
            return res.status(403).json({ message: "Acceso denegado: No posee permisos de escritura de material." });
        }

        if (!unidad || !matricula || !sda) {
            return res.status(400).json({ message: "Faltan datos críticos: Unidad, SdA y Matrícula son obligatorios." });
        }

        const newAircraft = new Aircraft({
            ...req.body,
            unidad, // Forzamos la unidad validada arriba
            creadoPor: `${req.user.username} (${req.user.role})` // Registro de autoría para auditoría
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
        console.error('Error en createAircraft:', error);
        res.status(400).json({ message: "Error al incorporar aeronave. Verifique si la matrícula ya existe.", error });
    }
};

// 3. Actualizar Estado de Aeronave (Lógica Crítica S4 / Admin)
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, horasRemanentes, novedades } = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada en el sistema." });

        // SEGURIDAD OPERATIVA: Validar pertenencia al elemento
        const esAdminOBoss = ['admin', 'boss'].includes(req.user.role);
        
        if (!esAdminOBoss && req.user.elemento !== aircraft.unidad) {
            return res.status(403).json({ 
                message: `Violación de Seguridad: Su usuario (${req.user.elemento}) no tiene permisos sobre material de ${aircraft.unidad}.` 
            });
        }

        // Actualización de Campos Operativos
        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = horasRemanentes;
        if (novedades !== undefined) aircraft.novedades = novedades;
        
        // Datos de Auditoría e Integridad
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.username} (${req.user.role})`;

        await aircraft.save();
        res.json({ message: "Estado de material actualizado y auditado correctamente", aircraft });

    } catch (error) {
        console.error('Error en updateAircraftStatus:', error);
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
        console.error('Error en deleteAircraft:', error);
        res.status(500).json({ message: "Error al procesar la baja definitiva", error });
    }
};