const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan');

/**
 * FUNCIÓN AUXILIAR DE NEGOCIO: CALCULAR HORAS EXIGIDAS
 * Aplica la matriz exacta de la directiva cruzando Función y Tipo de Trimestre.
 */
const calcularHorasExigidas = (condicion, tipoEbm) => {
    // Valores por defecto ante cualquier anomalía
    const rol = condicion || 'CP';
    const tipo = tipoEbm || 'A';

    if (rol === 'CP') { // Copiloto (Total Anual: 60 hs)
        if (tipo === 'A') return 12;
        if (tipo === 'B') return 18;
        if (tipo === 'C') return 15;
        if (tipo === 'D') return 15;
    }
    
    if (rol === 'PC') { // Piloto en Comando (Total Anual: 100 hs)
        if (tipo === 'A') return 20;
        if (tipo === 'B') return 30;
        if (tipo === 'C') return 25;
        if (tipo === 'D') return 25;
    }
    
    if (rol === 'IE') { // Instructor / Estandarizador (Total Anual: 120 hs)
        if (tipo === 'A') return 24;
        if (tipo === 'B') return 36;
        if (tipo === 'C') return 30;
        if (tipo === 'D') return 30;
    }

    return 0;
};

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS (GET)
 * Cruza horas reales de vuelos, tipos de trimestres asignados y calcula los faltantes dinámicamente.
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
        
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV', 'BOSS', 'DIRECTOR', 'OTO'].includes(unidadUser.trim().toUpperCase());
        if (!esMandoEstrategico) {
            queryPilotos.$or = [{ unidad: unidadUser }, { elemento: unidadUser }];
        }

        // 1. Obtener pilotos habilitados
        const pilotos = await Tripulante.find(queryPilotos).lean();
        if (!pilotos.length) return res.status(200).json([]);

        const listaIdsPilotos = pilotos.map(p => p._id);

        // 2. Traer configuraciones guardadas en ExigenciaPlan
        const planes = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        const mapPlanes = {};
        planes.forEach(pl => { mapPlanes[pl.piloto.toString()] = pl; });

        // 3. Obtener vuelos del año para computar horas reales por trimestre y SdA
        const vuelosAño = await Vuelo.find({
            fecha: {
                $gte: new Date(`${AÑO_ACTUAL}-01-01T00:00:00.000Z`),
                $lte: new Date(`${AÑO_ACTUAL}-12-31T23:59:59.999Z`)
            },
            $or: [
                { piloto: { $in: listaIdsPilotos } },
                { copiloto: { $in: listaIdsPilotos } },
                { instructor: { $in: listaIdsPilotos } }
            ]
        }).lean();

        const obtenerTrimestreDeFecha = (dateObject) => {
            if (!dateObject) return 1;
            const mes = new Date(dateObject).getMonth(); // 0-11
            if (mes >= 0 && mes <= 2) return 1;
            if (mes >= 3 && mes <= 5) return 2;
            if (mes >= 6 && mes <= 8) return 3;
            return 4;
        };

        const mapHorasVoladas = {};
        vuelosAño.forEach(v => {
            const trim = obtenerTrimestreDeFecha(v.fecha);
            const hs = Number(v.horasVoladas || 0);
            const sda = (v.aeronave || 'SIN SdA').trim().toUpperCase();

            if (v.piloto) {
                const k = `${v.piloto.toString()}_${sda}_${trim}`;
                mapHorasVoladas[k] = (mapHorasVoladas[k] || 0) + hs;
            }
            if (v.copiloto) {
                const k = `${v.copiloto.toString()}_${sda}_${trim}`;
                mapHorasVoladas[k] = (mapHorasVoladas[k] || 0) + hs;
            }
            if (v.instructor) {
                const k = `${v.instructor.toString()}_${sda}_${trim}`;
                mapHorasVoladas[k] = (mapHorasVoladas[k] || 0) + hs;
            }
        });

        const resultadoFinal = [];

        // 4. Construcción del legajo consolidado cruzando vuelos y planificación
        pilotos.forEach(p => {
            const planPiloto = mapPlanes[p._id.toString()];
            const sdasDelPiloto = new Set();
            
            if (p.habilitaciones && p.habilitaciones.length > 0) {
                p.habilitaciones.forEach(h => {
                    if (h.aeronave) sdasDelPiloto.add(h.aeronave.trim().toUpperCase());
                });
            }
            
            vuelosAño.forEach(v => {
                if (v.aeronave && (v.piloto?.toString() === p._id.toString() || v.copiloto?.toString() === p._id.toString() || v.instructor?.toString() === p._id.toString())) {
                    sdasDelPiloto.add(v.aeronave.trim().toUpperCase());
                }
            });

            if (sdasDelPiloto.size === 0) sdasDelPiloto.add('SIN SdA');

            // Duplicación virtual ordenada por cada SdA asignado al tripulante
            sdasDelPiloto.forEach(sda => {
                const bloquePilotoSda = {
                    _id: `${p._id}_${sda}`, 
                    idOriginal: p._id,
                    grado: p.grado,
                    apellido: p.apellido,
                    nombre: p.nombre,
                    elemento: p.elemento || p.unidad,
                    aeronave: sda,
                    
                    // Inicialización por defecto en caso de no poseer configuraciones previas (Copiloto, Trimestre A = 12hs de base)
                    trimestre1: { condicion: 'CP', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_1`] || 0, hsFaltantes: 12, motivoNoCumplimiento: '' },
                    trimestre2: { condicion: 'CP', tipoEbm: 'B', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_2`] || 0, hsFaltantes: 18, motivoNoCumplimiento: '' },
                    trimestre3: { condicion: 'CP', tipoEbm: 'C', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_3`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                    trimestre4: { condicion: 'CP', tipoEbm: 'D', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_4`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' }
                };

                // Si existen parámetros guardados para el SdA actual, los mapeamos y recalculamos
                if (planPiloto && planPiloto.trimestres) {
                    planPiloto.trimestres.forEach(t => {
                        if (t.sistemaArmas && t.sistemaArmas.trim().toUpperCase() === sda) {
                            const key = `trimestre${t.numero}`;
                            if (bloquePilotoSda[key]) {
                                bloquePilotoSda[key].condicion = t.condicion || 'CP';
                                bloquePilotoSda[key].tipoEbm = t.tipoEbm || 'A';
                                bloquePilotoSda[key].motivoNoCumplimiento = t.motivoNoCumplimiento || '';

                                // Ejecutar cálculo cruzado exacto de la Directiva
                                const exigenciaHorasCalculada = calcularHorasExigidas(t.condicion, t.tipoEbm);
                                const calculoRestante = exigenciaHorasCalculada - bloquePilotoSda[key].hsVoladas;
                                
                                bloquePilotoSda[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                            }
                        }
                    });
                } else {
                    // Si no tiene plan, computar los faltantes basándose en la inicialización por defecto
                    [1, 2, 3, 4].forEach(n => {
                        const key = `trimestre${n}`;
                        const exigenciaDefecto = n === 1 ? 12 : n === 2 ? 18 : 15; // A=12, B=18, C=15, D=15
                        const calculoRestante = exigenciaDefecto - bloquePilotoSda[key].hsVoladas;
                        bloquePilotoSda[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                    });
                }

                resultadoFinal.push(bloquePilotoSda);
            });
        });

        res.status(200).json(resultadoFinal);

    } catch (error) {
        console.error("❌ Error en getPlanificacionCompleta:", error);
        res.status(500).json({ success: false, mensaje: "Error de servidor al compilar la matriz EBM." });
    }
};

