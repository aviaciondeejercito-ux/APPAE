const Aircraft = require('../models/Aircraft'); 
const Tripulante = require('../models/Tripulante');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const userUnidad = (req.user?.elemento || req.user?.unidad || '').trim().toUpperCase();

        const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'COMANDO', 'COMANAV'].includes(userRole);
        
        if (!esMandoEstrategico && !userUnidad) {
            return res.status(400).json({ success: false, mensaje: "El operador no cuenta con un elemento o unidad asignada en su perfil." });
        }

        const fechaActual = new Date();
        const limite30Dias = new Date();
        limite30Dias.setDate(fechaActual.getDate() + 30);

        const alertasConcurridas = [];

        // ==========================================
        // 🛡️ SECCIÓN 1: ALERTAS DE TRIPULANTES
        // ==========================================
        const queryTripulantes = esMandoEstrategico ? {} : { 
            $or: [
                { elemento: userUnidad },
                { unidad: userUnidad }
            ]
        };

        const tripulantes = await Tripulante.find(queryTripulantes).lean();

        tripulantes.forEach(t => {
            const identificacion = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim();
            
            // Extracción segura soportando formatos crudos, anidados o sub-objetos $date
            const getFechaSegura = (campo) => {
                if (!campo) return null;
                if (campo.$date) return campo.$date; // Captura el formato del JSON crudo de Mongo
                if (campo.vencimiento) {
                    if (campo.vencimiento.$date) return campo.vencimiento.$date;
                    return campo.vencimiento;
                }
                return campo;
            };

            const fPsicoRaw = getFechaSegura(t.certificaciones?.psicofisico);
            const fCrmRaw = getFechaSegura(t.certificaciones?.crm);

            // ---- EVALUACIÓN DE PSICOFÍSICO ----
            if (!fPsicoRaw) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'SINDATOS',
                    gravedad: 'SINDATOS',
                    identificador: t._id,
                    mensaje: `⚫ ${identificacion} (Falta cargar Psicofísico)`
                });
            } else {
                const fVenc = new Date(fPsicoRaw);
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

            // ---- EVALUACIÓN DE CRM ----
            if (!fCrmRaw) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'SINDATOS',
                    gravedad: 'SINDATOS',
                    identificador: t._id,
                    mensaje: `⚫ ${identificacion} (Falta cargar CRM)`
                });
            } else {
                const fVenc = new Date(fCrmRaw);
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
        });

        // ==========================================
        // ✈️ SECCIÓN 2: ALERTAS DE AERONAVES
        // ==========================================
        const queryAeronaves = esMandoEstrategico ? {} : { unidad: userUnidad };
        const aeronaves = await Aircraft.find(queryAeronaves).lean();

        aeronaves.forEach(a => {
            const refAeronave = `${a.sda} Matrícula: ${a.matricula}`;

            const fSeguroRaw = a.vencimientoSeguro?.$date || a.vencimientoSeguro;
            if (fSeguroRaw) {
                const fSeg = new Date(fSeguroRaw);
                if (fSeg <= fechaActual) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'SEGURO',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `🚨 Póliza de Seguro VENCIDA para aeronave ${refAeronave}.`
                    });
                } else if (fSeg <= limite30Dias) {
                    const dias = Math.ceil((fSeg - fechaActual) / (1000 * 60 * 60 * 24));
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'SEGURO',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `⚠️ Seguro de aeronave ${refAeronave} vencerá en ${dias} días.`
                    });
                }
            }

            if (typeof a.horasRemanentes === 'number') {
                if (a.horasRemanentes <= 0) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `🚨 Aeronave ${refAeronave} sin potencial disponible (0 hs).`
                    });
                } else if (a.horasRemanentes <= 10) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `⚠️ Aeronave ${refAeronave} con inspección próxima (${a.horasRemanentes.toFixed(1)} hs remanentes).`
                    });
                }
            }

            const fAvionicaRaw = a.vencimientoAvionica?.$date || a.vencimientoAvionica;
            if (fAvionicaRaw) {
                const fAvionica = new Date(fAvionicaRaw);
                if (fAvionica <= fechaActual) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'AVIONICA',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `🚨 Inspección de Aviónica VENCIDA para ${refAeronave}.`
                    });
                } else if (fAvionica <= limite30Dias) {
                    const dias = Math.ceil((fAvionica - fechaActual) / (1000 * 60 * 60 * 24));
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'AVIONICA',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `⚠️ Inspección de Aviónica de ${refAeronave} vencerá en ${dias} días.`
                    });
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
        return res.status(500).json({ success: false, mensaje: "Error del servidor al compilar el cuadro de alertas." });
    }
};