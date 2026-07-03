const Aeronave = require('../models/Aeronave'); 
const Tripulante = require('../models/Tripulante');

exports.getAlertasInternasUnidad = async (req, res) => {
    try {
        // 1. Extraer metadatos seguros del usuario logueado
        const rawRole = req.user?.rol || req.user?.role || '';
        // Normalización táctica: pasamos a mayúsculas y removemos espacios, guiones y guiones bajos
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const userUnidad = (req.user?.elemento || req.user?.unidad || '').trim().toUpperCase();

        // Mapeo seguro contemplando los tipos exactos provistos
        const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE', 'COMANDO', 'COMANAV', 'JEFE'].includes(userRole);
        const esOperaciones = ['OPERACIONES', 'OPER', 'S3'].includes(userRole);
        const esOficinaTecnica = ['OFICINATECNICA', 'OFICINA_TECNICA', 'OT', 'MANTENIMIENTO', 'S4'].includes(userRole);
        
        if (!esMandoEstrategico && !esOperaciones && !esOficinaTecnica && !userUnidad) {
            return res.status(400).json({ success: false, mensaje: "El operador no cuenta con un rol válido o un elemento asignado." });
        }

        const fechaActual = new Date();
        
        // Ventana preventiva fijada en 30 días para personal, seguros y aviónica
        const limite30Dias = new Date();
        limite30Dias.setDate(fechaActual.getDate() + 30);

        const alertasConcurridas = [];

        // ==========================================
        // 🛡️ SECCIÓN 1: ALERTAS DE TRIPULANTES (PSICOFÍSICOS E INMAE)
        // VISIBLE PARA: Mandos/Jefes y Operaciones
        // ==========================================
        if (esMandoEstrategico || esOperaciones) {
            // Los administradores de nivel estratégico ven global, los Jefes de Unidad ven solo su Unidad
            const queryTripulantes = (['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(userRole)) 
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
        // VISIBLE PARA: Todos los roles autorizados (con restricciones internas)
        // ==========================================
        const queryAeronaves = (['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(userRole)) ? {} : { unidad: userUnidad };
        const aeronaves = await Aeronave.find(queryAeronaves).lean();

        aeronaves.forEach(a => {
            // A) HORAS DE VUELO DE LA AERONAVE (Célula / Estructura general)
            // VISIBLE PARA: Jefes, Operaciones y Oficina Técnica
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

            // B) CONTRATOS E INSPECCIONES PERIÓDICAS (Seguro y Aviónica) - UMBRAL: 30 DÍAS
            // VISIBLE PARA: Jefes y Oficina Técnica únicamente
            if (esMandoEstrategico || esOficinaTecnica) {
                // Seguro de Aeronave
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
                        const dias = Math.ceil((fSeg - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'SEGURO',
                            gravedad: 'ADVERTENCIA',
                            identificador: `${a._id}-seg-warn`,
                            mensaje: `El seguro de la aeronave matrícula ${a.matricula} está próximo a vencer (${dias} días restantes).`
                        });
                    }
                }

                // Inspección de Aviónica
                if (a.vencimientoAvionica) {
                    const fAvionica = new Date(a.vencimientoAvionica);
                    if (fAvionica <= fechaActual) {
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'AVIONICA',
                            gravedad: 'CRITICO',
                            identificador: `${a._id}-av-crit`,
                            mensaje: `La inspección de aviónica de la aeronave matrícula ${a.matricula} está vencida.`
                        });
                    } else if (fAvionica <= limite30Dias) {
                        const dias = Math.ceil((fAvionica - fechaActual) / (1000 * 60 * 60 * 24));
                        alertasConcurridas.push({
                            categoria: 'AERONAVE',
                            tipo: 'AVIONICA',
                            gravedad: 'ADVERTENCIA',
                            identificador: `${a._id}-av-warn`,
                            mensaje: `La inspección de aviónica de la aeronave matrícula ${a.matricula} está próxima a vencer (${dias} días restantes).`
                        });
                    }
                }
            }

            // C) COMPONENTES CRÍTICOS (Motor / Hélice) - UMBRAL: 30 HORAS
            // VISIBLE PARA: Jefes y Oficina Técnica únicamente
            if (esMandoEstrategico || esOficinaTecnica) {
                const componentesAereos = [
                    { nombre: 'Motor', horas: a.horasRemanentesMotor },
                    { nombre: 'Hélice', horas: a.horasRemanentesHelice }
                ];

                componentesAereos.forEach(comp => {
                    if (typeof comp.horas === 'number') {
                        if (comp.horas <= 0) {
                            alertasConcurridas.push({
                                categoria: 'COMPONENTES',
                                tipo: comp.nombre.toUpperCase(),
                                gravedad: 'CRITICO',
                                identificador: `${a._id}-${comp.nombre.toLowerCase()}-crit`,
                                mensaje: `El componente (${comp.nombre}) de la aeronave matrícula ${a.matricula} está vencido (0 hs).`
                            });
                        } else if (comp.horas <= 30) { 
                            alertasConcurridas.push({
                                categoria: 'COMPONENTES',
                                tipo: comp.nombre.toUpperCase(),
                                gravedad: 'ADVERTENCIA',
                                identificador: `${a._id}-${comp.nombre.toLowerCase()}-warn`,
                                mensaje: `El componente (${comp.nombre}) de la aeronave matrícula ${a.matricula} está próximo a vencer (${comp.horas.toFixed(1)} hs restantes).`
                            });
                        }
                    }
                });
            }
        });

        // 3. Enviar respuesta consolidada en base al rol y jurisdicción
        return res.status(200).json({
            success: true,
            jurisdiccion: (['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(userRole)) ? "CONSOLIDADO GLOBAL" : userUnidad,
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