/**
 * OP 2: RECUPERAR BITÁCORA INDIVIDUAL DE UN PILOTO (HISTORIAL)
 */
exports.getVuelosTripulanteEbm = async (req, res) => {
    try {
        const { id } = req.params;
        const realId = id.split('_')[0]; 
        const AÑO_ACTUAL = 2026;

        const queryVuelos = {
            fecha: {
                $gte: new Date(`${AÑO_ACTUAL}-01-01T00:00:00.000Z`),
                $lte: new Date(`${AÑO_ACTUAL}-12-31T23:59:59.999Z`)
            },
            $or: [
                { piloto: realId },
                { copiloto: realId },
                { instructor: realId }
            ]
        };

        const vuelos = await Vuelo.find(queryVuelos)
            .populate('piloto copiloto instructor mecanico', 'grado apellido nombre')
            .sort({ fecha: -1 })
            .lean();

        res.status(200).json(vuelos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al recuperar vuelos vinculados al legajo." });
    }
};

/**
 * OP 3: PERSISTENCIA DE CONFIGURACIONES TRIMESTRALES SEGÚN DIRECTIVA (PUT)
 */
exports.actualizarConfiguracionEbm = async (req, res) => {
    try {
        const { id } = req.params; // Viene empaquetado como: idOriginal_SdA (ej: 651a2b_UH-1H)
        const realId = id.split('_')[0]; 
        const sdaTarget = id.split('_')[1] || ''; 
        const dataBody = req.body; 
        const AÑO_ACTUAL = 2026;

        if (!sdaTarget) {
            return res.status(400).json({ success: false, mensaje: "Identificador del Sistema de Armas faltante." });
        }

        const trimestresMapeadosDB = [];

        // Mapeamos los 4 bloques de trimestres gestionados en el Frontend
        [1, 2, 3, 4].forEach(n => {
            const trimInput = dataBody[`trimestre${n}`];
            if (trimInput) {
                // Obtenemos la exigencia de horas correspondiente para dejar asentado el valor estático en BD
                const exigenciaCalculada = calcularHorasExigidas(trimInput.condicion, trimInput.tipoEbm);

                trimestresMapeadosDB.push({
                    numero: n,
                    sistemaArmas: sdaTarget.toUpperCase(),
                    condicion: trimInput.condicion || 'CP',
                    tipoEbm: trimInput.tipoEbm || 'A',
                    exigenciaHoras: exigenciaCalculada,
                    motivoNoCumplimiento: trimInput.motivoNoCumplimiento || '',
                    hsVoladas: Number(trimInput.hsVoladas || 0) 
                });
            }
        });

        // Buscamos si el piloto ya tiene planificaciones previas para otros SdA
        const planExistente = await ExigenciaPlan.findOne({ piloto: realId, año: AÑO_ACTUAL }).lean();
        let trimestresFinales = [];

        if (planExistente && planExistente.trimestres) {
            // Preservamos de manera íntegra las configuraciones de los OTROS Sistemas de Armas
            trimestresFinales = planExistente.trimestres.filter(t => t.sistemaArmas !== sdaTarget.toUpperCase());
        }
        
        // Unimos las configuraciones previas con la actualización actual del SdA correspondiente
        trimestresFinales = [...trimestresFinales, ...trimestresMapeadosDB];

        const planActualizado = await ExigenciaPlan.findOneAndUpdate(
            { piloto: realId, año: AÑO_ACTUAL },
            { 
                $set: { 
                    trimestres: trimestresFinales, 
                    ultimaModificacionPor: req.user?._id || null 
                } 
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            mensaje: "Parámetros EBM guardados con éxito para el SdA " + sdaTarget.toUpperCase(),
            data: planActualizado
        });

    } catch (error) {
        console.error("❌ Error en actualizarConfiguracionEbm por SdA:", error);
        res.status(500).json({ success: false, mensaje: "Fallo crítico al persistir la configuración anual en el servidor." });
    }
};