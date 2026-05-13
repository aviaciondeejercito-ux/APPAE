const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo');

exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio } = req.query;
        const currentAnio = Number(anio) || 2026;

        // 1. Filtro de Oficiales (CR hasta ST como pediste)
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryOficiales = { 
            grado: { $in: gradosOficiales }, 
            activo: { $ne: false } 
        };

        // Filtro de Unidad (Sincro Joker: unidad o elemento)
        if (unidad && unidad !== 'all') {
            const uLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [{ unidad: uLimpia }, { elemento: uLimpia }];
        }

        // 2. Buscamos pilotos y vuelos del año en paralelo
        const [oficiales, vuelosAnio] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            Vuelo.find({
                fecha: {
                    $gte: new Date(`${currentAnio}-01-01`),
                    $lte: new Date(`${currentAnio}-12-31`)
                }
            }).lean()
        ]);

        // 3. Procesamos las horas por trimestre para cada piloto
        const respuesta = oficiales.map(piloto => {
            const horasTrimestrales = [0, 0, 0, 0]; // Horas para T1, T2, T3, T4

            vuelosAnio.forEach(v => {
                // Verificamos si el piloto participó en el vuelo (Piloto, Copiloto, Instructor o Mecánico)
                const esParte = [v.piloto, v.copiloto, v.instructor, v.mecanico]
                    .some(id => id?.toString() === piloto._id.toString());

                if (esParte) {
                    const mes = new Date(v.fecha).getMonth(); // 0-11
                    const trimestre = Math.floor(mes / 3); // 0-3
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
                horasReales: horasTrimestrales // Array con las sumas [T1, T2, T3, T4]
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        console.error("❌ ERROR EBM_BASICO:", error.message);
        res.status(500).json({ mensaje: "Error al obtener pilotos" });
    }
};