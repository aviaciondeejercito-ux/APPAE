const InstruccionEscuela = require('../models/ECAE/InstruccionEscuela');
const EvaluacionPsicotecnica = require('../models/ECAE/EvaluacionPsicotecnica');
const CamadaEscuela = require('../models/ECAE/CamadaEscuela');
const PatronVuelo = require('../models/ECAE/PatronVuelo');
const Tripulante = require('../models/Tripulante');

// -----------------------------------------------------------------
// 1. REGISTRO Y EVALUACIÓN DE INSTRUCCIÓN
// -----------------------------------------------------------------
// Cargar una evaluación de instrucción (vuelo, académico, psicotécnico, físico)
exports.registrarInstruccion = async (req, res) => {
  try {
    const nuevaCarga = new InstruccionEscuela(req.body);
    await nuevaCarga.save();
    res.status(201).json({ success: true, data: nuevaCarga });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// -----------------------------------------------------------------
// 2. DASHBOARD Y FICHA DEL ALUMNO
// -----------------------------------------------------------------
// Obtener métricas para el Dashboard General de la EC AE
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

// Obtener la Ficha Individual Completa del Alumno
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

// -----------------------------------------------------------------
// 3. GESTIÓN DE CAMADA Y NÓMINA ACTIVA
// -----------------------------------------------------------------
// Guardar o actualizar la camada activa actual de la EC AE
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

// Obtener la camada activa actual con los datos completos de los alumnos
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

// -----------------------------------------------------------------
// 4. GESTOR DE PATRONES DE VUELO (DINÁMICO)
// -----------------------------------------------------------------
// Obtener todos los patrones de vuelo (opcional filtro por ?soloActivos=true)
exports.getPatronesVuelo = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const filtro = soloActivos === 'true' ? { activo: true } : {};
    const patrones = await PatronVuelo.find(filtro).sort({ codigo: 1 });
    res.json({ success: true, data: patrones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Crear un nuevo patrón de vuelo o actualizar uno existente
exports.guardarPatronVuelo = async (req, res) => {
  try {
    const { _id, codigo, nombre, descripcion, aeronaveTipo, estandares, activo } = req.body;

    // Detectar si el ID recibido proviene de los parámetros (req.params.id) o del body
    const idTarget = req.params.id || _id;

    let patron;
    // 🔒 Verificamos que sea un ID válido antes de intentar un update
    if (idTarget && idTarget !== 'null' && idTarget !== 'undefined') {
      patron = await PatronVuelo.findByIdAndUpdate(
        idTarget,
        { codigo, nombre, descripcion, aeronaveTipo, estandares, activo },
        { new: true, runValidators: true }
      );
    } else {
      // 🆕 Si es alta nueva, omitimos por completo la propiedad _id
      patron = new PatronVuelo({
        codigo,
        nombre,
        descripcion,
        aeronaveTipo,
        estandares,
        activo
      });
      await patron.save();
    }

    return res.status(200).json({ success: true, data: patron });
  } catch (error) {
    console.error("❌ Error en guardarPatronVuelo:", error);
    
    // Si el código del patrón ya existe (E11000 duplicate key error)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        error: `El código de patrón "${req.body.codigo}" ya existe en la base de datos.` 
      });
    }

    return res.status(400).json({ success: false, error: error.message });
  }
};