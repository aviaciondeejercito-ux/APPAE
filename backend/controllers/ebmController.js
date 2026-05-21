const Tripulante = require('../models/Tripulante');
// IMPORTANTE: Importamos el modelo de Vuelo para realizar el cruce de horas acumuladas
const Vuelo = require('../models/Vuelo'); 

/**
 * OP 1: NÓMINA CONSOLIDADA (Pilotos + Horas Totales Computadas)
 * Trae los pilotos de la jurisdicción y les inyecta sus horas acumuladas en base a los vuelos.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        
        console.log(`📡 Petición EBM Consolidada recibida para la unidad: ${unidadUser || 'SIN UNIDAD'}`);

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

        // 5. Consulta atómica de vuelos donde cualquiera de estos pilotos haya participado
        // (Buscamos si fue Piloto, Copiloto o Instructor en el registro)
        const vuelos = await Vuelo.find({
            $or: [
                { piloto: { $in: listaIdsPilotos } },
                { copiloto: { $in: listaIdsPilotos } },
                { instructor: { $in: listaIdsPilotos } }
            ]
        }).select('horasVoladas piloto copiloto instructor').lean();

        // 6. Mapeo y reducción del historial de horas en memoria
        const mapaHoras = {};
        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            
            if (v.piloto) {
                const idStr = v.piloto.toString();
                mapaHoras[idStr] = (mapaHoras[idStr] || 0) + horas;
            }
            if (v.copiloto) {
                const idStr = v.copiloto.toString();
                mapaHoras[idStr] = (mapaHoras[idStr] || 0) + horas;
            }
            if (v.instructor) {
                const idStr = v.instructor.toString();
                mapaHoras[idStr] = (mapaHoras[idStr] || 0) + horas;
            }
        });

        // 7. Consolidación final: Inyectamos las horas calculadas a cada objeto piloto
        const pilotosConsolidados = pilotos.map(p => {
            return {
                ...p,
                horasAcumuladas: mapaHoras[p._id.toString()] || 0
            };
        });

        // 8. Ordenamiento militar jerárquico descendente antes de enviar al cliente
        const ordenGrados = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };
        
        pilotosConsolidados.sort((a, b) => {
            const pesoA = ordenGrados[a.grado] || 99;
            const pesoB = ordenGrados[b.grado] || 99;
            if (pesoA !== pesoB) return pesoA - pesoB;
            return (a.apellido || '').trim().toUpperCase().localeCompare((b.apellido || '').trim().toUpperCase());
        });

        console.log(`✅ Nómina EBM generada. Pilotos: ${pilotosConsolidados.length}. Vuelos procesados: ${vuelos.length}`);
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
        
        // Si no es comando, filtramos los vuelos que correspondan a su elemento apoyado o unidad operativa
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