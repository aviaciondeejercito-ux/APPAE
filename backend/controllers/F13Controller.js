const F13 = require('../models/F13'); // ◀️ Cambiado a "F13" sin guion medio
const Aeronave = require('../models/Aircraft');

/**
 * 1. Obtener todos los registros de F-13 (con Populate para auditoría y visualización)
 */
const getF13s = async (req, res) => {
    try {
        // Traemos los registros populando las referencias para mostrarlas en la tabla del frontend
        const registros = await F13.find()
            .populate('aeronave', 'matricula modelo sda')
            .populate('comandante', 'apellido grado')
            .populate('mecanico', 'apellido grado')
            .populate('creadoPor', 'nombre apellido rango'); // 🌟 Trae los datos de quién cargó el registro

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
        // Buscamos aeronaves que pertenezcan a la unidad y estén en servicio (operativas)
        // Ajustá los campos "estado" o "enServicio" según cómo los tengas en tu modelo de Aeronave
        const aeronaves = await Aeronave.find({ 
            estado: 'En Servicio' // o { enServicio: true }
        }).select('matricula modelo sda'); // Traemos solo lo necesario para el select

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
 * 3. Crear y guardar un nuevo formulario F-13 (Asociando el usuario que carga)
 */
const crearF13 = async (req, res) => {
    try {
        const { aeronave, horasDelDia, horasALaFecha } = req.body;

        // Validamos que la aeronave exista antes de continuar
        const aeronaveExiste = await Aeronave.findById(aeronave);
        if (!aeronaveExiste) {
            return res.status(404).json({
                ok: false,
                msg: 'La aeronave seleccionada no existe en el sistema.'
            });
        }

        // Validamos que el middleware haya inyectado el ID del usuario autenticado
        if (!req.usuarioId) {
            return res.status(401).json({
                ok: false,
                msg: 'No se pudo identificar al usuario que realiza la operación. Verifique la autenticación.'
            });
        }

        // Creamos el registro de F-13 inyectando "creadoPor" de forma segura desde la sesión/token
        const nuevoF13 = new F13({
            ...req.body,
            creadoPor: req.usuarioId // 🌟 Auditoría forzada desde el backend
        });

        const f13Guardado = await nuevoF13.save();

        // ⚡ Sincronización: Actualizamos las horas totales de la aeronave en su propia colección
        // Sumamos las horas voladas en el día a su contador histórico acumulado
        const totalHorasActualizadas = Number((horasALaFecha + horasDelDia).toFixed(2));
        
        await Aeronave.findByIdAndUpdate(aeronave, {
            $set: { horasTotales: totalHorasActualizadas } // Ajustá el nombre de la propiedad en tu modelo Aeronave
        });

        return res.status(201).json({
            ok: true,
            msg: 'Formulario F-13 registrado exitosamente y horas de la aeronave actualizadas.',
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

        // Buscamos el F-13 antes de borrarlo para saber cuántas horas restarle a la aeronave
        const f13AEliminar = await F13.findById(id);
        if (!f13AEliminar) {
            return res.status(404).json({
                ok: false,
                msg: 'El registro de F-13 que intenta eliminar no existe.'
            });
        }

        const idAeronave = f13AEliminar.aeronave;
        const horasARestar = f13AEliminar.horasDelDia;

        // Borramos el documento de F-13
        await F13.findByIdAndDelete(id);

        // ⚡ Rollback: Restamos las horas del día de este vuelo eliminado del historial de la aeronave
        await Aeronave.findByIdAndUpdate(idAeronave, {
            $inc: { horasTotales: -horasARestar } // $inc con valor negativo resta automáticamente en MongoDB
        });

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