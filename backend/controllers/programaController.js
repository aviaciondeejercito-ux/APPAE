const mongoose = require('mongoose');
const ProgramaMantenimiento = require('../models/ProgramaMantenimiento');

// Guardar o Actualizar el programa de una aeronave
exports.guardarPrograma = async (req, res) => {
    const { aeronaveId, tgPlaneadorActual, tgMotorActual, programaPlaneador, programaMotor, actualizadoPor } = req.body;

    if (!aeronaveId) {
        return res.status(400).json({ mensaje: "Falta el ID de la aeronave." });
    }

    try {
        // Extrae el string si viene envuelto en un objeto { $oid: "..." }
        const cleanAeronaveId = typeof aeronaveId === 'object' && aeronaveId.$oid ? aeronaveId.$oid : aeronaveId;

        // Validación de tipo ObjectId de MongoDB
        if (!mongoose.Types.ObjectId.isValid(cleanAeronaveId)) {
            return res.status(400).json({ 
                status: "error", 
                mensaje: "El ID de la aeronave no posee un formato válido de MongoDB." 
            });
        }

        // Remueve el ID temporal local del Frontend antes de enviar a Mongoose
        const sanitizarRenglones = (lista) => {
            if (!Array.isArray(lista)) return [];
            return lista.map(renglon => {
                const nuevoRenglon = { ...renglon };
                if (nuevoRenglon.id) {
                    delete nuevoRenglon.id; 
                }
                return nuevoRenglon;
            });
        };

        const planeadorSanitizado = sanitizarRenglones(programaPlaneador);
        const motorSanitizado = sanitizarRenglones(programaMotor);

        const operadorResponsable = req.user ? req.user.username : (actualizadoPor || "Operador Desconocido");

        // Busca por aeronaveId. Si no existe, crea el documento entero (Upsert).
        const programaActualizado = await ProgramaMantenimiento.findOneAndUpdate(
            { aeronaveId: cleanAeronaveId },
            {
                $set: {
                    aeronaveId: cleanAeronaveId,
                    tgPlaneadorActual: tgPlaneadorActual || "0,0",
                    tgMotorActual: tgMotorActual || "0,0",
                    programaPlaneador: planeadorSanitizado,
                    programaMotor: motorSanitizado,
                    actualizadoPor: operadorResponsable
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            status: "success",
            mensaje: "Programa de mantenimiento sincronizado correctamente.",
            data: programaActualizado
        });

    } catch (error) {
        console.error("❌ Error crítico al guardar el programa:", error);
        res.status(500).json({ 
            mensaje: "Error interno al procesar el programa de mantenimiento.",
            error: error.message 
        });
    }
};

// Obtener el programa de una aeronave específica
exports.obtenerProgramaPorAeronave = async (req, res) => {
    const { aeronaveId } = req.params;

    try {
        const cleanAeronaveId = typeof aeronaveId === 'object' && aeronaveId.$oid ? aeronaveId.$oid : aeronaveId;

        if (!mongoose.Types.ObjectId.isValid(cleanAeronaveId)) {
            return res.status(400).json({ 
                status: "error", 
                mensaje: "El ID provisto en los parámetros no es válido." 
            });
        }

        const programa = await ProgramaMantenimiento.findOne({ aeronaveId: cleanAeronaveId });
        
        if (!programa) {
            return res.status(200).json({ 
                status: "success",
                mensaje: "Sin programa previo. Listo para asignación.",
                data: { 
                    tgPlaneadorActual: "0,0", 
                    tgMotorActual: "0,0", 
                    programaPlaneador: [], 
                    programaMotor: [] 
                } 
            });
        }

        res.status(200).json({ status: "success", data: programa });
    } catch (error) {
        console.error("❌ Error al obtener el programa:", error);
        res.status(500).json({ mensaje: "Error al recuperar registros." });
    }
};