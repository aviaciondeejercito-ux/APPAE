const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan'); // <-- INTEGRADO: Modelo central de persistencia EBM

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS (Pilotos + Desglose Trimestral y Anual por SDA + ExigenciaPlan)
 * Trae los pilotos de la jurisdicción y les inyecta sus horas acumuladas, trimestrales y configuraciones de ExigenciaPlan.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        const AÑO_ACTUAL = 2026; // Definido según el contexto de tu app
        
        console.log(`📡 Petición EBM con ExigenciaPlan recibida para la unidad: ${unidadUser || 'SIN UNIDAD'}`);

        if (!unidadUser) {
            return res.status(400).json({ 
                success: false, 
                mensaje: "No se pudo determinar la unidad operativa del usuario actual." 
            });
        }
        
        // 1. Filtro base de tripulantes activos (Escala de Oficiales Pilotos)
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryPilotos = { 
            grado: { $in: gradosHabilitados }, 
            activo: true
        };

        // 2. Excepción de mando táctico superior
        const unidadNormalizada = unidadUser.trim().toUpperCase();
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV'].includes(unidadNormalizada);

        if (!esMandoEstrategico) {
            queryPilotos.$or = [
                { unidad: unidadUser }, 
                { elemento: unidadUser }
            ];
        }

        // 3. Ejecución de consulta de Pilotos
        const pilotos = await Tripulante.find(queryPilotos)
            .select('grado apellido nombre unidad elemento habilitaciones')
            .lean();

        if (!pilotos.length) {
            return res.status(200).json([]);
        }

        // 4. Extracción de IDs de los pilotos para buscar sus vuelos indexados y planes
        const listaIdsPilotos = pilotos.map(p => p._id.toString());

        // 5. Traer TODAS las planificaciones del modelo ExigenciaPlan para este año y estos pilotos
        const planesCargados = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        // Indexamos los planes en memoria para buscarlos de manera instantánea por ID de piloto [O(1)]
        const mapaPlanes = {};
        planesCargados.forEach(plan => {
            mapaPlanes[plan.piloto.toString()] = plan;
        });

        // 6. Consulta atómica de vuelos - Mantenemos el cruce por 'sistemaArmas'
        const vuelos = await Vuelo.find({
            $or: [
                { piloto: { $in: listaIdsPilotos } },
                { copiloto: { $in: listaIdsPilotos } },
                { instructor: { $in: listaIdsPilotos } }
            ]
        }).select('horasVoladas fecha piloto copiloto instructor sistemaArmas').lean();

        // 7. Estructura de almacenamiento indexado en memoria para métricas temporales por SDA
        const mapaMetricas = {};
        
        // Inicializamos la estructura limpia para cada piloto de la nómina
        listaIdsPilotos.forEach(id => {
            mapaMetricas[id] = {
                horasAcumuladasSda: {}, // Formato esperado: { "C-130": 45.2, "IA-63": 12.0 }
                horasTrimestralesSda: {} // Formato esperado: { "C-130": { t1: 10, t2: 20 }... }
            };
        });

        // 8. Mapeo, reducción y distribución temporal de horas en memoria discriminando por SDA
        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            if (horas <= 0) return;

            // Normalizamos el Sistema de Armas del vuelo. Si no tiene asignado, cae en resguardo.
            const sdaNom = v.sistemaArmas ? v.sistemaArmas.trim().toUpperCase() : 'SDA-N/D';

            // Evaluamos la fecha del vuelo
            const fechaVuelo = v.fecha ? new Date(v.fecha) : new Date();
            const anioVuelo = fechaVuelo.getFullYear();
            const mes = fechaVuelo.getMonth(); // (0 = Enero, 11 = Diciembre)
            
            // CRÍTICO: Las horas trimestrales corresponden estrictamente al año de la planificación (2026)
            if (anioVuelo !== AÑO_ACTUAL) return; 

            let claveTrimestre = 't1';
            if (mes >= 0 && mes <= 2)       claveTrimestre = 't1';
            else if (mes >= 3 && mes <= 5)  claveTrimestre = 't2';
            else if (mes >= 6 && mes <= 8)  claveTrimestre = 't3';
            else if (mes >= 9 && mes <= 11) claveTrimestre = 't4';

            // Helper interno para sumarizar los valores de los tripulantes implicados estructurando por SDA
            const acumularMetricasPorSda = (idTripulante) => {
                if (!idTripulante) return;
                const idStr = idTripulante.toString();
                
                if (!mapaMetricas[idStr]) return; 

                if (!mapaMetricas[idStr].horasAcumuladasSda[sdaNom]) {
                    mapaMetricas[idStr].horasAcumuladasSda[sdaNom] = 0;
                }
                if (!mapaMetricas[idStr].horasTrimestralesSda[sdaNom]) {
                    mapaMetricas[idStr].horasTrimestralesSda[sdaNom] = { t1: 0, t2: 0, t3: 0, t4: 0 };
                }

                // Sumarizamos las métricas del año actual 2026
                mapaMetricas[idStr].horasAcumuladasSda[sdaNom] += horas;
                mapaMetricas[idStr].horasTrimestralesSda[sdaNom][claveTrimestre] += horas;
            };

            acumularMetricasPorSda(v.piloto);
            acumularMetricasPorSda(v.copiloto);
            acumularMetricasPorSda(v.instructor);
        });

        // 9. Consolidación final inyectando las estructuras indexadas por SDA y ExigenciaPlan
        const pilotosConsolidados = pilotos.map(p => {
            const idStr = p._id.toString();
            const metricas = mapaMetricas[idStr];
            const planPiloto = mapaPlanes[idStr]; // Buscamos si tiene un plan asignado en la BD

            const horasAcumSdaRedondeadas = {};
            const horasTrimSdaRedondeadas = {};

            if (metricas) {
                // Redondear acumulados totales anuales por avión
                Object.keys(metricas.horasAcumuladasSda).forEach(sda => {
                    horasAcumSdaRedondeadas[sda] = Number(metricas.horasAcumuladasSda[sda].toFixed(1));
                });

                // Redondear desgloses por trimestre de cada avión
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

            // Mapeamos de forma dinámica por cada habilitación válida del piloto
            const habilitacionesSdas = p.habilitaciones?.map(h => h.aeronave?.trim().toUpperCase()).filter(Boolean) || [];

            habilitacionesSdas.forEach(sdaNom => {
                // Rellenamos estructuras base para que los selects del front no queden nulos
                configTrimestresSda[sdaNom] = {
                    t1: { rol: '', tipo: '', novedad: '', novedadOtro: '' },
                    t2: { rol: '', tipo: '', novedad: '', novedadOtro: '' },
                    t3: { rol: '', tipo: '', novedad: '', novedadOtro: '' },
                    t4: { rol: '', tipo: '', novedad: '', novedadOtro: '' }
                };

                const hVoladasSda = horasTrimSdaRedondeadas[sdaNom] || { t1: 0, t2: 0, t3: 0, t4: 0 };
                let exiT1 = 0, exiT2 = 0, exiT3 = 0, exiT4 = 0;

                if (planPiloto && planPiloto.trimestres) {
                    planPiloto.trimestres.forEach(t => {
                        const tKey = `t${t.numero}`;
                        
                        // Si coincide el sistema de armas, acoplamos los datos guardados en la base de datos
                        if (!t.sistemaArmas || t.sistemaArmas.trim().toUpperCase() === sdaNom) {
                            configTrimestresSda[sdaNom][tKey] = {
                                rol: t.rol || '',
                                tipo: t.tipo || '',
                                novedad: t.causaNoCumplimiento || '',
                                novedadOtro: t.novedadOtro || ''
                            };
                            
                            // Extraemos exigencias para el cálculo dinámico de faltantes
                            if (t.numero === 1) exiT1 = Number(t.exigenciaHoras) || 0;
                            if (t.numero === 2) exiT2 = Number(t.exigenciaHoras) || 0;
                            if (t.numero === 3) exiT3 = Number(t.exigenciaHoras) || 0;
                            if (t.numero === 4) exiT4 = Number(t.exigenciaHoras) || 0;
                        }
                    });
                }

                // Calculamos las horas faltantes reales del trimestre que el Front renderiza en su semáforo
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
                configTrimestresSda: configTrimestresSda, // Sincroniza ROL, TIPO y Justificaciones en los select dropdowns
                horasFaltantesSda: horasFaltantesSda,     // Alimenta los semáforos de cumplimiento
                exigenciaPlanId: planPiloto ? planPiloto._id : null // Referencia de actualización rápida
            };
        });

        // 10. Ordenamiento militar jerárquico descendente antes de enviar al cliente
        const ordenGrados = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };
        
        pilotosConsolidados.sort((a, b) => {
            const pesoA = ordenGrados[a.grado] || 99;
            const pesoB = ordenGrados[b.grado] || 99;
            if (pesoA !== pesoB) return pesoA - pesoB;
            return (a.apellido || '').trim().toUpperCase().localeCompare((b.apellido || '').trim().toUpperCase());
        });

        console.log(`✅ Nómina EBM unificada generada con éxito. Pilotos: ${pilotosConsolidados.length}. Vuelos calculados para 2026`);
        
        // Retornamos el array plano directamente ya que tu API service lo espera así
        res.status(200).json(pilotosConsolidados);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN PROCESAMIENTO HÍBRIDO EBM POR SDA:", error);
        res.status(500).json({ success: false, mensaje: "Error interno del servidor al consolidar horas de vuelo" });
    }
};

