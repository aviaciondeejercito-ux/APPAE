const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); // Necesitamos los vuelos para el cálculo real

/**
 * Obtiene la planificación completa cruzando Tripulantes, Planes y Horas Reales de Vuelo.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role, rol } = req.query;
        const currentAnio = Number(anio) || new Date().getFullYear();
        const roleBase = String(role || rol || '').toUpperCase().replace(/[\s_-]/g, '');

        // 1. Filtro de Personal (Soporte para Galmarini TP y todos los cuadros)
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST', 'SP', 'SA', 'SI', 'SAY', 'Sarg', 'Cabo'];
        let queryOficiales = { grado: { $in: gradosHabilitados }, activo: { $ne: false } };

        const esMandoSuperior = ['ADMIN', 'DIRECTOR', 'BOSS', 'OTO'].includes(roleBase);
        if (!esMandoSuperior && unidad) {
            const unidadLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [{ unidad: unidadLimpia }, { elemento: unidadLimpia }];
        }

        // 2. Búsqueda Triple en paralelo
        const [oficiales, planes, todosVuelosAnio] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            ExigenciaPlan.find({ año: currentAnio }).lean(),
            // Traemos los vuelos del año para calcular el cumplimiento real
            Vuelo.find({
                fecha: {
                    $gte: new Date(`${currentAnio}-01-01`),
                    $lte: new Date(`${currentAnio}-12-31`)
                }
            }).lean()
        ]);

        // 3. Procesamiento y Cruce de Datos
        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto?.toString() === oficial._id.toString());
            
            // Calculamos horas reales voladas este año para este tripulante
            // Buscamos si figura como instructor, piloto, copiloto o mecanico (basado en tus fotos)
            const horasReales = todosVuelosAnio.reduce((acc, v) => {
                const esParteDeTripulacion = 
                    v.instructor?.toString() === oficial._id.toString() ||
                    v.piloto?.toString() === oficial._id.toString() ||
                    v.copiloto?.toString() === oficial._id.toString() ||
                    v.mecanico?.toString() === oficial._id.toString();
                
                return esParteDeTripulacion ? acc + (Number(v.horasVoladas) || 0) : acc;
            }, 0);

            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.elemento || oficial.unidad,
                habilitaciones: oficial.habilitaciones || [],
                horasAnualesReales: horasReales, // Dato clave para el comando
                plan: planExistente || {
                    año: currentAnio,
                    unidad: oficial.elemento || oficial.unidad,
                    trimestres: [
                        { numero: 1, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 2, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 3, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 4, rol: '', tipo: '', causaNoCumplimiento: '' }
                    ]
                }
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        console.error("❌ ERROR EBM_CONTROLLER_FULL:", error.message);
        res.status(500).json({ success: false, mensaje: "Error en procesamiento de datos tácticos" });
    }
};

/**
 * Guarda el plan con validación de integridad.
 */
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        if (!pilotoId || !año || !trimestres) {
            return res.status(400).json({ mensaje: "Faltan datos obligatorios para el registro" });
        }

        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { 
                piloto: pilotoId, 
                año: Number(año), 
                trimestres, 
                unidad: unidad?.toUpperCase().trim(),
                ultimaActualizacion: Date.now()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al registrar planificación" });
    }
};