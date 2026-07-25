const InstruccionEscuela = require('../models/InstruccionEscuela');
const EvaluacionPsicotecnica = require('../models/EvaluacionPsicotecnica');
const Tripulante = require('../models/Tripulante');

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

    // Métricas generales acumuladas
    const stats = await InstruccionEscuela.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalHoras: { $sum: '$horasInstruccion' },
          promedioAcademico: { $avg: '$notaAcademica' }
        }
      }
    ]);

    // Resumen de aptitudes psicotécnicas
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

    // Obtener datos base del Tripulante (sin tocar su esquema)
    const alumnoBase = await Tripulante.findById(idAlumno).select('nombre apellido grado unidad elemento');

    if (!alumnoBase) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
    }

    // Historial de instrucción y notas
    const evaluaciones = await InstruccionEscuela.find({ alumno: idAlumno }).populate('instructor', 'grado apellido');

    // Último examen psicotécnico registrado
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