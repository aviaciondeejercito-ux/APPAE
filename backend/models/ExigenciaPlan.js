const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan'); // <-- IMPORTAMOS TU MODELO

/**
 * OP 1: NÓMINA CONSOLIDADA (Pilotos únicos + Horas por SDA + Planificación ExigenciaPlan)
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

        // Si no hay pilotos, cortamos acá para evitar errores
        if (!pilotos.length) {
            return res.status(200).json([]);
        }

        const listaIdsPilotos = pilotos.map(p => p._id.toString());

        // 2. Traer TODAS las planificaciones del modelo ExigenciaPlan para este año y estos pilotos
        const planesCargados = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        // Indexamos los planes en memoria para buscarlos instantáneamente por ID de piloto [O(1)]
        const mapaPlanes = {};
        planesCargados.forEach(plan => {
            mapaPlanes[plan.piloto.toString()] = plan;
        });

        // 3. Consulta atómica de vuelos cruzando el campo 'sistemaArmas'
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

        // 5. Reducción y distribución temporal de horas de vuelo por SDA
        vuelos.forEach(v => {
            const horas = Number(v.horasVoladas) || 0;
            if (horas <= 0) return;

            const sdaNom = v.sistemaArmas ? v.sistemaArmas.trim().toUpperCase() : 'SDA-N/D';
            const fechaVuelo = v.fecha ? new Date(v.fecha) : new Date();
            const mes = fechaVuelo.getMonth(); 
            
            let claveTrimestre = 't1';
            if (mes >= 0 && mes <= 2)       claveTrimestre = 't1';
            else if (mes >= 3 && mes <= 5)  claveTrimestre = 't2';
            else if (mes >= 6 && mes <= 8)  claveTrimestre = 't3';
            else if (mes >= 9 && mes <= 11) claveTrimestre = 't4';

            const acumularMetricas = (idTripulante) => {
                if (!idTripulante) return;
                const idStr = idTripulante.toString();
                
                if (!mapaMetricas[idStr]) {
                    mapaMetricas[idStr] = { horasAcumuladasSda: {}, horasTrimestralesSda: {} };
                }
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

        // 6. CONSOLIDACIÓN FINAL SIN DUPLICADOS (1 Fila estricta por Piloto)
        const pilotosConsolidados = pilotos.map(p => {
            const idStr = p._id.toString();
            const metricas = mapaMetricas[idStr];
            const planPiloto = mapaPlanes[idStr]; // Buscamos si tiene un plan asignado en la BD

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

            // Mapeamos los trimestres guardados en el ExigenciaPlan para que coincidan con lo que el frontend espera
            // El frontend espera objetos del tipo: novedadesSda[sdaNom][`t${num}`] = 'Causa'
            const novedadesSda = {};
            const condicionesSda = {}; // Por si querés mapear el Rol (Piloto/Copiloto) o Tipo (A/B/C/D)

            if (planPiloto && planPiloto.trimestres) {
                planPiloto.trimestres.forEach(t => {
                    // Como tu modelo ExigenciaPlan no discrimina por SDA originalmente, asumimos el SDA principal
                    // o lo aplicamos de forma global. Para que tu interfaz lo procese por SDA, lo estructuramos:
                    // NOTA: Si en tu interfaz manejás un avión por defecto, usá su nombre, sino lo mapeamos dinámicamente.
                    const sdaAsignado = p.habilitaciones?.[0] || 'SDA-GENERAL'; 

                    if (!novedadesSda[sdaAsignado]) novedadesSda[sdaAsignado] = {};
                    if (!condicionesSda[sdaAsignado]) condicionesSda[sdaAsignado] = {};

                    novedadesSda[sdaAsignado][`t${t.numero}`] = t.causaNoCumplimiento || '';
                    condicionesSda[sdaAsignado][`t${t.numero}`] = t.rol || ''; // Guarda si es Instructor/Piloto/Copiloto
                });
            }

            return {
                ...p,
                horasAcumuladasSda: horasAcumSdaRedondeadas,
                horasTrimestralesSda: horasTrimSdaRedondeadas,
                horasFaltantesSda: {}, // Se calcula dinámicamente en el Front
                novedadesSda: novedadesSda,
                condicionesSda: condicionesSda, // Nueva propiedad limpia para leer los roles guardados
                exigenciaPlanId: planPiloto ? planPiloto._id : null // Guardamos la referencia del plan para actualizaciones directas
            };
        });

        // 7. Ordenamiento Militar Jerárquico
        const ordenGrados = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };
        pilotosConsolidados.sort((a, b) => {
            const pesoA = ordenGrados[a.grado] || 99;
            const pesoB = ordenGrados[b.grado] || 99;
            if (pesoA !== pesoB) return pesoA - pesoB;
            return (a.apellido || '').trim().toUpperCase().localeCompare((b.apellido || '').trim().toUpperCase());
        });

        console.log(`✅ Nómina blindada generada. Pilotos únicos enviados: ${pilotosConsolidados.length}`);
        res.status(200).json(pilotosConsolidados);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN CONSOLIDACIÓN CON EXIGENCIAPLAN:", error);
        res.status(500).json({ success: false, mensaje: "Error interno en el servidor al consolidar nómina militar." });
    }
};