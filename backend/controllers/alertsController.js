const Aeronave = require('../models/Aeronave'); 
const Tripulante = require('../models/Tripulante');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        // 1. Extraer metadatos seguros del usuario logueado
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
        // 🛡️ SECCIÓN 1: ALERTAS DE TRIPULANTES (PSICOFÍSICOS)
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
            const fechaPsico = t.certificaciones?.psicofisico?.vencimiento;

            // CASO 1: Si no tiene datos cargados (Manda alerta de falta de carga)
            if (!fechaPsico) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'SINDATOS',
                    gravedad: 'SINDATOS',
                    identificador: t._id,
                    mensaje: identificacion
                });
                return; 
            }

            const fVenc = new Date(fechaPsico);

            // CASO 2: Vencido (Crítico)
            if (fVenc <= fechaActual) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'PSICOFISICO',
                    gravedad: 'CRITICO',
                    identificador: t._id,
                    mensaje: identificacion
                });
            } 
            // CASO 3: Próximo a vencer (Menos de 30 días - Advertencia)
            else if (fVenc <= limite30Dias) {
                const dias = Math.ceil((fVenc - fechaActual) / (1000 * 60 * 60 * 24));
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE',
                    tipo: 'PSICOFISICO',
                    gravedad: 'ADVERTENCIA',
                    identificador: t._id,
                    mensaje: `${identificacion} (Vence en ${dias} días)`
                });
            }
            // CASO 4: Si fVenc > limite30Dias (ESTÁ AL DÍA) -> No se genera ninguna alerta.
        });

        // ==========================================
        // ✈️ SECCIÓN 2: ALERTAS DE AERONAVES (SEGUROS, INSPECCIONES, AVIÓNICA)
        // ==========================================
        const queryAeronaves = esMandoEstrategico ? {} : { unidad: userUnidad };
        const aeronaves = await Aeronave.find(queryAeronaves).lean();

        aeronaves.forEach(a => {
            const refAeronave = `${a.sda} Matrícula: ${a.matricula}`;

            // A) Vencimiento de Seguro
            if (a.vencimientoSeguro) {
                const fSeg = new Date(a.vencimientoSeguro);
                if (fSeg <= fechaActual) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'SEGURO',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `Póliza de Seguro VENCIDA para aeronave ${refAeronave}.`
                    });
                } else if (fSeg <= limite30Dias) {
                    const dias = Math.ceil((fSeg - fechaActual) / (1000 * 60 * 60 * 24));
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'SEGURO',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `Seguro de aeronave ${refAeronave} vencerá en ${dias} días.`
                    });
                }
            }

            // B) Horas de Vuelo Remanentes (Inspecciones)
            if (typeof a.horasRemanentes === 'number') {
                if (a.horasRemanentes <= 0) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `Aeronave ${refAeronave} sin potencial disponible (0 hs). Requiere inspección.`
                    });
                } else if (a.horasRemanentes <= 10) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `Aeronave ${refAeronave} con inspección próxima. Restan solo ${a.horasRemanentes.toFixed(1)} hs.`
                    });
                }
            }

            // C) Vencimiento de Aviónica
            if (a.vencimientoAvionica) {
                const fAvionica = new Date(a.vencimientoAvionica);
                if (fAvionica <= fechaActual) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'AVIONICA',
                        gravedad: 'CRITICO',
                        identificador: a._id,
                        mensaje: `Inspección de Aviónica VENCIDA para ${refAeronave}.`
                    });
                } else if (fAvionica <= limite30Dias) {
                    const dias = Math.ceil((fAvionica - fechaActual) / (1000 * 60 * 60 * 24));
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'AVIONICA',
                        gravedad: 'ADVERTENCIA',
                        identificador: a._id,
                        mensaje: `Inspección de Aviónica de ${refAeronave} vencerá en ${dias} días.`
                    });
                }
            }
        });

        // 3. Respuesta consolidada
        return res.status(200).json({
            success: true,
            jurisdiccion: esMandoEstrategico ? "CONSOLIDADO GLOBAL" : userUnidad,
            resumen: {
                criticas: alertasConcurridas.filter(a => a.gravedad === 'CRITICO').length,
                advertencias: alertasConcurridas.filter(a => a.gravedad === 'ADVERTENCIA').length
            },
            data: alertasConcurridas
        });

    } catch (error) {
        console.error("❌ Fallo en getAlertasInternasUnidad:", error);
        return res.status(500).json({ success: false, mensaje: "Error del servidor al compilar el cuadro de alertas." });
    }
};