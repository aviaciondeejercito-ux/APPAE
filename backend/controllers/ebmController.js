const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo'); 
const ExigenciaPlan = require('../models/ExigenciaPlan');

/**
 * OP 1: NÓMINA CONSOLIDADA POR SISTEMA DE ARMAS (GET)
 * Cruza la información del tripulante, sus vuelos reales del 2026 y sus metas de EBM.
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
        
        // Control de jurisdicción estricto por elemento militar
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV', 'BOSS'].includes(unidadUser.trim().toUpperCase());
        if (!esMandoEstrategico) {
            queryPilotos.$or = [{ unidad: unidadUser }, { elemento: unidadUser }];
        }

        // 1. Obtener la nómina de pilotos autorizados
        const pilotos = await Tripulante.find(queryPilotos).lean();
        if (!pilotos.length) return res.status(200).json([]);

        const listaIdsPilotos = pilotos.map(p => p._id);

        // 2. Traer las configuraciones de exigencia anuales guardadas
        const planes = await ExigenciaPlan.find({
            piloto: { $in: listaIdsPilotos },
            año: AÑO_ACTUAL
        }).lean();

        const mapPlanes = {};
        planes.forEach(pl => { 
            mapPlanes[pl.piloto.toString()] = pl; 
        });

        // 3. 📊 CÓMPUTO CRONOLÓGICO DE HORAS REALES VOLADAS
        // Filtramos por rango de fechas ya que tu esquema guarda la fecha nativa de Mongo sin campo "año" directo.
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

        // Helper para determinar el trimestre exacto (0 = Ene, 11 = Dic)
        const obtenerTrimestreDeFecha = (dateObject) => {
            if (!dateObject) return 1;
            const mes = new Date(dateObject).getMonth();
            if (mes >= 0 && mes <= 2) return 1;
            if (mes >= 3 && mes <= 5) return 2;
            if (mes >= 6 && mes <= 8) return 3;
            return 4;
        };

        // Mapeo optimizado en memoria: idPiloto_trimestre -> acumuladorHoras
        const mapHorasVoladas = {};
        vuelosAño.forEach(v => {
            const trim = obtenerTrimestreDeFecha(v.fecha);
            const hs = Number(v.horasVoladas || 0);

            if (v.piloto) {
                const k = `${v.piloto.toString()}_${trim}`;
                mapHorasVoladas[k] = (mapHorasVoladas[k] || 0) + hs;
            }
            if (v.copiloto) {
                const k = `${v.copiloto.toString()}_${trim}`;
                mapHorasVoladas[k] = (mapHorasVoladas[k] || 0) + hs;
            }
            if (v.instructor) {
                const k = `${v.instructor.toString()}_${trim}`;
                mapHorasVoladas[k] = (mapHorasVoladas[k] || 0) + hs;
            }
        });

        // 4. Consolidación de datos con el formato exacto que renderiza EbmPage.jsx
        const resultadoFinal = pilotos.map(p => {
            const planPiloto = mapPlanes[p._id.toString()];
            
            // Lógica adaptativa para el SdA (Si el legajo no tiene habilitaciones, busca el SdA en sus vuelos guardados)
            let sdaAsignado = 'SIN SdA';
            if (p.habilitaciones && p.habilitaciones.length > 0 && p.habilitaciones[0].aeronave) {
                sdaAsignado = p.habilitaciones[0].aeronave;
            } else {
                const primerVueloEncontrado = vuelosAño.find(v => 
                    v.piloto?.toString() === p._id.toString() || 
                    v.copiloto?.toString() === p._id.toString() ||
                    v.instructor?.toString() === p._id.toString()
                );
                if (primerVueloEncontrado && primerVueloEncontrado.aeronave) {
                    sdaAsignado = primerVueloEncontrado.aeronave;
                }
            }

            const pilotoConEbm = {
                _id: p._id,
                grado: p.grado,
                apellido: p.apellido,
                nombre: p.nombre,
                elemento: p.elemento || p.unidad,
                aeronave: sdaAsignado,
                
                // Inicialización de los 4 bloques trimestrales que lee la interfaz
                trimestre1: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_1`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                trimestre2: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_2`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                trimestre3: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_3`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' },
                trimestre4: { condicion: 'Copiloto', tipoEbm: 'A', hsVoladas: mapHorasVoladas[`${p._id}_4`] || 0, hsFaltantes: 15, motivoNoCumplimiento: '' }
            };

            // Si hay un plan personalizado guardado en MongoDB, mapeamos sus propiedades sobre el trimestre
            if (planPiloto && planPiloto.trimestres) {
                planPiloto.trimestres.forEach(t => {
                    const key = `trimestre${t.numero}`;
                    if (pilotoConEbm[key]) {
                        pilotoConEbm[key].condicion = t.condicion || t.rol || 'Copiloto';
                        pilotoConEbm[key].tipoEbm = t.tipoEbm || t.tipo || 'A';
                        pilotoConEbm[key].motivoNoCumplimiento = t.motivoNoCumplimiento || t.causaNoCumplimiento || '';
                        
                        // Escala matemática de exigencias por tipo (A=15hs, B=12hs, C=9hs, D=6hs)
                        let exigencia = 15;
                        if (pilotoConEbm[key].tipoEbm === 'B') exigencia = 12;
                        if (pilotoConEbm[key].tipoEbm === 'C') exigencia = 9;
                        if (pilotoConEbm[key].tipoEbm === 'D') exigencia = 6;

                        const calculoRestante = exigencia - pilotoConEbm[key].hsVoladas;
                        pilotoConEbm[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                    }
                });
            } else {
                // Si no hay configuración previa, calculamos el remanente con la exigencia estándar de 15hs
                [1, 2, 3, 4].forEach(n => {
                    const key = `trimestre${n}`;
                    const calculoRestante = 15 - pilotoConEbm[key].hsVoladas;
                    pilotoConEbm[key].hsFaltantes = calculoRestante > 0 ? Math.round(calculoRestante * 10) / 10 : 0;
                });
            }

            return pilotoConEbm;
        });

        res.status(200).json(resultadoFinal);

    } catch (error) {
        console.error("❌ Error en getPlanificacionCompleta:", error);
        res.status(500).json({ success: false, mensaje: "Error de servidor al compilar matriz EBM." });
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
        console.error("❌ Error en getVuelosUnidad:", error);
        res.status(500).json({ success: false, mensaje: "Error al recuperar el historial de vuelos." });
    }
};

/**
 * OP 3: PERSISTENCIA DE CONFIGURACIONES TRIMESTRALES (PUT /:id)
 * Procesa el JSON plano de los trimestres enviados por el Front y actualiza ExigenciaPlan.
 */
