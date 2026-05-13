const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo');

exports.getTotalesVueloTrimestral = async (req, res) => {
    try {
        const { unidad } = req.query;
        const anioActual = 2026;

        // 1. Filtro estricto de Oficiales Pilotos
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryPilotos = { 
            grado: { $in: gradosHabilitados }, 
            activo: { $ne: false } 
        };

        // Filtro por unidad (Sincro Joker)
        if (unidad && unidad !== 'all') {
            const uLimpia = unidad.trim().toUpperCase();
            queryPilotos.$or = [{ unidad: uLimpia }, { elemento: uLimpia }];
        }

        // 2. Buscamos pilotos y todos los vuelos del año en paralelo
        const [pilotos, vuelos] = await Promise.all([
            Tripulante.find(queryPilotos).sort({ grado: 1, apellido: 1 }).lean(),
            Vuelo.find({
                fecha: {
                    $gte: new Date(`${anioActual}-01-01`),
                    $lte: new Date(`${anioActual}-12-31T23:59:59Z`)
                }
            }).lean()
        ]);

        // 3. Cruzar datos: Sumar horas reales por trimestre
        const respuesta = pilotos.map(p => {
            const horasTrimestrales = [0, 0, 0, 0]; // T1, T2, T3, T4

            vuelos.forEach(v => {
                // Verificamos si el oficial participó en el vuelo
                const participo = [v.piloto, v.copiloto, v.instructor]
                    .some(id => id?.toString() === p._id.toString());

                if (participo) {
                    const mes = new Date(v.fecha).getMonth(); // 0-11
                    const trimestre = Math.floor(mes / 3); // 0-3
                    horasTrimestrales[trimestre] += (Number(v.horasVoladas) || 0);
                }
            });

            return {
                _id: p._id,
                grado: p.grado,
                apellido: p.apellido,
                nombre: p.nombre,
                unidad: p.elemento || p.unidad,
                habilitaciones: p.habilitaciones || [],
                horasTrimestres: horasTrimestrales
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al procesar totales", error: error.message });
    }
};