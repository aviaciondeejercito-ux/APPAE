const Tripulante = require('../models/Tripulante');
// IMPORTANTE: Importamos el modelo de Vuelo para realizar el cruce de horas acumuladas
const Vuelo = require('../models/Vuelo'); 

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS (Pilotos + Desglose Trimestral y Anual por SDA)
 * Trae los pilotos de la jurisdicción y les inyecta sus horas acumuladas y trimestrales segmentadas por avión.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        
        console.log(`📡 Petición EBM Consolidada Trimestral (Por SDA) recibida para la unidad: ${unidadUser || 'SIN UNIDAD'}`);

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
        // Nota: Traemos 'configuracionEbm' que almacena las novedades y justificaciones del EbmPage frontend
        const pilotos = await Tripulante.find(queryPilotos)
            .select('grado apellido nombre unidad elemento habilitaciones configuracionEbm')
            .lean();

        // 4. Extracción de IDs de los pilotos para buscar sus vuelos indexados
        const listaIdsPilotos = pilotos.map(p => p._id.toString());

        // 5. Consulta atómica de vuelos - NOTA: Se incorpora 'sistemaArmas' para segmentar por avión
        const vuelos = await Vuelo.find({
            $or: [
                { piloto: { $in: listaIdsPilotos } },
                { copiloto: { $in: listaIdsPilotos } },
                { instructor: { $in: listaIdsPilotos } }
            ]
        }).select('horasVoladas fecha piloto copiloto instructor sistemaArmas').lean();

        // 6. Estructura de almacenamiento indexado en memoria para métricas temporales por SDA
        const mapaMetricas = {};
        
        // Inicializamos la estructura limpia para cada piloto de la nómina
        listaIdsPilotos.forEach(id => {
            mapaMetricas[id] = {
                horasAcumuladasSda: {}, // Formato esperado: { "C-130": 45.2, "IA-63": 12.0 }
                horasTrimestralesSda: {} // Formato esperado: { "C-130": { t1: 10, t2: 20 }, "IA-63": { t1: 5... } }
            };
        });

        // 7. Mapeo, reducción y distribución temporal de horas en memoria discriminando por SDA
        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            if (horas <= 0) return;

            // Normalizamos el Sistema de Armas del vuelo. Si no tiene asignado, cae en resguardo.
            const sdaNom = v.sistemaArmas ? v.sistemaArmas.trim().toUpperCase() : 'SDA-N/D';

            // Evaluamos el mes del vuelo (0 = Enero, 11 = Diciembre) para determinar el trimestre cronológico
            const fechaVuelo = v.fecha ? new Date(v.fecha) : new Date();
            const mes = fechaVuelo.getMonth(); 
            
            let claveTrimestre = 't1';
            if (mes >= 0 && mes <= 2)       claveTrimestre = 't1';
            else if (mes >= 3 && mes <= 5)  claveTrimestre = 't2';
            else if (mes >= 6 && mes <= 8)  claveTrimestre = 't3';
            else if (mes >= 9 && mes <= 11) claveTrimestre = 't4';

            // Helper interno para sumarizar los valores de los tripulantes implicados estructurando por SDA
            const acumularMetricasPorSda = (idTripulante) => {
                if (!idTripulante) return;
                const idStr = idTripulante.toString();
                
                // Inicialización de resguardo por si el piloto no figuraba originalmente en la lista
                if (!mapaMetricas[idStr]) {
                    mapaMetricas[idStr] = { horasAcumuladasSda: {}, horasTrimestralesSda: {} };
                }

                // Si es el primer vuelo de este SDA para el piloto, inicializamos los contenedores
                if (!mapaMetricas[idStr].horasAcumuladasSda[sdaNom]) {
                    mapaMetricas[idStr].horasAcumuladasSda[sdaNom] = 0;
                }
                if (!mapaMetricas[idStr].horasTrimestralesSda[sdaNom]) {
                    mapaMetricas[idStr].horasTrimestralesSda[sdaNom] = { t1: 0, t2: 0, t3: 0, t4: 0 };
                }

                // Sumarizamos las métricas
                mapaMetricas[idStr].horasAcumuladasSda[sdaNom] += horas;
                mapaMetricas[idStr].horasTrimestralesSda[sdaNom][claveTrimestre] += horas;
            };

            acumularMetricasPorSda(v.piloto);
            acumularMetricasPorSda(v.copiloto);
            acumularMetricasPorSda(v.instructor);
        });

        // 8. Consolidación final inyectando las estructuras indexadas por SDA (redondeado a 1 decimal)
        const pilotosConsolidados = pilotos.map(p => {
            const idStr = p._id.toString();
            const metricas = mapaMetricas[idStr];

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

            return {
                ...p,
                horasAcumuladasSda: horasAcumSdaRedondeadas,
                horasTrimestralesSda: horasTrimSdaRedondeadas,
                // Inyectamos resguardos mapeados con el esquema que maneja el frontend para novedades persistentes
                horasFaltantesSda: p.configuracionEbm?.horasFaltantesSda || {}, 
                novedadesSda: p.configuracionEbm?.novedadesSda || {}
            };
        });

        // 9. Ordenamiento militar jerárquico descendente antes de enviar al cliente
        const ordenGrados = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };
        
        pilotosConsolidados.sort((a, b) => {
            const pesoA = ordenGrados[a.grado] || 99;
            const pesoB = ordenGrados[b.grado] || 99;
            if (pesoA !== pesoB) return pesoA - pesoB;
            return (a.apellido || '').trim().toUpperCase().localeCompare((b.apellido || '').trim().toUpperCase());
        });

        console.log(`✅ Nómina EBM por SDA generada con éxito. Pilotos: ${pilotosConsolidados.length}. Vuelos cruzados: ${vuelos.length}`);
        res.status(200).json(pilotosConsolidados);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN PROCESAMIENTO HÍBRIDO EBM POR SDA:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al consolidar horas de vuelo" });
    }
};

/**
 * OP 2: LISTADO DE VUELOS PURO DE LA JURISDICCIÓN
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