/**
 * OP 2: LISTADO DE VUELOS PURO DE LA JURISDUCCIÓN
 * Retorna el historial de vuelos del elemento del usuario (Filtro por Unidad)
 */
exports.getVuelosUnidad = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        
        if (!unidadUser) {
            return res.status(400).json({ mensaje: "No se pudo determinar la unidad del operador." });
        }

        const unidadNormalizada = unidadUser.trim().toUpperCase();
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV'].includes(unidadNormalizada);

        let queryVuelos = {};
        
        if (!esMandoEstrategico) {
            queryVuelos.$or = [
                { unidad: unidadUser },
                { elementoApoyado: unidadNormalizada }
            ];
        }

        const vuelos = await Vuelo.find(queryVuelos)
            .populate('piloto copiloto instructor mecanico', 'grado apellido nombre')
            .sort({ fecha: -1 })
            .lean();

        res.status(200).json(vuelos);

    } catch (error) {
        console.error("❌ ERROR EN GET_VUELOS_UNIDAD:", error);
        res.status(500).json({ mensaje: "Error al recuperar el registro de vuelos de la unidad" });
    }
};

/**
 * OP 3: ACTUALIZAR CONFIGURACIÓN / EXIGENCIAS EBM
 * Procesa la acción del botón de guardar del Front modificando el ExigenciaPlan de forma persistente.
 */
