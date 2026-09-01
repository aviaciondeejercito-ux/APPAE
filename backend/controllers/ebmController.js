const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan');

// Matriz oficial de exigencias diferenciada
const CONFIG_HORAS_EBM = {
    HELICOPTERO: {
        CP: { A: 6, B: 18, C: 15, D: 15 },
        PC: { A: 16, B: 24, C: 20, D: 20 },
        IE: { A: 20, B: 30, C: 25, D: 25 }
    },
    AVION: {
        CP: { A: 12, B: 18, C: 15, D: 15 },
        PC: { A: 20, B: 30, C: 25, D: 25 },
        IE: { A: 24, B: 36, C: 30, D: 30 }
    }
};

/**
 * FUNCIÓN AUXILIAR: DETECTAR CATEGORÍA POR NOMBRE DE SDA
 */
const determinarTipoAeronave = (sda) => {
    if (!sda) return 'AVION';
    const sdaUpper = sda.toUpperCase();
    const palabrasHelicopteros = ['UH', 'BELL', 'PUMA', 'AB206', 'AB-206', 'HUEY', 'AS332', 'AS350', 'HA-1'];
    
    if (palabrasHelicopteros.some(p => sdaUpper.includes(p))) {
        return 'HELICOPTERO';
    }
    return 'AVION';
};

/**
 * FUNCIÓN AUXILIAR DE NEGOCIO: CALCULAR HORAS EXIGIDAS DINÁMICO
 */
