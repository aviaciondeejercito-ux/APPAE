const mongoose = require('mongoose');
const ProgramaMantenimiento = require('../models/ProgramaMantenimiento'); //[cite: 10]

// Guardar o Actualizar el programa de una aeronave
exports.guardarPrograma = async (req, res) => { //[cite: 10]
    const { aeronaveId, tgPlaneadorActual, tgMotorActual, programaPlaneador, programaMotor, actualizadoPor } = req.body; //[cite: 10]

    if (!aeronaveId) { //[cite: 10]
        return res.status(400).json({ mensaje: "Falta el ID de la aeronave." }); //[cite: 10]
    }

    try {
        // 🛡️ SANITIZACIÓN DEL ID: Extrae el string si viene envuelto en un objeto { $oid: "..." }
        const cleanAeronaveId = typeof aeronaveId === 'object' && aeronaveId.$oid ? aeronaveId.$oid : aeronaveId;

        // Validación de tipo ObjectId de MongoDB para evitar excepciones de casteo de Mongoose
        if (!mongoose.Types.ObjectId.isValid(cleanAeronaveId)) {
            return res.status(400).json({ 
                status: "error", 
                mensaje: "El ID de la aeronave no posee un formato válido de MongoDB." 
            });
        }

        // 🧼 LIMPIEZA DE ARREGLOS: Remueve el ID numérico temporal del Frontend
        // Esto previene que falle la validación estricta de Mongoose (Causa del Error 500)
        const sanitizarRenglones = (lista) => {
            if (!Array.isArray(lista)) return [];
            return lista.map(renglon => {
                const nuevoRenglon = { ...renglon };
                if (nuevoRenglon.id && typeof nuevoRenglon.id === 'number') {
                    delete nuevoRenglon.id; 
                }
                return nuevoRenglon;
            });
        };

        const planeadorSanitizado = sanitizarRenglones(programaPlaneador);
        const motorSanitizado = sanitizarRenglones(programaMotor);

        // Determinamos el operador responsable a partir del token o payload alternativo[cite: 10]
        const operadorResponsable = req.user ? req.user.username : (actualizadoPor || "Operador Desconocido"); //[cite: 10]

        // 🔄 UPSERT: Busca por aeronaveId. Si no existe, crea el documento entero.
        const programaActualizado = await ProgramaMantenimiento.findOneAndUpdate(
            { aeronaveId: cleanAeronaveId }, // Usa el ID limpio sanitizado
            {
                $set: {
                    aeronaveId: cleanAeronaveId,
                    tgPlaneadorActual,
                    tgMotorActual,
                    programaPlaneador: planeadorSanitizado,
                    programaMotor: motorSanitizado,
                    actualizadoPor: operadorResponsable
                }
            },
            { new: true, upsert: true, runValidators: true } //[cite: 10]
        );

        res.status(200).json({ //[cite: 10]
            status: "success", //[cite: 10]
            mensaje: "Programa de mantenimiento sincronizado correctamente.", //[cite: 10]
            data: programaActualizado //[cite: 10]
        }); //[cite: 10]

    } catch (error) { //[cite: 10]
        console.error("❌ Error crítico al guardar el programa:", error); //[cite: 10]
        res.status(500).json({ 
            mensaje: "Error interno al procesar el programa de mantenimiento.",
            error: error.message 
        });
    }
}; //[cite: 10]

// Obtener el programa de una aeronave específica
exports.obtenerProgramaPorAeronave = async (req, res) => { //[cite: 10]
    const { aeronaveId } = req.params; //[cite: 10]

    try {
        // Sanitización del parámetro por si viaja estructurado
        const cleanAeronaveId = typeof aeronaveId === 'object' && aeronaveId.$oid ? aeronaveId.$oid : aeronaveId;

        if (!mongoose.Types.ObjectId.isValid(cleanAeronaveId)) {
            return res.status(400).json({ 
                status: "error", 
                mensaje: "El ID provisto en los parámetros no es válido." 
            });
        }

        const programa = await ProgramaMantenimiento.findOne({ aeronaveId: cleanAeronaveId }); //[cite: 10]
        
        if (!programa) { //[cite: 10]
            return res.status(200).json({ //[cite: 10]
                status: "success", //[cite: 10]
                mensaje: "Sin programa previo. Listo para asignación.", //[cite: 10]
                data: { //[cite: 10]
                    tgPlaneadorActual: null, //[cite: 10]
                    tgMotorActual: null, //[cite: 10]
                    programaPlaneador: [], //[cite: 10]
                    programaMotor: [] //[cite: 10]
                } //[cite: 10]
            }); //[cite: 10]
        } //[cite: 10]

        res.status(200).json({ status: "success", data: programa }); //[cite: 10]
    } catch (error) { //[cite: 10]
        console.error("❌ Error al obtener el programa:", error); //[cite: 10]
        res.status(500).json({ mensaje: "Error al recuperar registros." }); //[cite: 10]
    } //[cite: 10]
}; //[cite: 10]