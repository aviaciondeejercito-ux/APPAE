const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan');

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS
 * Cruza horas reales, exigencias planificadas y configuraciones.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        const AÑO_ACTUAL = 2026;
        
        if (!unidadUser) {
            return res.status(400).json({ success: false, mensaje: "Unidad operativa no identificada." });
        }
        
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryPilotos = { grado: { $in: gradosHabilitados }, activo: true };
        
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV'].includes(unidadUser.trim().toUpperCase());
        if (!esMandoEstrategico) {
            queryPilotos.$or = [{ unidad: unidadUser }, { elemento: unidadUser }];
        }

        const pilotos = await Tripulante.find(queryPilotos).lean();
        if (!pilotos.length) return res.status(200).json([]);

        const listaIdsPilotos = pilotos.map(p => p._id);

        const [planesCargados, vuelos] = await Promise.all([
            ExigenciaPlan.find({ piloto: { $in: listaIdsPilotos }, año: AÑO_ACTUAL }).lean(),
            Vuelo.find({
                $or: [
                    { piloto: { $in: listaIdsPilotos } },
                    { copiloto: { $in: listaIdsPilotos } },
                    { instructor: { $in: listaIdsPilotos } }
                ]
            }).select('horasVoladas fecha piloto copiloto instructor sistemaArmas').lean()
        ]);

        const mapaPlanes = planesCargados.reduce((acc, plan) => {
            acc[plan.piloto.toString()] = plan;
            return acc;
        }, {});

        const mapaMetricas = {};
        listaIdsPilotos.forEach(id => mapaMetricas[id.toString()] = { acum: {}, trim: {} });

        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            if (horas <= 0) return;

            const fechaVuelo = new Date(v.fecha);
            if (fechaVuelo.getFullYear() !== AÑO_ACTUAL) return;

            const sda = (v.sistemaArmas || 'SDA-N/D').trim().toUpperCase();
            const mes = fechaVuelo.getMonth();
            const t = mes <= 2 ? 't1' : mes <= 5 ? 't2' : mes <= 8 ? 't3' : 't4';

            [v.piloto, v.copiloto, v.instructor].forEach(id => {
                if (id && mapaMetricas[id.toString()]) {
                    const m = mapaMetricas[id.toString()];
                    if (!m.acum[sda]) m.acum[sda] = 0;
                    if (!m.trim[sda]) m.trim[sda] = { t1:0, t2:0, t3:0, t4:0 };
                    
                    m.acum[sda] += horas;
                    m.trim[sda][t] += horas;
                }
            });
        });

        const respuesta = pilotos.map(p => {
            const id = p._id.toString();
            const m = mapaMetricas[id];
            const plan = mapaPlanes[id];
            const sdas = p.habilitaciones?.map(h => h.aeronave?.trim().toUpperCase()).filter(Boolean) || [];

            const configTrimestresSda = {};
            const horasFaltantesSda = {};

            sdas.forEach(sda => {
                configTrimestresSda[sda] = { t1:{}, t2:{}, t3:{}, t4:{} };
                const hVoladas = m.trim[sda] || { t1:0, t2:0, t3:0, t4:0 };
                let faltantes = { t1:0, t2:0, t3:0, t4:0 };

                if (plan?.trimestres) {
                    plan.trimestres.filter(tr => tr.sistemaArmas === sda).forEach(tr => {
                        configTrimestresSda[sda][`t${tr.numero}`] = { 
                            rol: tr.rol, tipo: tr.tipo, novedad: tr.causaNoCumplimiento, novedadOtro: tr.novedadesOtro 
                        };
                        const exigencia = Number(tr.exigenciaHoras || 0);
                        faltantes[`t${tr.numero}`] = Math.max(0, exigencia - hVoladas[`t${tr.numero}`]);
                    });
                }
                horasFaltantesSda[sda] = faltantes;
            });

            return { 
                ...p, 
                horasAcumuladasSda: m.acum, 
                configTrimestresSda, 
                horasFaltantesSda,
                exigenciaPlanId: plan?._id || null 
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN CONSOLIDACIÓN:", error);
        res.status(500).json({ success: false, mensaje: "Error interno al procesar nómina EBM." });
    }
};

/**
 * OP 2: LISTADO DE VUELOS PURO
 */
exports.getVuelosUnidad = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        if (!unidadUser) return res.status(400).json({ mensaje: "Unidad no determinada." });

        const queryVuelos = !['COMANDO', 'ADMIN', 'COMANAV'].includes(unidadUser.trim().toUpperCase()) 
            ? { $or: [{ unidad: unidadUser }, { elementoApoyado: unidadUser.trim().toUpperCase() }] }
            : {};

        const vuelos = await Vuelo.find(queryVuelos)
            .populate('piloto copiloto instructor mecanico', 'grado apellido nombre')
            .sort({ fecha: -1 })
            .lean();
        res.status(200).json(vuelos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al recuperar vuelos." });
    }
};

/**
 * OP 3: PERSISTENCIA DE CONFIGURACIONES
 */
exports.actualizarConfiguracionEbm = async (req, res) => {
    try {
        const { id } = req.params;
        const { configTrimestresSda } = req.body;
        const trimestres = [];

        Object.entries(configTrimestresSda).forEach(([sda, data]) => {
            [1, 2, 3, 4].forEach(n => {
                if (data[`t${n}`]) {
                    trimestres.push({
                        numero: n,
                        sistemaArmas: sda,
                        ...data[`t${n}`],
                        causaNoCumplimiento: data[`t${n}`].novedad 
                    });
                }
            });
        });

        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: id, año: 2026 },
            { $set: { trimestres, ultimaModificacionPor: req.user?._id } },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        console.error("❌ ERROR DE PERSISTENCIA:", error);
        res.status(500).json({ success: false, mensaje: "Error al guardar el plan." });
    }
};