exports.actualizarConfiguracionEbm = async (req, res) => {
    try {
        const pilotoId = req.params.id;
        const { configTrimestresSda } = req.body; 
        const AÑO_ACTUAL = 2026;

        if (!configTrimestresSda) {
            return res.status(400).json({ success: false, mensaje: "Mapeo de configuraciones ausente en la petición." });
        }

        const trimestresFormateados = [];

        // Convertimos el mapa del front en el array que acepta la colección ExigenciaPlan
        Object.keys(configTrimestresSda).forEach(sdaNom => {
            const sdaData = configTrimestresSda[sdaNom];
            
            [1, 2, 3, 4].forEach(num => {
                const tKey = `t${num}`;
                if (sdaData[tKey]) {
                    const tConf = sdaData[tKey];
                    trimestresFormateados.push({
                        numero: num,
                        sistemaArmas: sdaNom.toUpperCase().trim(),
                        rol: tConf.rol || '',
                        tipo: tConf.tipo || '',
                        causaNoCumplimiento: tConf.novedad || '',
                        novedadesOtro: tConf.novedadOtro || ''
                    });
                }
            });
        });

        const planActualizado = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: AÑO_ACTUAL },
            {
                $set: {
                    trimestres: trimestresFormateados,
                    ultimaModificacionPor: req.user?._id || null
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            mensaje: "Sincronización EBM completada con éxito en base de datos centralizada.",
            data: planActualizado
        });

    } catch (error) {
        console.error("❌ ERROR AL ACTUALIZAR PERSISTENCIA EN EXIGENCIAPLAN:", error);
        res.status(500).json({ success: false, mensaje: "Error crítico de servidor al procesar el guardado." });
    }
};