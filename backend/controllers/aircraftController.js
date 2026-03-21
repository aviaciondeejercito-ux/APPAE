const Aircraft = require('../models/Aircraft');

/**
 * CONTROLADOR DE AERONAVES - ESTÁNDAR DE SEGURIDAD AE
 * Gestión de Material, Horas y Novedades por Unidad.
 */

// 1. Obtener aeronaves (Con filtrado jerárquico)
exports.getAircrafts = async (req, res) => {
    try {
        let query = {};
        const userRole = req.user.role;
        const userElemento = req.user.elemento ? String(req.user.elemento).trim() : null;

        if (['user', 's4', 'S4_UNIDAD'].includes(userRole)) {
            if (!userElemento) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Error de Seguridad: Usuario sin unidad asignada en credenciales." 
                });
            }
            query.unidad = userElemento;
        }

        if (req.query.unidad && (userRole === 'admin' || userRole === 'boss')) {
            query.unidad = String(req.query.unidad).trim();
        }

        const aircrafts = await Aircraft.find(query).sort({ unidad: 1, sda: 1 });
        res.json(aircrafts);
    } catch (error) {
        console.error('Error AE (getAircrafts):', error);
        res.status(500).json({ success: false, message: "Error al acceder al registro de flota", error });
    }
};

// 2. Crear una nueva aeronave
exports.createAircraft = async (req, res) => {
    try {
        const { matricula, sda } = req.body;
        let { unidad } = req.body;
        const userRole = req.user.role;
        const userElemento = req.user.elemento ? String(req.user.elemento).trim() : null;

        if (['s4', 'S4_UNIDAD'].includes(userRole)) {
            if (!userElemento) return res.status(403).json({ message: "Falta asignación de unidad en su perfil." });
            unidad = userElemento;
        } else if (userRole !== 'admin' && userRole !== 'boss') {
            return res.status(403).json({ message: "Acceso denegado: Su rol no posee permisos de alta de material." });
        }

        const finalUnidad = String(unidad || "").trim();
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
            creadoPor: `${req.user.userName || req.user.username} (${userRole})`,
            ultimaActualizacion: Date.now()
        });

        await newAircraft.save();
        res.status(201).json(newAircraft);
    } catch (error) {
        console.error('Error AE (createAircraft):', error);
        res.status(400).json({ 
            message: "Error al incorporar aeronave. Verifique si la matrícula ya existe.", 
            error: error.message 
        });
    }
};

// 3. Actualizar Estado, Horas y NOVEDADES (Corregido y Mejorado)
exports.updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, horasRemanentes, novedades, matricula, sda } = req.body;
        
        const aircraft = await Aircraft.findById(id);
        if (!aircraft) return res.status(404).json({ message: "Aeronave no localizada." });

        // SEGURIDAD: Solo ADMIN/BOSS o el S4 de la unidad dueña
        const esMandoSuperior = ['admin', 'boss'].includes(req.user.role);
        const userElemento = req.user.elemento ? String(req.user.elemento).trim() : null;
        
        if (!esMandoSuperior && userElemento !== String(aircraft.unidad).trim()) {
            return res.status(403).json({ 
                message: `Denegado: Su unidad (${userElemento}) no tiene autoridad sobre material de ${aircraft.unidad}.` 
            });
        }

        // Actualización de campos básicos
        if (estado) aircraft.estado = estado;
        if (horasRemanentes !== undefined) aircraft.horasRemanentes = Number(horasRemanentes);
        
        // Lógica de Novedades: Si viene 'novedades' en el body, actualizamos el registro.
        // Si el frontend manda string vacío, se limpia la novedad (importante para el botón de actualizar)
        if (novedades !== undefined) {
            aircraft.novedades = novedades; 
        }

        if (matricula) aircraft.matricula = matricula.toUpperCase().trim();
        if (sda) aircraft.sda = sda.toUpperCase().trim();
        
        aircraft.ultimaActualizacion = Date.now();
        aircraft.actualizadoPor = `${req.user.userName || req.user.username} (${req.user.role})`;

        await aircraft.save();
        res.json({ 
            success: true, 
            message: "Registro operativo actualizado correctamente", 
            aircraft 
        });

    } catch (error) {
        console.error('Error AE (updateAircraftStatus):', error);
        res.status(500).json({ success: false, message: "Error técnico en la actualización", error: error.message });
    }
};

// 4. Eliminar aeronave (Baja Definitiva)
exports.deleteAircraft = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Seguridad: Solo el Administrador puede dar de baja material del inventario central." });
        }

        const deleted = await Aircraft.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Aeronave no encontrada." });

        res.json({ message: "Aeronave dada de baja del registro central." });
    } catch (error) {
        console.error('Error AE (deleteAircraft):', error);
        res.status(500).json({ message: "Error al procesar la baja", error });
    }
};