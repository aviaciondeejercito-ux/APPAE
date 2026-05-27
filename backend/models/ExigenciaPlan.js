const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan'); // Model de persistencia EBM

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS CON EXIGENCIAPLAN
 * Acopla las horas de vuelo reales calculadas para 2026 y las configuraciones/justificaciones mapeadas
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        const AÑO_ACTUAL = 2026; 
        
        console.log(`📡 Petición EBM con ExigenciaPlan recibida para la unidad: ${unidadUser || 'SIN UNIDAD'}`);

        if (!unidadUser) {
            return res.status(400).json({ 
                success: false, 
                mensaje: "No se pudo determinar la unidad operativa del usuario actual." 
            });
        }
        
        // 1. Obtener la lista base de Pilotos Activos ÚNICOS
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryPilotos = { grado: { $in: gradosHabilitados }, activo: true };

        const unidadNormalizada = unidadUser.trim().toUpperCase();
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV'].includes(unidadNormalizada);

        if (!esMandoEstrategico) {
            queryPilotos.$or = [
                { unidad: unidadUser }, 
                { elemento: unidadUser }
            ];
        }

        const pilotos = await Tripulante.find(queryPilotos)
            .select('grado apellido nombre unidad elemento habilitaciones')
            .lean();

        if (!pilotos.length) {
            return res.status(200).json([]);
        }

        const listaIdsPilotos = pilotos.map(p => p._id.toString());

        // 2. Traer TODAS las planificaciones del modelo ExigenciaPlan para este año y estos pilotos
        const planesCargados = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        // Indexamos los planes en memoria por ID de piloto para búsquedas O(1)
        const mapaPlanes = {};
        planesCargados.forEach(plan => {
            mapaPlanes[plan.piloto.toString()] = plan;
        });

        // 3. Consulta atómica de vuelos
        const vuelos = await Vuelo.find({
            $or: [
                { piloto: { $in: listaIdsPilotos } },
                { copiloto: { $in: listaIdsPilotos } },
                { instructor: { $in: listaIdsPilotos } }
            ]
        }).select('horasVoladas fecha piloto copiloto instructor sistemaArmas').lean();

        // 4. Estructura de almacenamiento indexado en memoria para métricas por SDA
        const mapaMetricas = {};
        listaIdsPilotos.forEach(id => {
            mapaMetricas[id] = {
                horasAcumuladasSda: {},
                horasTrimestralesSda: {}
            };
        });

        // 5. Reducción y distribución temporal de horas de vuelo por SDA (Exclusivo Año 2026)
        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            if (horas <= 0) return;

            const fechaVuelo = v.fecha ? new Date(v.fecha) : new Date();
            // Evitamos contaminación de horas de años anteriores en los trimestres de planificación
            if (fechaVuelo.getFullYear() !== AÑO_ACTUAL) return; 

            const sdaNom = v.sistemaArmas ? v.sistemaArmas.trim().toUpperCase() : 'SDA-N/D';
            const mes = fechaVuelo.getMonth(); 
            
            let claveTrimestre = 't1';
            if (mes >= 0 && mes <= 2)       claveTrimestre = 't1';
            else if (mes >= 3 && mes <= 5)  claveTrimestre = 't2';
            else if (mes >= 6 && mes <= 8)  claveTrimestre = 't3';
            else if (mes >= 9 && mes <= 11) claveTrimestre = 't4';

            const acumularMetricas = (idTripulante) => {
                if (!idTripulante) return;
                const idStr = idTripulante.toString();
                
                if (!mapaMetricas[idStr]) return; // Resguardo por si no pertenece a la unidad filtrada

                if (!mapaMetricas[idStr].horasAcumuladasSda[sdaNom]) {
                    mapaMetricas[idStr].horasAcumuladasSda[sdaNom] = 0;
                }
                if (!mapaMetricas[idStr].horasTrimestralesSda[sdaNom]) {
                    mapaMetricas[idStr].horasTrimestralesSda[sdaNom] = { t1: 0, t2: 0, t3: 0, t4: 0 };
                }

                mapaMetricas[idStr].horasAcumuladasSda[sdaNom] += horas;
                mapaMetricas[idStr].horasTrimestralesSda[sdaNom][claveTrimestre] += horas;
            };

            acumularMetricas(v.piloto);
            acumularMetricas(v.copiloto);
            acumularMetricas(v.instructor);
        });

        // 6. CONSOLIDACIÓN FINAL E INYECTADO ADAPTADO AL FRONTEND
        const pilotosConsolidados = pilotos.map(p => {
            const idStr = p._id.toString();
            const metricas = mapaMetricas[idStr];
            const planPiloto = mapaPlanes[idStr]; 

            const horasAcumSdaRedondeadas = {};
            const horasTrimSdaRedondeadas = {};

            if (metricas) {
                Object.keys(metricas.horasAcumuladasSda).forEach(sda => {
                    horasAcumSdaRedondeadas[sda] = Number(metricas.horasAcumuladasSda[sda].toFixed(1));
                });
                Object.keys(metricas.horasTrimestralesSda).forEach(sda => {
                    const t = metricas.horasTrimestralesSda[sda];
                    horasTrimSdaRedondeadas[sda] = {
                        t1: Number(t.t1.toFixed(1)),
                        t2: Number(t.t2.toFixed(1)),
                        t3: Number(t.t3.toFixed(1)),
                        t4: Number(t.t4.toFixed(1))
                    };
                });
            }

            // Inicializamos los contenedores estructurados exactamente como los busca tu Frontend
            const configTrimestresSda = {};
            const horasFaltantesSda = {};

            // Mapeamos por cada habilitación válida del piloto para asegurar consistencia multimisión/SDA
            const habilitacionesSdas = p.habilitaciones?.map(h => h.aeronave?.trim().toUpperCase()).filter(Boolean) || [];

            habilitacionesSdas.forEach(sdaNom => {
                // 1. Inicializamos con estructuras vacías por defecto para que los selects no tiren error de nulos
                configTrimestresSda[sdaNom] = {
                    t1: { rol: '', tipo: '', novedad: '', novedadOtro: '' },
                    t2: { rol: '', tipo: '', novedad: '', novedadOtro: '' },
                    t3: { rol: '', tipo: '', novedad: '', novedadOtro: '' },
                    t4: { rol: '', tipo: '', novedad: '', novedadOtro: '' }
                };

                // Obtenemos horas voladas en este sda (si existen)
                const hVoladasSda = horasTrimSdaRedondeadas[sdaNom] || { t1: 0, t2: 0, t3: 0, t4: 0 };

                // Recuperamos las exigencias del plan si existen en la BD
                let exiT1 = 0, exiT2 = 0, exiT3 = 0, exiT4 = 0;

                if (planPiloto && planPiloto.trimestres) {
                    planPiloto.trimestres.forEach(t => {
                        const tKey = `t${t.numero}`;
                        
                        // Si el plan guarda la discriminación por aeronave/Sda la comparamos, sino acoplamos global
                        if (!t.sistemaArmas || t.sistemaArmas.trim().toUpperCase() === sdaNom) {
                            configTrimestresSda[sdaNom][tKey] = {
                                rol: t.rol || '',
                                tipo: t.tipo || '',
                                novedad: t.causaNoCumplimiento || '',
                                novedadOtro: t.novedadOtro || ''
                            };
                            
                            // Extraemos la exigencia de horas planificada para calcular los faltantes
                            if (t.numero === 1) exiT1 = Number(t.exigenciaHoras) || 0;
                            if (t.numero === 2) exiT2 = Number(t.exigenciaHoras) || 0;
                            if (t.numero === 3) exiT3 = Number(t.exigenciaHoras) || 0;
                            if (t.numero === 4) exiT4 = Number(t.exigenciaHoras) || 0;
                        }
                    });
                }

                // 2. Calculamos las horas faltantes reales del trimestre que el Front renderiza en su semáforo
                horasFaltantesSda[sdaNom] = {
                    t1: Math.max(0, Number((exiT1 - hVoladasSda.t1).toFixed(1))),
                    t2: Math.max(0, Number((exiT2 - hVoladasSda.t2).toFixed(1))),
                    t3: Math.max(0, Number((exiT3 - hVoladasSda.t3).toFixed(1))),
                    t4: Math.max(0, Number((exiT4 - hVoladasSda.t4).toFixed(1)))
                };
            });

            return {
                ...p,
                horasAcumuladasSda: horasAcumSdaRedondeadas,
                horasTrimestralesSda: horasTrimSdaRedondeadas,
                configTrimestresSda: configTrimestresSda, // Inyectado clave para sincronización de selects
                horasFaltantesSda: horasFaltantesSda,     // Inyectado clave para Semáforos e Incumplimientos
                exigenciaPlanId: planPiloto ? planPiloto._id : null
            };
        });

        // 7. Ordenamiento Militar Jerárquico Deseado (Grado -> Apellido)
        const ordenGrados = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };
        pilotosConsolidados.sort((a, b) => {
            const pesoA = ordenGrados[a.grado] || 99;
            const pesoB = ordenGrados[b.grado] || 99;
            if (pesoA !== pesoB) return pesoA - pesoB;
            return (a.apellido || '').trim().toUpperCase().localeCompare((b.apellido || '').trim().toUpperCase());
        });

        console.log(`✅ Nómina EBM con ExigenciaPlan consolidada con éxito. Registros: ${pilotosConsolidados.length}`);
        res.status(200).json(pilotosConsolidados);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN CONSOLIDACIÓN CON EXIGENCIAPLAN:", error);
        res.status(500).json({ success: false, mensaje: "Error interno en el servidor al consolidar nómina militar." });
    }
};