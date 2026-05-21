const Tripulante = require('../models/Tripulante');
// IMPORTANTE: Importamos el modelo de Vuelo para realizar el cruce de horas acumuladas
const Vuelo = require('../models/Vuelo'); 

/**
 * OP 1: NÓMINA CONSOLIDADA (Pilotos + Horas Totales + Desglose Trimestral)
 * Trae los pilotos de la jurisdicción y les inyecta sus horas acumuladas y trimestrales en base a los vuelos.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        
        console.log(`📡 Petición EBM Consolidada Trimestral recibida para la unidad: ${unidadUser || 'SIN UNIDAD'}`);

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

        // 4. Extracción de IDs de los pilotos para buscar sus vuelos indexados
        const listaIdsPilotos = pilotos.map(p => p._id.toString());

        // 5. Consulta atómica de vuelos (Agregamos 'fecha' para calcular los trimestres)
        const vuelos = await Vuelo.find({
            $or: [
                { piloto: { $in: listaIdsPilotos } },
                { copiloto: { $in: listaIdsPilotos } },
                { instructor: { $in: listaIdsPilotos } }
            ]
        }).select('horasVoladas fecha piloto copiloto instructor').lean();

        // 6. Estructura de almacenamiento indexado en memoria para métricas temporales
        const mapaMetricas = {};
        
        // Inicializamos la estructura limpia para cada piloto de la nómina
        listaIdsPilotos.forEach(id => {
            mapaMetricas[id] = {
                total: 0,
                t1: 0, // Ene, Feb, Mar
                t2: 0, // Abr, May, Jun
                t3: 0, // Jul, Ago, Sep
                t4: 0  // Oct, Nov, Dic
            };
        });

        // 7. Mapeo, reducción y distribución temporal de horas en memoria
        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            if (horas <= 0) return;

            // Evaluamos el mes del vuelo (0 = Enero, 11 = Diciembre)
            const fechaVuelo = v.fecha ? new Date(v.fecha) : new Date();
            const mes = fechaVuelo.getMonth(); 
            
            let claveTrimestre = 't1';
            if (mes >= 0 && mes <= 2)   claveTrimestre = 't1';
            else if (mes >= 3 && mes <= 5)  claveTrimestre = 't2';
            else if (mes >= 6 && mes <= 8)  claveTrimestre = 't3';
            else if (mes >= 9 && mes <= 11) claveTrimestre = 't4';

            // Helper interno para sumarizar los valores de los tripulantes implicados
            const acumularMétricas = (idTripulante) => {
                if (!idTripulante) return;
                const idStr = idTripulante.toString();
                
                // Inicialización de resguardo por si el piloto no figuraba originalmente en la lista
                if (!mapaMetricas[idStr]) {
                    mapaMetricas[idStr] = { total: 0, t1: 0, t2: 0, t3: 0, t4: 0 };
                }

                mapaMetricas[idStr].total += horas;
                mapaMetricas[idStr][claveTrimestre] += horas;
            };

            acumularMétricas(v.piloto);
            acumularMétricas(v.copiloto);
            acumularMétricas(v.instructor);
        });

        // 8. Consolidación final inyectando el total y el objeto de trimestres (redondeado a 1 decimal)
        const pilotosConsolidados = pilotos.map(p => {
            const idStr = p._id.toString();
            const metricas = mapaMetricas[idStr];

            return {
                ...p,
                horasAcumuladas: metricas ? Number(metricas.total.toFixed(1)) : 0,
                horasTrimestrales: {
                    t1: metricas ? Number(metricas.t1.toFixed(1)) : 0,
                    t2: metricas ? Number(metricas.t2.toFixed(1)) : 0,
                    t3: metricas ? Number(metricas.t3.toFixed(1)) : 0,
                    t4: metricas ? Number(metricas.t4.toFixed(1)) : 0
                }
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

        console.log(`✅ Nómina EBM generada con Trimestres. Pilotos: ${pilotosConsolidados.length}. Vuelos: ${vuelos.length}`);
        res.status(200).json(pilotosConsolidados);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN PROCESAMIENTO HÍBRIDO EBM:", error);
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