const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo');
const ExigenciaPlan = require('../models/ExigenciaPlan');

// Función para obtener la planificación
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio } = req.query;
        const currentAnio = Number(anio) || 2026;

        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryOficiales = { grado: { $in: gradosOficiales }, activo: { $ne: false } };

        if (unidad && unidad !== 'all') {
            const uLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [{ unidad: uLimpia }, { elemento: uLimpia }];
        }

        const [oficiales, vuelosAnio] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            Vuelo.find({
                fecha: {
                    $gte: new Date(`${currentAnio}-01-01`),
                    $lte: new Date(`${currentAnio}-12-31`)
                }
            }).lean()
        ]);

        const respuesta = oficiales.map(piloto => {
            const horasTrimestrales = [0, 0, 0, 0];
            vuelosAnio.forEach(v => {
                const esParte = [v.piloto, v.copiloto, v.instructor, v.mecanico]
                    .some(id => id?.toString() === piloto._id.toString());

                if (esParte) {
                    const mes = new Date(v.fecha).getMonth();
                    const trimestre = Math.floor(mes / 3);
                    horasTrimestrales[trimestre] += (Number(v.horasVoladas) || 0);
                }
            });

            return {
                _id: piloto._id,
                grado: piloto.grado,
                apellido: piloto.apellido,
                nombre: piloto.nombre,
                unidad: piloto.elemento || piloto.unidad,
                habilitaciones: piloto.habilitaciones || [],
                horasReales: horasTrimestrales
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener pilotos", error: error.message });
    }
};

// ESTA ES LA FUNCIÓN QUE FALTABA O ESTABA MAL ESCRITA (Línea 10 del router)
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;
        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { piloto: pilotoId, año, trimestres, unidad: unidad?.toUpperCase().trim() },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al guardar plan" });
    }
};