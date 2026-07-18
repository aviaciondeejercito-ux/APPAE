const ProgramaMantenimiento = require('../models/ProgramaMantenimiento'); //[cite: 6]

// Guardar o Actualizar el programa de una aeronave
exports.guardarPrograma = async (req, res) => { //[cite: 6]
    const { aeronaveId, tgPlaneadorActual, tgMotorActual, programaPlaneador, programaMotor } = req.body; //[cite: 6]

    if (!aeronaveId) { //[cite: 6]
        return res.status(400).json({ mensaje: "Falta el ID de la aeronave." }); //[cite: 6]
    }

    try {
        // 'upsert: true' asegura consistencia atómica (Creación o Actualización)[cite: 6]
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
            { new: true, upsert: true, runValidators: true } //[cite: 6]
        );

        res.status(200).json({
            status: "success",
            mensaje: "Programa de mantenimiento sincronizado correctamente.",
            data: programaActualizado
        }); //[cite: 6]

    } catch (error) {
        console.error("Error al guardar el programa:", error); //[cite: 6]
        res.status(500).json({ mensaje: "Error al procesar el programa de mantenimiento." }); //[cite: 6]
    }
};

// Obtener el programa de una aeronave específica
exports.obtenerProgramaPorAeronave = async (req, res) => { //[cite: 6]
    const { aeronaveId } = req.params; //[cite: 6]

    try {
        const programa = await ProgramaMantenimiento.findOne({ aeronaveId }); //[cite: 6]
        
        if (!programa) {
            // Enviamos null en los totales para que el Front conserve el valor original del Aircraft
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

        res.status(200).json({ status: "success", data: programa }); //[cite: 6]
    } catch (error) {
        console.error("Error al obtener el programa:", error); //[cite: 6]
        res.status(500).json({ mensaje: "Error al recuperar registros." }); //[cite: 6]
    }
};