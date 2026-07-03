const Aeronave = require('../models/Aeronave'); 
const Tripulante = require('../models/Tripulante');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        // 1. Extraer metadatos seguros del usuario logueado
        const rawRole = req.user?.rol || req.user?.role || '';
        // Normalización para simplificar comparaciones en el backend
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const userUnidad = (req.user?.elemento || req.user?.unidad || '').trim().toUpperCase();

        // Clasificación basada exactamente en tus perfiles (Mando, Operaciones, Oficina Técnica)
        const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'JEFE'].includes(userRole);
        const esOperaciones = ['OPERACIONES'].includes(userRole);
        const esOficinaTecnica = ['OFICINATECNICA', 'OFICINA_TECNICA'].includes(userRole);
        
        if (!esMandoEstrategico && !esOperaciones && !esOficinaTecnica && !userUnidad) {
            return res.status(400).json({ success: false, mensaje: "El operador no cuenta con un rol válido o un elemento asignado." });
        }

        const fechaActual = new Date();
        
        // Ventana preventiva de 30 días para personal, seguros e inspecciones
        const limite30Dias = new Date();
        limite30Dias.setDate(fechaActual.getDate() + 30);

        const alertasConcurridas = [];

        // ==========================================
        // 🛡️ SECCIÓN 1: ALERTAS DE TRIPULANTES (PSICOFÍSICOS E INMAE)
        // VISIBLE PARA: Mandos/Jefes y Operaciones (Excluye Oficina Técnica)
        // ==========================================
        if (esMandoEstrategico || esOperaciones) {
            const queryTripulantes = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(userRole) 
                ? {} 
                : { $or: [{ elemento: userUnidad }, { unidad: userUnidad }] };

            const tripulantes = await Tripulante.find(queryTripulantes).lean();

            tripulantes.forEach(t => {
                const identificacion = `${t.grado} ${t.apellido} ${t.nombre}`;
                const fechaPsico = t.certificaciones?.psicofisico?.vencimiento;
                const fechaInmae = t.certificaciones?.inmae?.vencimiento;

                // --- EVALUACIÓN DE PSICOFÍSICO ---
                if (!fechaPsico) {
                    alertasConcurridas.push({
                        categoria: 'TRIPULANTE',
                        tipo: 'PSICOFISICO',
                        gravedad: 'CRITICO',
                        identificador: `${t._id}-psico-nodata`,
                        mensaje: `El examen Psicofísico del ${identificacion} no registra datos cargados. Fuera de servicio.`
                    });
                } else {
                    const fVencPsico = new Date(fechaPsico);
                    if (fVencPsico <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'PSICOFISICO',
                            gravedad: 'CRITICO',
                            identificador: `${t._id}-psico-vencido`,
                            mensaje: `El examen Psicofísico del ${identificacion} está vencido. No apto operaciones.`
                        });
                    } else if (fVencPsico <= limite30Dias) {
                        const dias = Math.ceil((fVencPsico - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'PSICOFISICO',
                            gravedad: 'ADVERTENCIA',
                            identificador: `${t._id}-psico-warn`,
                            mensaje: `El examen Psicofísico del ${identificacion} está próximo a vencer (${dias} días restantes).`
                        });
                    }
                }

                // --- EVALUACIÓN DE INMAE ---
                if (!fechaInmae) {
                    alertasConcurridas.push({
                        categoria: 'TRIPULANTE',
                        tipo: 'INMAE',
                        gravedad: 'CRITICO',
                        identificador: `${t._id}-inmae-nodata`,
                        mensaje: `La certificación INMAE del ${identificacion} no registra datos cargados. Fuera de servicio.`
                    });
                } else {
                    const fVencInmae = new Date(fechaInmae);
                    if (fVencInmae <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'INMAE',
                            gravedad: 'CRITICO',
                            identificador: `${t._id}-inmae-vencido`,
                            mensaje: `La certificación INMAE del ${identificacion} está vencida. No apto operaciones.`
                        });
                    } else if (fVencInmae <= limite30Dias) {
                        const dias = Math.ceil((fVencInmae - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'TRIPULANTE',
                            tipo: 'INMAE',
                            gravedad: 'ADVERTENCIA',
                            identificador: `${t._id}-inmae-warn`,
                            mensaje: `La certificación INMAE del ${identificacion} está próxima a vencer (${dias} días restantes).`
                        });
                    }
                }
            });
        }

        // ==========================================
        // ✈️ SECCIÓN 2: ALERTAS DE AERONAVES
        // ==========================================
        const queryAeronaves = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(userRole) ? {} : { unidad: userUnidad };
        const aeronaves = await Aeronave.find(queryAeronaves).lean();

        aeronaves.forEach(a => {
            // A) HORAS DE VUELO (Célula)
            // VISIBLE PARA: Todos (Jefe, Operaciones y Oficina Técnica)
            if (typeof a.horasRemanentes === 'number') {
                if (a.horasRemanentes <= 0) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'CRITICO',
                        identificador: `${a._id}-maint-crit`,
                        mensaje: `La aeronave matrícula ${a.matricula} está sin potencial disponible (0 hs). Requiere inspección.`
                    });
                } else if (a.horasRemanentes <= 25) {
                    alertasConcurridas.push({
                        categoria: 'AERONAVE',
                        tipo: 'MANTENIMIENTO',
                        gravedad: 'ADVERTENCIA',
                        identificador: `${a._id}-maint-warn`,
                        mensaje: `La aeronave matrícula ${a.matricula} está próxima a inspección mayor. Restan solo ${a.horasRemanentes.toFixed(1)} hs.`
                    });
                }
            }

            // B) CONTRATOS E INSPECCIONES (Seguro y Aviónica) - UMBRAL: 30 DÍAS
            // VISIBLE PARA: Jefes y Oficina Técnica (Excluye Operaciones)
            if (esMandoEstrategico || esOficinaTecnica) {
                if (a.vencimientoSeguro) {
                    const fSeg = new Date(a.vencimientoSeguro);
                    if (fSeg <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'SEGURO',
                            gravedad: 'CRITICO',
                            identificador: `${a._id}-seg-crit`,
                            mensaje: `El seguro de la aeronave matrícula ${a.matricula} está vencido.`
                        });
                    } else if (fSeg <= limite30Dias) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'SEGURO',
                            gravedad: 'ADVERTENCIA',
                            identificador: `${a._id}-seg-warn`,
                            mensaje: `El seguro de la aeronave matrícula ${a.matricula} está próximo a vencer.`
                        });
                    }
                }

                if (a.vencimientoAvionica) {
                    const fAv = new Date(a.vencimientoAvionica);
                    if (fAv <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'AVIONICA',
                            gravedad: 'CRITICO',
                            identificador: `${a._id}-av-crit`,
                            mensaje: `La inspección de aviónica de la aeronave matrícula ${a.matricula} está vencida.`
                        });
                    } else if (fAv <= limite30Dias) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'AVIONICA',
                            gravedad: 'ADVERTENCIA',
                            identificador: `${a._id}-av-warn`,
                            mensaje: `La inspección de aviónica de la aeronave matrícula ${a.matricula} está próxima a vencer.`
                        });
                    }
                }
            }

            // C) COMPONENTES CRÍTICOS (Motor / Hélice) - UMBRAL: 30 HORAS
            // VISIBLE PARA: Jefes y Oficina Técnica (Excluye Operaciones)
            if (esMandoEstrategico || esOficinaTecnica) {
                const componentes = [
                    { nombre: 'motor', horas: a.horasRemanentesMotor },
                    { nombre: 'seguro', horas: a.horasRemanentesHelice } // Mapeado genérico según tu texto de salida solicitado
                ];

                componentes.forEach(comp => {
                    if (typeof comp.horas === 'number') {
                        if (comp.horas <= 0) {
                            alertasConcurridas.push({
                                categoria: 'COMPONENTES',
                                tipo: comp.nombre.toUpperCase(),
                                gravedad: 'CRITICO',
                                identificador: `${a._id}-${comp.nombre}-crit`,
                                mensaje: `El ${comp.nombre} de la aeronave matrícula ${a.matricula} está vencido.`
                            });
                        } else if (comp.horas <= 30) {
                            alertasConcurridas.push({
                                categoria: 'COMPONENTES',
                                tipo: comp.nombre.toUpperCase(),
                                gravedad: 'ADVERTENCIA',
                                identificador: `${a._id}-${comp.nombre}-warn`,
                                mensaje: `El ${comp.nombre} de la aeronave matrícula ${a.matricula} está próximo a vencer.`
                            });
                        }
                    }
                });
            }
        });

        return res.status(200).json({
            success: true,
            jurisdiccion: ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(userRole) ? "CONSOLIDADO GLOBAL" : userUnidad,
            resumen: {
                criticas: alertasConcurridas.filter(a => a.gravedad === 'CRITICO').length,
                advertencias: alertasConcurridas.filter(a => a.gravedad === 'ADVERTENCIA').length
            },
            data: alertasConcurridas
        });

    } catch (error) {
        console.error("❌ Error en getAlertasInternasUnidad:", error);
        return res.status(500).json({ success: false, mensaje: "Error interno del servidor." });
    }
};