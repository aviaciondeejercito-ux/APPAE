const Tripulante = require('../models/Tripulante');
const Aeronave = require('../models/Aircraft');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const userUnidad = (req.user?.elemento || req.user?.unidad || '').trim().toUpperCase();

        const esMandoGlobal = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(userRole);
        const queryBase = esMandoGlobal ? {} : { unidad: userUnidad };

        const [tripulantes, aeronaves] = await Promise.all([
            Tripulante.find(esMandoGlobal ? {} : { $or: [{ elemento: userUnidad }, { unidad: userUnidad }] }).lean(),
            Aeronave.find(queryBase).lean()
        ]);

        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        const alertasConcurridas = [];

        const verificarFecha = (fecha, etiqueta, id, mat) => {
            if (!fecha) return;
            const fVenc = new Date(fecha);
            fVenc.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((fVenc.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                alertasConcurridas.push({
                    categoria: 'AERONAVE', tipo: etiqueta, gravedad: 'CRITICO',
                    identificador: `${id}-${etiqueta}-vencido`,
                    mensaje: `Aeronave ${mat}: ${etiqueta} VENCIDO (hace ${Math.abs(diffDays)} días).`
                });
            } else if (diffDays <= 30) {
                alertasConcurridas.push({
                    categoria: 'AERONAVE', tipo: etiqueta, gravedad: 'ADVERTENCIA',
                    identificador: `${id}-${etiqueta}-warn`,
                    mensaje: `Aeronave ${mat}: ${etiqueta} vence en ${diffDays} días.`
                });
            }
        };

        // --- A) Lógica de Psicofísicos (Tripulantes) ---
        tripulantes.forEach(t => {
            const identificacion = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim();
            const fechaPsico = t.certificaciones?.psicofisico?.vencimiento;
            
            // MODIFICACIÓN: Si no hay fecha, enviamos un mensaje que no contiene "días" para que el frontend agrupe
            if (!fechaPsico) {
                alertasConcurridas.push({
                    categoria: 'TRIPULANTE', tipo: 'PSICOFISICO', gravedad: 'CRITICO',
                    identificador: `${t._id}-psico-null`,
                    mensaje: `${identificacion}: SIN CARGAR`
                });
            } else {
                const fVencPsico = new Date(fechaPsico);
                fVencPsico.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((fVencPsico.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    alertasConcurridas.push({
                        categoria: 'TRIPULANTE', tipo: 'PSICOFISICO', gravedad: 'CRITICO',
                        identificador: `${t._id}-psico-vencido`,
                        mensaje: `${identificacion}: Psicofísico VENCIDO (hace ${Math.abs(diffDays)} días).`
                    });
                } else if (diffDays <= 30) {
                    alertasConcurridas.push({
                        categoria: 'TRIPULANTE', tipo: 'PSICOFISICO', gravedad: 'ADVERTENCIA',
                        identificador: `${t._id}-psico-warn`,
                        mensaje: `${identificacion}: Psicofísico próximo a vencer (${diffDays} días).`
                    });
                }
            }
        });

        // --- B) Lógica de Aeronaves ---
        aeronaves.forEach(a => {
            if (typeof a.horasRemanentes === 'number') {
                if (a.horasRemanentes <= 0) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE', tipo: 'POTENCIAL', gravedad: 'CRITICO',
                        identificador: `${a._id}-aero-crit`,
                        mensaje: `Aeronave ${a.matricula}: SIN POTENCIAL (0 hs).`
                    });
                } else if (a.horasRemanentes <= 25) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE', tipo: 'POTENCIAL', gravedad: 'ADVERTENCIA',
                        identificador: `${a._id}-aero-warn`,
                        mensaje: `Aeronave ${a.matricula}: Próxima a inspección (${a.horasRemanentes.toFixed(1)} hs).`
                    });
                }
            }
            verificarFecha(a.vencimientoAvionica, 'AVIÓNICA', a._id, a.matricula);
            verificarFecha(a.vencimientoRAAC91217, 'RAAC 91.217', a._id, a.matricula);
            verificarFecha(a.vencimientoRAAC91411, 'RAAC 91.411', a._id, a.matricula);
            verificarFecha(a.vencimientoRAAC91413, 'RAAC 91.413', a._id, a.matricula);
            verificarFecha(a.vencimientoSeguro, 'SEGURO', a._id, a.matricula);
        });

        return res.status(200).json({
            success: true,
            jurisdiccion: esMandoGlobal ? "CONSOLIDADO GLOBAL" : userUnidad,
            resumen: {
                criticas: alertasConcurridas.filter(a => a.gravedad === 'CRITICO').length,
                advertencias: alertasConcurridas.filter(a => a.gravedad === 'ADVERTENCIA').length
            },
            data: alertasConcurridas
        });
    } catch (error) {
        console.error("❌ Error en getAlertasInternasUnidad:", error);
        return res.status(500).json({ success: false, mensaje: "Error al consolidar alertas." });
    }
};