const calcularHorasExigidas = (condicion, tipoEbm, sda) => {
    const tipoAeronave = determinarTipoAeronave(sda);
    const rol = condicion || 'CP';
    const tipo = tipoEbm || 'A';

    return CONFIG_HORAS_EBM[tipoAeronave]?.[rol]?.[tipo] || 0;
};

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS (GET)
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

        const pilotos = await Tripulante.find(queryPilotos).lean();
        if (!pilotos.length) return res.status(200).json([]);

        const listaIdsPilotos = pilotos.map(p => p._id);

        const planes = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        const mapPlanes = {};
        planes.forEach(pl => { mapPlanes[pl.piloto.toString()] = pl; });

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
            const mes = new Date(dateObject).getMonth();
            if (mes >= 0 && mes <= 2) return 1;
            if (mes >= 3 && mes <= 5) return 2;
            if (mes >= 6 && mes <= 8) return 3;
            return 4;
        };

        // --- MAPEO CON SEGREGACIÓN DE ROLES (Piloto/Copiloto vs Instructor) ---
        const mapHorasVoladas = {};
        vuelosAño.forEach(v => {
            const trim = obtenerTrimestreDeFecha(v.fecha);
            const hs = Number(v.horasVoladas || 0);
            const sda = (v.aeronave || 'SIN SdA').trim().toUpperCase();

            const acumular = (pilotoId, rol) => {
                const k = `${pilotoId.toString()}_${sda}_${trim}`;
                if (!mapHorasVoladas[k]) {
                    mapHorasVoladas[k] = { hsPiloto: 0, hsInstructor: 0 };
                }
                if (rol === 'INSTRUCTOR') {
                    mapHorasVoladas[k].hsInstructor += hs;
                } else {
                    mapHorasVoladas[k].hsPiloto += hs;
                }
            };

            if (v.piloto) acumular(v.piloto, 'PILOTO');
            if (v.copiloto) acumular(v.copiloto, 'COPILOTO');
            if (v.instructor) acumular(v.instructor, 'INSTRUCTOR');
        });

        const resultadoFinal = [];

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

            sdasDelPiloto.forEach(sda => {
                const tipoAeronave = determinarTipoAeronave(sda);
                const defaultHs = (cond, tipo) => CONFIG_HORAS_EBM[tipoAeronave]?.[cond]?.[tipo] || 0;

                // Auxiliar para armar las métricas de horas del trimestre
                const getHsTrimestre = (pilotoId, sdaTarget, trimNum) => {
                    const data = mapHorasVoladas[`${pilotoId}_${sdaTarget}_${trimNum}`] || { hsPiloto: 0, hsInstructor: 0 };
                    const piloto = Math.round(data.hsPiloto * 10) / 10;
                    const instructor = Math.round(data.hsInstructor * 10) / 10;
                    const total = Math.round((data.hsPiloto + data.hsInstructor) * 10) / 10;
                    return { hsPiloto: piloto, hsInstructor: instructor, hsVoladas: total };
                };

                const t1 = getHsTrimestre(p._id, sda, 1);
                const t2 = getHsTrimestre(p._id, sda, 2);
                const t3 = getHsTrimestre(p._id, sda, 3);
                const t4 = getHsTrimestre(p._id, sda, 4);

                const bloquePilotoSda = {
                    _id: `${p._id}_${sda}`, 
                    idOriginal: p._id,
                    grado: p.grado,
                    apellido: p.apellido,
                    nombre: p.nombre,
                    elemento: p.elemento || p.unidad,
                    aeronave: sda,
                    
                    trimestre1: { condicion: 'CP', tipoEbm: 'A', ...t1, hsFaltantes: defaultHs('CP', 'A'), motivoNoCumplimiento: '' },
                    trimestre2: { condicion: 'CP', tipoEbm: 'B', ...t2, hsFaltantes: defaultHs('CP', 'B'), motivoNoCumplimiento: '' },
                    trimestre3: { condicion: 'CP', tipoEbm: 'C', ...t3, hsFaltantes: defaultHs('CP', 'C'), motivoNoCumplimiento: '' },
                    trimestre4: { condicion: 'CP', tipoEbm: 'D', ...t4, hsFaltantes: defaultHs('CP', 'D'), motivoNoCumplimiento: '' }
                };

                if (planPiloto && planPiloto.trimestres) {
                    planPiloto.trimestres.forEach(t => {
                        if (t.sistemaArmas && t.sistemaArmas.trim().toUpperCase() === sda) {
                            const key = `trimestre${t.numero}`;
                            if (bloquePilotoSda[key]) {
                                bloquePilotoSda[key].condicion = t.condicion || 'CP';
                                bloquePilotoSda[key].tipoEbm = t.tipoEbm || 'A';
                                bloquePilotoSda[key].motivoNoCumplimiento = t.motivoNoCumplimiento || '';

                                const exigenciaHorasCalculada = calcularHorasExigidas(t.condicion, t.tipoEbm, sda);
                                const calculoRestante = exigenciaHorasCalculada - bloquePilotoSda[key].hsVoladas;
                                
                                bloquePilotoSda[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                            }
                        }
                    });
                } else {
                    [1, 2, 3, 4].forEach(n => {
                        const key = `trimestre${n}`;
                        const tCond = bloquePilotoSda[key].condicion;
                        const tTipo = bloquePilotoSda[key].tipoEbm;
                        const exigenciaDefecto = defaultHs(tCond, tTipo);
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
 * OP 2: RECUPERAR BITÁCORA INDIVIDUAL DE UN PILOTO
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
 * OP 3: PERSISTENCIA DE CONFIGURACIONES TRIMESTRALES (PUT)
 */
exports.actualizarConfiguracionEbm = async (req, res) => {
    try {
        const { id } = req.params; 
        const realId = id.split('_')[0]; 
        const sdaTarget = id.split('_')[1] || ''; 
        const dataBody = req.body; 
        const AÑO_ACTUAL = 2026;

        if (!sdaTarget) {
            return res.status(400).json({ success: false, mensaje: "Identificador del Sistema de Armas faltante." });
        }

        const trimestresMapeadosDB = [];

        [1, 2, 3, 4].forEach(n => {
            const trimInput = dataBody[`trimestre${n}`];
            if (trimInput) {
                const exigenciaCalculada = calcularHorasExigidas(trimInput.condicion, trimInput.tipoEbm, sdaTarget);

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

        const planExistente = await ExigenciaPlan.findOne({ piloto: realId, año: AÑO_ACTUAL }).lean();
        let trimestresFinales = [];

        if (planExistente && planExistente.trimestres) {
            trimestresFinales = planExistente.trimestres.filter(t => t.sistemaArmas !== sdaTarget.toUpperCase());
        }
        
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