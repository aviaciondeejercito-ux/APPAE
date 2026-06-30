const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan');

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS (GET)
 * Duplica virtualmente a los pilotos multi-habilitados para mapear sus horas en cada SdA.
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

        // 1. Obtener la nómina de pilotos
        const pilotos = await Tripulante.find(queryPilotos).lean();
        if (!pilotos.length) return res.status(200).json([]);

        const listaIdsPilotos = pilotos.map(p => p._id);

        // 2. Traer configuraciones de ExigenciaPlan
        const planes = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        const mapPlanes = {};
        planes.forEach(pl => { 
            mapPlanes[pl.piloto.toString()] = pl; 
        });

        // 3. 📊 CÓMPUTO DE HORAS REALES FILTRADAS POR PILOTO Y SISTEMA DE ARMAS (SdA)
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

        // Mapeo optimizado multinivel: idPiloto_SdA_trimestre -> acumuladorHoras
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

        // 4. 🚀 CONSOLIDACIÓN MULTI-SDA VIRTUAL
        const resultadoFinal = [];

        pilotos.forEach(p => {
            const planPiloto = mapPlanes[p._id.toString()];
            
            // Recolectamos TODOS los Sistemas de Armas posibles para este piloto
            // Combinando sus habilitaciones oficiales con los SdA que ha volado este año
            const sdasDelPiloto = new Set();
            
            if (p.habilitaciones && p.habilitaciones.length > 0) {
                p.habilitaciones.forEach(h => {
                    if (h.aeronave) sdasDelPiloto.add(h.aeronave.trim().toUpperCase());
                });
            }
            
            // Buscar si voló algo que no esté explícito en habilitaciones
            vuelosAño.forEach(v => {
                if (
                    v.aeronave && (
                        v.piloto?.toString() === p._id.toString() || 
                        v.copiloto?.toString() === p._id.toString() ||
                        v.instructor?.toString() === p._id.toString()
                    )
                ) {
                    sdasDelPiloto.add(v.aeronave.trim().toUpperCase());
                }
            });

            // Si está vacío, le ponemos el fallback
            if (sdasDelPiloto.size === 0) sdasDelPiloto.add('SIN SdA');

            // Multiplicamos al piloto por cada SdA que posee habilitado/volado
            sdasDelPiloto.forEach(sda => {
                
                // Construimos la estructura de trimestres trayendo SOLO las horas de ESTE SdA específico
                const bloquePilotoSda = {
                    _id: `${p._id}_${sda}`, // ID único combinado para evitar colisiones en las keys de React
                    idOriginal: p._id,
                    grado: p.grado,
                    apellido: p.apellido,
                    nombre: p.nombre,
                    elemento: p.elemento || p.unidad,
                    aeronave: sda,
                    
                    trimestre1: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_1`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                    trimestre2: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_2`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                    trimestre3: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_3`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                    trimestre4: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_${sda}_4`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' }
                };

                // Injectamos configuraciones guardadas filtrando por el sistema de armas correspondiente
                if (planPiloto && planPiloto.trimestres) {
                    planPiloto.trimestres.forEach(t => {
                        // Si el plan histórico guardó el campo 'sistemaArmas', validamos que coincida
                        if (!t.sistemaArmas || t.sistemaArmas.trim().toUpperCase() === sda) {
                            const key = `trimestre${t.numero}`;
                            if (bloquePilotoSda[key]) {
                                bloquePilotoSda[key].condicion = t.condicion || t.rol || 'Copiloto';
                                bloquePilotoSda[key].tipoEbm = t.tipoEbm || t.tipo || 'A';
                                bloquePilotoSda[key].motivoNoCumplimiento = t.motivoNoCumplimiento || t.causaNoCumplimiento || '';
                                
                                let exigencia = 15;
                                if (bloquePilotoSda[key].tipoEbm === 'B') exigencia = 12;
                                if (bloquePilotoSda[key].tipoEbm === 'C') exigencia = 9;
                                if (bloquePilotoSda[key].tipoEbm === 'D') exigencia = 6;

                                const calculoRestante = exigencia - bloquePilotoSda[key].hsVoladas;
                                bloquePilotoSda[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                            }
                        }
                    });
                } else {
                    [1, 2, 3, 4].forEach(n => {
                        const key = `trimestre${n}`;
                        const calculoRestante = 15 - bloquePilotoSda[key].hsVoladas;
                        bloquePilotoSda[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                    });
                }

                resultadoFinal.push(bloquePilotoSda);
            });
        });

        res.status(200).json(resultadoFinal);

    } catch (error) {
        console.error("❌ Error en getPlanificacionCompleta Multi-SdA:", error);
        res.status(500).json({ success: false, mensaje: "Error de servidor al compilar la matriz dinámica." });
    }
};

