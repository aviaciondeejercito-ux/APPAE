const F13 = require('../models/F13'); 
const Aeronave = require('../models/Aircraft');

/**
 * 1. Obtener todos los registros de F-13 (con Populate adaptado)
 */
const getF13s = async (req, res) => {
    try {
        const registros = await F13.find()
            .populate('aeronave', 'matricula modelo sda tgPlaneadorActual motorTsn')
            .populate('creadoPor', 'nombre apellido rango'); 

        return res.status(200).json(registros);
    } catch (error) {
        console.error('❌ Error al obtener el historial de F-13:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al recuperar el historial de F-13.'
        });
    }
};

/**
 * 2. Obtener aeronaves disponibles (En servicio) para el desplegable
 */
const getAeronavesDisponibles = async (req, res) => {
    try {
        // Adaptado al campo de tu modelo 'estadoOperativo' (ej: "E/S")
        const aeronaves = await Aeronave.find({ 
            estadoOperativo: 'E/S' 
        }).select('matricula modelo sda tgPlaneadorActual motorTsn'); 

        return res.status(200).json({
            ok: true,
            aeronaves
        });
    } catch (error) {
        console.error('❌ Error al obtener aeronaves:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al recuperar las aeronaves desde la base de datos.'
        });
    }
};

/**
 * 3. Crear y guardar un nuevo formulario F-13 (Suma automática al F-16)
 */
const crearF13 = async (req, res) => {
    try {
        const { aeronave, horasDelDia } = req.body;

        // 1. Validamos que la aeronave exista
        const aeronaveExiste = await Aeronave.findById(aeronave);
        if (!aeronaveExiste) {
            return res.status(404).json({
                ok: false,
                msg: 'La aeronave seleccionada no existe en el sistema.'
            });
        }

        // 2. Extraemos de forma segura el ID del usuario autenticado
        const creadorId = req.usuarioId || (req.user && req.user._id);
        if (!creadorId) {
            return res.status(401).json({
                ok: false,
                msg: 'No se pudo identificar al usuario que realiza la operación. Verifique su autenticación.'
            });
        }

        // 3. Forzamos que horasDelDia sea un número puro antes de impactar la BD
        const hsAIncrementar = Number(horasDelDia);
        if (isNaN(hsAIncrementar) || hsAIncrementar <= 0) {
            return res.status(400).json({
                ok: false,
                msg: 'Las horas del día deben ser un número mayor a 0.'
            });
        }

        // 4. Creamos el registro F-13
        const nuevoF13 = new F13({
            ...req.body,
            horasDelDia: hsAIncrementar,
            creadoPor: creadorId 
        });

        const f13Guardado = await nuevoF13.save();

        // ⚡ 5. Sincronización Atómica de Horas en la Aeronave (Afecta directamente al F-16)
        try {
            await Aeronave.findByIdAndUpdate(aeronave, {
                $inc: { 
                    tgPlaneadorActual: hsAIncrementar, // Suma al total general de planeador
                    motorTsn: hsAIncrementar           // Suma al tiempo total en servicio del motor
                } 
            });
            console.log(`✅ Horas del F-13 sumadas con éxito a los totales de la aeronave ${aeronave}.`);
        } catch (updateError) {
            console.error('⚠️ Advertencia: No se pudieron incrementar las horas en la colección de aeronaves:', updateError.message);
        }

        return res.status(201).json({
            ok: true,
            msg: 'Formulario F-13 registrado exitosamente y horas impactadas en los totales generales.',
            f13: f13Guardado
        });

    } catch (error) {
        console.error('❌ Error al crear F-13:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al procesar el formulario F-13.',
            error: error.message
        });
    }
};

/**
 * 4. Eliminar un registro de F-13 (con rollback exacto de horas)
 */
const eliminarF13 = async (req, res) => {
    try {
        const { id } = req.params;

        const f13AEliminar = await F13.findById(id);
        if (!f13AEliminar) {
            return res.status(404).json({
                ok: false,
                msg: 'El registro de F-13 que intenta eliminar no existe.'
            });
        }

        const idAeronave = f13AEliminar.aeronave;
        const horasARestar = Number(f13AEliminar.horasDelDia) || 0;

        // Borramos el documento físico
        await F13.findByIdAndDelete(id);

        // ⚡ Sincronización Atómica de Resta (Rollback)
        if (horasARestar > 0) {
            try {
                await Aeronave.findByIdAndUpdate(idAeronave, {
                    $inc: { 
                        tgPlaneadorActual: -horasARestar, // Resta del planeador
                        motorTsn: -horasARestar           // Resta del motor
                    } 
                });
                console.log(`✅ Horas de la aeronave reajustadas tras eliminación (-${horasARestar} hs).`);
            } catch (updateError) {
                console.error('⚠️ Advertencia: No se pudo realizar el rollback de horas de la aeronave:', updateError.message);
            }
        }

        return res.status(200).json({
            ok: true,
            msg: 'Formulario F-13 eliminado con éxito y horas descontadas de los totales generales.'
        });

    } catch (error) {
        console.error('❌ Error al eliminar F-13:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al intentar eliminar el F-13.'
        });
    }
};

module.exports = {
    getF13s,
    getAeronavesDisponibles,
    crearF13,
    eliminarF13
};