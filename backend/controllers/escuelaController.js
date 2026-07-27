const InstruccionEscuela = require('../models/ECAE/InstruccionEscuela');
const EvaluacionPsicotecnica = require('../models/ECAE/EvaluacionPsicotecnica');
const Tripulante = require('../models/Tripulante');
const CamadaEscuela = require('../models/ECAE/CamadaEscuela');

// 1. Cargar una evaluación de instrucción o académica
exports.registrarInstruccion = async (req, res) => {
  try {
    const nuevaCarga = new InstruccionEscuela(req.body);
    await nuevaCarga.save();
    res.status(201).json({ success: true, data: nuevaCarga });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 2. Obtener métricas para el Dashboard General de la EC AE
exports.getDashboardEscuela = async (req, res) => {
  try {
    const { promocion } = req.query;
    const matchQuery = promocion ? { promocion } : {};

    const stats = await InstruccionEscuela.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalHoras: { $sum: '$data.horasVuelo' },
          promedioAcademico: { $avg: '$data.nota' }
        }
      }
    ]);

    const psicotecnicoStats = await EvaluacionPsicotecnica.aggregate([
      {
        $group: {
          _id: '$aptitud',
          cantidad: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      statsGeneral: stats[0] || { totalHoras: 0, promedioAcademico: 0 },
      psicotecnicoResumen: psicotecnicoStats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Obtener la Ficha Individual Completa del Alumno
exports.getFichaAlumno = async (req, res) => {
  try {
    const { idAlumno } = req.params;

    const alumnoBase = await Tripulante.findById(idAlumno).select('nombre apellido grado unidad elemento dni');

    if (!alumnoBase) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
    }

    const evaluaciones = await InstruccionEscuela.find({ alumnoId: idAlumno }).sort({ fechaRegistro: -1 });
    const psicotecnico = await EvaluacionPsicotecnica.findOne({ alumno: idAlumno }).sort({ fecha: -1 });

    res.json({
      success: true,
      alumno: alumnoBase,
      evaluaciones,
      psicotecnico
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Guardar o actualizar la camada activa actual de la EC AE
exports.guardarCamada = async (req, res) => {
  try {
    const { curso, alumnos } = req.body;

    // Desactivar camadas previas para asegurar que solo haya una activa
    await CamadaEscuela.updateMany({}, { activa: false });

    const nuevaCamada = new CamadaEscuela({
      curso,
      alumnos,
      activa: true
    });

    await nuevaCamada.save();
    res.status(201).json({ success: true, data: nuevaCamada });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 5. Obtener la camada activa actual con los datos completos de los alumnos
exports.getCamadaActiva = async (req, res) => {
  try {
    const camadaActiva = await CamadaEscuela.findOne({ activa: true })
      .populate('alumnos', 'nombre apellido grado unidad elemento dni funcion especialidad');

    if (!camadaActiva) {
      return res.status(200).json({ success: true, data: { curso: '', alumnos: [] } });
    }

    res.json({ success: true, data: camadaActiva });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};