/**
 * OP 2: HISTORIAL DE VUELOS RECIENTES DE LA UNIDAD (GET)
 */
exports.getVuelosUnidad = async (req, res) => {
    try {
        const unidadUser = req.user?.unidad || req.user?.elemento;
        if (!unidadUser) {
            return res.status(400).json({ success: false, mensaje: "Identificación de unidad requerida." });
        }

        const queryVuelos = {
            $or: [
                { unidadResponsable: unidadUser },
                { elementoApoyado: unidadUser }
            ]
        };

        const vuelos = await Vuelo.find(queryVuelos)
            .populate('piloto copiloto instructor', 'grado apellido nombre')
            .sort({ fecha: -1 })
            .lean();
            
        res.status(200).json(vuelos);
    } catch (error) {
        res.status(500).json({ success: false, mensaje: "Error al recuperar el historial de vuelos." });
    }
};

/**
 * OP 3: PERSISTENCIA DE CONFIGURACIONES TRIMESTRALES (PUT /:id)
 */
exports.actualizarConfiguracionEbm = async (req, res) => {
    try {
        const { id } = req.params; // Viene el idOriginal o el compuesto (ej: id_SdA)
        const realId = id.split('_')[0]; 
        const sdaTarget = id.split('_')[1] || ''; 

        const dataBody = req.body; 
        const AÑO_ACTUAL = 2026;

        if (!dataBody) {
            return res.status(400).json({ success: false, mensaje: "No se recibieron datos de configuración." });
        }

        const trimestresMapeadosDB = [];

        [1, 2, 3, 4].forEach(n => {
            const trimInput = dataBody[`trimestre${n}`];
            if (trimInput) {
                trimestresMapeadosDB.push({
                    numero: n,
                    sistemaArmas: sdaTarget.toUpperCase(),
                    condicion: trimInput.condicion || 'Copiloto',
                    tipoEbm: trimInput.tipoEbm || 'A',
                    motivoNoCumplimiento: trimInput.motivoNoCumplimiento || '',
                    hsVoladas: Number(trimInput.hsVoladas || 0) 
                });
            }
        });

        // Si el piloto tiene otros SdA ya configurados en la base de datos, los mantenemos para no pisarlos
        const planExistente = await ExigenciaPlan.findOne({ piloto: realId, año: AÑO_ACTUAL }).lean();
        let trimestresFinales = [];

        if (planExistente && planExistente.trimestres) {
            // Conservamos los trimestres de los OTROS sistemas de armas
            trimestresFinales = planExistente.trimestres.filter(t => t.sistemaArmas !== sdaTarget.toUpperCase());
        }
        
        // Unimos los preservados con los nuevos que se acaban de guardar
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
            mensaje: "Legajo EBM actualizado y sincronizado por SdA.",
            data: planActualizado
        });

    } catch (error) {
        console.error("❌ Error en actualizarConfiguracionEbm por SdA:", error);
        res.status(500).json({ 
            success: false, 
            mensaje: "Error interno del servidor al persistir la configuración." 
        });
    }
};