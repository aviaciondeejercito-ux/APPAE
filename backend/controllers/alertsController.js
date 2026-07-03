const Tripulante = require('../models/Tripulante');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        // 1. Extraer metadatos seguros del operador logueado
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const userUnidad = (req.user?.elemento || req.user?.unidad || '').trim().toUpperCase();

        // Clasificación de jurisdicción global vs local
        const esMandoGlobal = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(userRole);

        // Si es mando global ve todo ({}), si es de unidad filtra por su elemento/unidad
        const queryTripulantes = esMandoGlobal 
            ? {} 
            : { $or: [{ elemento: userUnidad }, { unidad: userUnidad }] };

        const tripulantes = await Tripulante.find(queryTripulantes).lean();
        
        // Normalizamos la fecha actual a medianoche para un cálculo exacto de días enteros
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);

        const alertasConcurridas = [];

        tripulantes.forEach(t => {
            const identificacion = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim();
            const fechaPsico = t.certificaciones?.psicofisico?.vencimiento;

            if (fechaPsico) {
                const fVencPsico = new Date(fechaPsico);
                fVencPsico.setHours(0, 0, 0, 0);

                // Cálculo exacto de la diferencia en días enteros
                const diffTime = fVencPsico.getTime() - fechaActual.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    // 🔴 CASO 1: VENCIDO (A partir del día exacto que venció)
                    const diasPasados = Math.abs(diffDays);
                    alertasConcurridas.push({
                        categoria: 'TRIPULANTE',
                        tipo: 'PSICOFISICO',
                        gravedad: 'CRITICO',
                        identificador: `${t._id}-psico-vencido`,
                        mensaje: `El examen Psicofísico de ${identificacion} está VENCIDO (hace ${diasPasados} días).`
                    });
                } else if (diffDays <= 30) {
                    // ⚠️ CASO 2: PRÓXIMO A VENCER (Ventana de 30 días)
                    alertasConcurridas.push({
                        categoria: 'TRIPULANTE',
                        tipo: 'PSICOFISICO',
                        gravedad: 'ADVERTENCIA',
                        identificador: `${t._id}-psico-warn`,
                        mensaje: `El examen Psicofísico de ${identificacion} vence en ${diffDays} días.`
                    });
                }
            }
        });

        // 2. Responder de forma unificada para el Widget
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
        return res.status(500).json({ success: false, mensaje: "Error interno del servidor al procesar psicofísicos." });
    }
};