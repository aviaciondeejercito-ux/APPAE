const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - ESTÁNDAR DE SEGURIDAD AE
 * Gestión de Material, Horas y Novedades por Unidad.
 */

// 1. Obtener aeronaves (Con filtrado automático por Unidad/Elemento)
exports.getAircrafts = async (req, res) => {
    try {
        let query = {};

        // SEGURIDAD: Si es S4_UNIDAD, solo puede ver material de su propio elemento
        if (req.user.role === 'S4_UNIDAD') {
            query.unidad = req.user.elemento;
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1 });
        res.json(aircrafts);
    } catch (error) {
        res.status(500).json({ message: "Error al acceder al registro de flota", error });
    }
};

// 2. Crear una nueva aeronave (Restringido a Admin)
exports.createAircraft = async (req, res) => {
    try {
        // Doble verificación de rol en controlador
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Acceso denegado: Se requiere nivel Administrador." });
        }

        const { unidad, matricula } = req.body;
        if (!unidad || !matricula) {
            return res.status(400).json({ message: "Faltan datos críticos: Unidad y Matrícula son obligatorios." });
        }

        const newAircraft = new Aircraft({
            ...req.body,
            creadoPor: req.user.nombreReal // Registro de autoría inicial
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
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

        // SEGURIDAD OPERATIVA: Validar que el usuario pertenezca al mismo elemento
        // Los 'admin' y 'boss' tienen acceso global; 'S4_UNIDAD' está restringido a su cuartel.
        const esAdminOBoss = ['admin', 'boss'].includes(req.user.role);
        
        if (!esAdminOBoss && req.user.elemento !== aircraft.unidad) {
            return res.status(403).json({ 
                message: `Violación de Seguridad: Su usuario (${req.user.elemento}) no tiene permisos sobre material de ${aircraft.unidad}.` 
            });
        }

        // Actualización Atómica de Campos Operativos
        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = horasRemanentes;
        if (novedades !== undefined) aircraft.novedades = novedades;
        
        // Datos de Auditoría
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.nombreReal} (${req.user.role})`;

        await aircraft.save();
        res.json({ message: "Estado de material actualizado y auditado correctamente", aircraft });

    } catch (error) {
        res.status(500).json({ message: "Error técnico en la actualización de material", error });
    }
};

// 4. Eliminar aeronave (Restringido a Admin)
exports.deleteAircraft = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Operación de alta seguridad: Solo permitida para Administradores." });
        }

        const deleted = await Aircraft.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Aeronave no encontrada." });

        res.json({ message: "Aeronave dada de baja del registro central exitosamente." });
    } catch (error) {
        res.status(500).json({ message: "Error al procesar la baja definitiva", error });
    }
};