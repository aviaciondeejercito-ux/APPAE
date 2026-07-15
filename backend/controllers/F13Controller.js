const F13 = require('../models/F13'); 
const Aeronave = require('../models/Aircraft');

/**
 * 1. Obtener todos los registros de F-13 (con Populate adaptado)
 */
const getF13s = async (req, res) => {
    try {
        // Solo populamos 'aeronave' y 'creadoPor' que sí son ObjectIds reales en la base de datos
        const registros = await F13.find()
            .populate('aeronave', 'matricula modelo sda')
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
        // Buscamos aeronaves operativas en la base de datos
        const aeronaves = await Aeronave.find({ 
            estado: 'En Servicio' 
        }).select('matricula modelo sda'); 

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
 * 3. Crear y guardar un nuevo formulario F-13
 */
const crearF13 = async (req, res) => {
    try {
        const { aeronave, horasDelDia, horasALaFecha } = req.body;

        // Validamos que la aeronave exista
        const aeronaveExiste = await Aeronave.findById(aeronave);
        if (!aeronaveExiste) {
            return res.status(404).json({
                ok: false,
                msg: 'La aeronave seleccionada no existe en el sistema.'
            });
        }

        // Extraemos de forma segura el ID del usuario autenticado (soporta req.usuarioId y req.user._id)
        const creadorId = req.usuarioId || (req.user && req.user._id);

        if (!creadorId) {
            return res.status(401).json({
                ok: false,
                msg: 'No se pudo identificar al usuario que realiza la operación. Verifique su autenticación.'
            });
        }

        // Creamos el registro F-13 asociando el ID del creador
        const nuevoF13 = new F13({
            ...req.body,
            creadoPor: creadorId 
        });

        const f13Guardado = await nuevoF13.save();

        // ⚡ Sincronización de horas de la aeronave (aislada para evitar rebotes del formulario)
        try {
            const totalHorasActualizadas = Number((horasALaFecha + horasDelDia).toFixed(2));
            
            await Aeronave.findByIdAndUpdate(aeronave, {
                $set: { horasTotales: totalHorasActualizadas } 
            });
            console.log(`✅ Horas de la aeronave ${aeronave} actualizadas con éxito.`);
        } catch (updateError) {
            console.error('⚠️ Advertencia: No se pudieron sincronizar las horas en la colección de aeronaves:', updateError.message);
        }

        return res.status(201).json({
            ok: true,
            msg: 'Formulario F-13 registrado exitosamente.',
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
 * 4. Eliminar un registro de F-13 (con rollback de horas de la aeronave)
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
        const horasARestar = f13AEliminar.horasDelDia;

        // Borramos el documento físico
        await F13.findByIdAndDelete(id);

        // ⚡ Rollback de horas (con salvaguarda por si falla)
        try {
            await Aeronave.findByIdAndUpdate(idAeronave, {
                $inc: { horasTotales: -horasARestar } 
            });
            console.log(`✅ Horas de la aeronave reajustadas tras eliminación (-${horasARestar} hs).`);
        } catch (updateError) {
            console.error('⚠️ Advertencia: No se pudo realizar el rollback de horas de la aeronave:', updateError.message);
        }

        return res.status(200).json({
            ok: true,
            msg: 'Formulario F-13 eliminado con éxito y horas de la aeronave reajustadas.'
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