exports.actualizarConfiguracionEbm = async (req, res) => {
    try {
        const { id } = req.params;
        const dataBody = req.body; 
        const AÑO_ACTUAL = 2026;

        if (!dataBody) {
            return res.status(400).json({ success: false, mensaje: "No se recibieron datos de configuración." });
        }

        const trimestresMapeadosDB = [];

        // Iteramos sobre el payload desestructurando cada trimestre enviado desde React
        [1, 2, 3, 4].forEach(n => {
            const trimInput = dataBody[`trimestre${n}`];
            if (trimInput) {
                trimestresMapeadosDB.push({
                    numero: n,
                    condicion: trimInput.condicion || 'Copiloto',
                    tipoEbm: trimInput.tipoEbm || 'A',
                    motivoNoCumplimiento: trimInput.motivoNoCumplimiento || '',
                    hsVoladas: Number(trimInput.hsVoladas || 0) 
                });
            }
        });

        // Guardar o actualizar la planificación anual de EBM del piloto correspondiente
        const planActualizado = await ExigenciaPlan.findOneAndUpdate(
            { piloto: id, año: AÑO_ACTUAL },
            { 
                $set: { 
                    trimestres: trimestresMapeadosDB, 
                    ultimaModificacionPor: req.user?._id || null 
                } 
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            mensaje: "Legajo EBM actualizado y sincronizado correctamente con la Base de Datos.",
            data: planActualizado
        });

    } catch (error) {
        console.error("❌ Error en actualizarConfiguracionEbm:", error);
        res.status(500).json({ 
            success: false, 
            mensaje: "Error interno del servidor al persistir la configuración EBM." 
        });
    }
};