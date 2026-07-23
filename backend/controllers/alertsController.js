const Aircraft = require('../models/Aircraft'); 
const Tripulante = require('../models/Tripulante');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        // 1. Detectar unidad de forma prioritaria (req.query.unidad > req.user)
        const unidadBruta = req.query?.unidad || req.user?.elemento || req.user?.unidad || '';
        const userUnidad = String(unidadBruta).trim();

        const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'COMANDO', 'COMANAV'].includes(userRole);
        
        if (!esMandoEstrategico && !userUnidad) {
            return res.status(400).json({ 
                success: false, 
                mensaje: "El operador no cuenta con un elemento o unidad asignada en su perfil." 
            });
        }

        const fechaActual = new Date();
        const limite30Dias = new Date();
        limite30Dias.setDate(fechaActual.getDate() + 30);

        const alertasConcurridas = [];

        // Helper único de extracción segura de fechas (EJSON/Mongoose/Strings)
        const getFechaSegura = (campo) => {
            if (!campo) return null;
            if (campo.$date) return campo.$date;
            if (typeof campo === 'object' && 'vencimiento' in campo) {
                const v = campo.vencimiento;
                if (!v) return null;
                if (v.$date) return v.$date;
                return v;
            }
            return campo;
        };

        // Escapar caracteres especiales para la expresión regular si existe unidad
        const unidadEscapada = userUnidad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexUnidad = new RegExp(`^${unidadEscapada}$`, 'i');

        // ==========================================
        // 🛡️ SECCIÓN 1: ALERTAS DE TRIPULANTES
        // ==========================================
        let queryTripulantes = {};
        if (!esMandoEstrategico || (req.query?.unidad && req.query.unidad !== 'TODAS')) {
            queryTripulantes = { 
                $or: [
                    { elemento: regexUnidad },
                    { unidad: regexUnidad }
                ]
            };
        }

        // Consulta segura con captura individual
        const tripulantes = await Tripulante.find(queryTripulantes).lean().catch(() => []);

        (tripulantes || []).forEach(t => {
            const identificacion = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim();
            
            const fPsicoRaw = getFechaSegura(t.certificaciones?.psicofisico);
            const fCrmRaw = getFechaSegura(t.certificaciones?.crm);

            // ---- EVALUACIÓN DE PSICOFÍSICO ----
            if (!fPsicoRaw) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'PSICOFISICO',
                    gravedad: 'SINDATOS',
                    identificador: t._id,
                    mensaje: `⚫ ${identificacion} (Falta cargar Psicofísico)`
                });
            } else {
                const fVenc = new Date(fPsicoRaw);
                if (!isNaN(fVenc.getTime())) {
                    if (fVenc <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'PSICOFISICO',
                            gravedad: 'CRITICO',
                            identificador: t._id,
                            mensaje: `🚨 ${identificacion} (Psicofísico VENCIDO)`
                        });
                    } else if (fVenc <= limite30Dias) {
                        const dias = Math.ceil((fVenc - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'PSICOFISICO',
                            gravedad: 'ADVERTENCIA',
                            identificador: t._id,
                            mensaje: `⏳ ${identificacion} (Psicofísico vence en ${dias} días)`
                        });
                    }
                }
            }

            // ---- EVALUACIÓN DE CRM ----
            if (!fCrmRaw) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'CRM',
                    gravedad: 'SINDATOS',
                    identificador: t._id,
                    mensaje: `⚫ ${identificacion} (Falta cargar CRM)`
                });
            } else {
                const fVenc = new Date(fCrmRaw);
                if (!isNaN(fVenc.getTime())) {
                    if (fVenc <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'CRM',
                            gravedad: 'CRITICO',
                            identificador: t._id,
                            mensaje: `🚨 ${identificacion} (CRM VENCIDO)`
                        });
                    } else if (fVenc <= limite30Dias) {
                        const dias = Math.ceil((fVenc - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'CRM',
                            gravedad: 'ADVERTENCIA',
                            identificador: t._id,
                            mensaje: `⏳ ${identificacion} (CRM vence en ${dias} días)`
                        });
                    }
                }
            }
        });

        // ==========================================
        // ✈️ SECCIÓN 2: ALERTAS DE AERONAVES
        // ==========================================
        let queryAeronaves = {};
        if (!esMandoEstrategico || (req.query?.unidad && req.query.unidad !== 'TODAS')) {
            queryAeronaves = { unidad: regexUnidad };
        }

        // Consulta segura con captura individual
        const aeronaves = await Aircraft.find(queryAeronaves).lean().catch(() => []);

        (aeronaves || []).forEach(a => {
            const refAeronave = `${a.sda || 'SdA'} Mtr: ${a.matricula || 'S/M'}`;

            // ---- EVALUACIÓN DE SEGURO ----
            const fSeguroRaw = a.vencimientoSeguro?.$date || a.vencimientoSeguro;
            if (!fSeguroRaw) {
                alertasConcurridas.push({
                    categoria: 'AERONAVE',
                    tipo: 'SEGURO',
                    gravedad: 'SINDATOS',
                    identificador: a._id,
                    mensaje: `⚫ ${refAeronave} (Falta cargar Póliza de Seguro)`
                });
            } else {
                const fSeg = new Date(fSeguroRaw);
                if (!isNaN(fSeg.getTime())) {
                    if (fSeg <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'SEGURO',
                            gravedad: 'CRITICO',
                            identificador: a._id,
                            mensaje: `🚨 ${refAeronave} (Póliza de Seguro VENCIDA)`
                        });
                    } else if (fSeg <= limite30Dias) {
                        const dias = Math.ceil((fSeg - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'SEGURO',
                            gravedad: 'ADVERTENCIA',
                            identificador: a._id,
                            mensaje: `⏳ ${refAeronave} (Seguro vencerá en ${dias} días)`
                        });
                    }
                }
            }

            // ---- EVALUACIÓN DE POTENCIAL / MANTENIMIENTO ----
            if (typeof a.horasRemanentes !== 'number') {
                alertasConcurridas.push({
                    categoria: 'AERONAVE',
                    tipo: 'MANTENIMIENTO',
                    gravedad: 'SINDATOS',
                    identificador: a._id,
                    mensaje: `⚫ ${refAeronave} (Sin registro de horas de inspección)`
                });
            } else {
                if (a.horasRemanentes <= 0) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `🚨 ${refAeronave} (Sin potencial disponible / 0 hs)`
                    });
                } else if (a.horasRemanentes <= 10) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `⏳ ${refAeronave} (Inspección próxima: ${a.horasRemanentes.toFixed(1)} hs remanentes)`
                    });
                }
            }

            // ---- EVALUACIÓN DE AVIÓNICA ----
            const fAvionicaRaw = a.vencimientoAvionica?.$date || a.vencimientoAvionica;
            if (!fAvionicaRaw) {
                alertasConcurridas.push({
                    categoria: 'AERONAVE',
                    tipo: 'AVIONICA',
                    gravedad: 'SINDATOS',
                    identificador: a._id,
                    mensaje: `⚫ ${refAeronave} (Falta cargar inspección de Aviónica)`
                });
            } else {
                const fAvionica = new Date(fAvionicaRaw);
                if (!isNaN(fAvionica.getTime())) {
                    if (fAvionica <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'AVIONICA',
                            gravedad: 'CRITICO',
                            identificador: a._id,
                            mensaje: `🚨 ${refAeronave} (Inspección de Aviónica VENCIDA)`
                        });
                    } else if (fAvionica <= limite30Dias) {
                        const dias = Math.ceil((fAvionica - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'AVIONICA',
                            gravedad: 'ADVERTENCIA',
                            identificador: a._id,
                            mensaje: `⏳ ${refAeronave} (Aviónica vencerá en ${dias} días)`
                        });
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            jurisdiccion: esMandoEstrategico ? "CONSOLIDADO GLOBAL" : userUnidad,
            data: alertasConcurridas
        });

    } catch (error) {
        console.error("❌ Fallo en getAlertasInternasUnidad:", error);
        // Retornar respuesta limpia HTTP 200 con array vacío para no interrumpir el UI
        return res.status(200).json({
            success: true,
            jurisdiccion: "ERROR_RECUPERACION",
            data: []
        });
    }
};