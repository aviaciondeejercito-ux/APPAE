const ProgramaMantenimiento = require('../models/ProgramaMantenimiento');

// Guardar o Actualizar el programa de una aeronave
exports.guardarPrograma = async (req, res) => {
    const { aeronaveId, tgPlaneadorActual, tgMotorActual, programaPlaneador, programaMotor, actualizadoPor } = req.body;

    if (!aeronaveId) {
        return res.status(400).json({ mensaje: "Falta el ID de la aeronave." });
    }

    try {
        // Determinamos el operador responsable a partir del token o payload alternativo
        const operadorResponsable = req.user ? req.user.username : (actualizadoPor || "Operador Desconocido");

        const programaActualizado = await ProgramaMantenimiento.findOneAndUpdate(
            { aeronaveId }, 
            {
                $set: {
                    tgPlaneadorActual,
                    tgMotorActual,
                    programaPlaneador,
                    programaMotor,
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
        console.error("Error al guardar el programa:", error);
        res.status(500).json({ mensaje: "Error al procesar el programa de mantenimiento." });
    }
};

// Obtener el programa de una aeronave específica
exports.obtenerProgramaPorAeronave = async (req, res) => {
    const { aeronaveId } = req.params;

    try {
        const programa = await ProgramaMantenimiento.findOne({ aeronaveId });
        
        if (!programa) {
            return res.status(200).json({ 
                status: "success",
                mensaje: "Sin programa previo. Listo para asignación.",
                data: { 
                    tgPlaneadorActual: null, 
                    tgMotorActual: null, 
                    programaPlaneador: [], 
                    programaMotor: [] 
                } 
            });
        }

        res.status(200).json({ status: "success", data: programa });
    } catch (error) {
        console.error("Error al obtener el programa:", error);
        res.status(500).json({ mensaje: "Error al recuperar registros." });
    }
};