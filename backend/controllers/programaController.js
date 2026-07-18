const ProgramaMantenimiento = require('../models/ProgramaMantenimiento');

// Guardar o Actualizar el programa de una aeronave
exports.guardarPrograma = async (req, res) => {
    const { aeronaveId, tgPlaneadorActual, tgMotorActual, programaPlaneador, programaMotor } = req.body;

    if (!aeronaveId) {
        return res.status(400).json({ mensaje: "Falta el ID de la aeronave." });
    }

    try {
        // 'upsert: true' hace que si no existe el registro para esa aeronave, lo cree. Si existe, lo actualiza.
        const programaActualizado = await ProgramaMantenimiento.findOneAndUpdate(
            { aeronaveId }, 
            {
                $set: {
                    tgPlaneadorActual,
                    tgMotorActual,
                    programaPlaneador,
                    programaMotor
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

// Obtener el programa de una aeronave específica (para cuando la seleccionás en el Front)
exports.obtenerProgramaPorAeronave = async (req, res) => {
    const { aeronaveId } = req.params;

    try {
        const programa = await ProgramaMantenimiento.findOne({ aeronaveId });
        
        if (!programa) {
            // Si no tiene programa, respondemos con éxito pero arrays vacíos para que el front deje escribir
            return res.status(200).json({ 
                mensaje: "Sin programa previo. Listo para asignación.",
                data: { tgPlaneadorActual: "0,0", tgMotorActual: "0,0", programaPlaneador: [], programaMotor: [] } 
            });
        }

        res.status(200).json({ status: "success", data: programa });
    } catch (error) {
        console.error("Error al obtener el programa:", error);
        res.status(500).json({ mensaje: "Error al recuperar registros." });
    }
};