const F13 = require('../models/F13'); 
const AeronaveModule = require('../models/Aircraft');
// Garantiza la importación tanto si el módulo usa CommonJS como si viene de ES Modules
const Aeronave = AeronaveModule.default || AeronaveModule;
const ProgramaMantenimiento = require('../models/ProgramaMantenimiento');

/**
 * UTILS: Parseo y formateo defensivo para números (soporta comas o puntos: "150,5" o 150.5)
 */
const parsearHs = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const num = parseFloat(String(val).replace(',', '.').trim());
    return isNaN(num) ? 0 : num;
};

const formatearHs = (val) => {
    const num = Math.max(0, val);
    return Number(num.toFixed(2)).toString();
};

/**
 * Auxiliar para procesar y actualizar un componente individual de F-16 (Aircraft)
 */
const actualizarHorasComponente = (comp, hs, esRollback = false) => {
    const factor = esRollback ? -1 : 1;
    
    // 1. Horas del estado actual del componente (TSO/TSHMI/TSN)
    comp.estadoActual = Number(Math.max(0, (comp.estadoActual || 0) + (hs * factor)).toFixed(2));

    // 2. Sub-renglones TSN / CSN (Suma horas voladas)
    if (Array.isArray(comp.tsnCsnRenglones)) {
        comp.tsnCsnRenglones.forEach(r => {
            if (r.unidad === 'H') {
                const actual = parsearHs(r.valor);
                r.valor = formatearHs(actual + (hs * factor));
            }
        });
    }

    // 3. Sub-renglones de Disponibilidades (Restan al volar, suman en rollback)
    if (Array.isArray(comp.disponibilidades)) {
        comp.disponibilidades.forEach(d => {
            if (d.unidad === 'H') {
                const actual = parsearHs(d.valor);
                d.valor = formatearHs(actual - (hs * factor));
            }
        });
    }
};

/**
 * 1. Obtener todos los registros de F-13
 */
const getF13s = async (req, res) => {
    try {
        const registros = await F13.find()
            .populate('aeronave', 'matricula modelo sda tgPlaneadorActual motorTsn unidad')
            .populate('creadoPor', 'nombre apellido rango username'); 

        return res.status(200).json(registros);
    } catch (error) {
        console.error('❌ Error al obtener el historial de F-13:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al recuperar el historial de F-13.'
        });
    }
};

/**
 * 2. Obtener aeronaves disponibles para el desplegable de vuelo
 */
const getAeronavesDisponibles = async (req, res) => {
    try {
        const aeronaves = await Aeronave.find({ 
            estadoOperativo: 'E/S' 
        }).select('matricula modelo sda tgPlaneadorActual motorTsn unidad'); 

        return res.status(200).json({
            ok: true,
            aeronaves
        });
    } catch (error) {
        console.error('❌ Error al obtener aeronaves:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al recuperar las aeronaves desde la base de datos.'
        });
    }
};

/**
 * 3. Crear y guardar un nuevo formulario F-13 (Impacto directo en Aircraft F-16 y Programa si NO es histórico)
 */
const crearF13 = async (req, res) => {
    try {
        const { aeronave: idAeronave, horasDelDia, esHistorico, aterrizajes, ciclos, landings } = req.body;

        const aeronaveDoc = await Aeronave.findById(idAeronave);
        if (!aeronaveDoc) {
            return res.status(404).json({
                ok: false,
                msg: 'La aeronave seleccionada no existe en el sistema.'
            });
        }

        // Extracción flexible del ID de usuario autenticado
        const creadorId = req.usuarioId || (req.user && req.user._id) || (req.usuario && req.usuario._id);
        if (!creadorId) {
            return res.status(401).json({
                ok: false,
                msg: 'No se pudo identificar al usuario que realiza la operación.'
            });
        }

        const hsAIncrementar = Number(horasDelDia);
        if (isNaN(hsAIncrementar) || hsAIncrementar <= 0) {
            return res.status(400).json({
                ok: false,
                msg: 'Las horas del día deben ser un número mayor a 0.'
            });
        }

        const ciclosIngresados = parsearHs(ciclos || aterrizajes || landings || 0);

        // A. Guardar el nuevo registro F-13 (se guarda la marca de esHistorico)
        const nuevoF13 = new F13({
            ...req.body,
            horasDelDia: hsAIncrementar,
            esHistorico: Boolean(esHistorico),
            creadoPor: creadorId 
        });
        const f13Guardado = await nuevoF13.save();

        // 📜 SI ES HISTÓRICO: Salteamos la actualización de acumuladores en Aircraft y Programa
        if (esHistorico) {
            return res.status(201).json({
                ok: true,
                msg: 'Formulario F-13 registrado exitosamente como HISTÓRICO (sin alterar contadores actuales).',
                f13: f13Guardado
            });
        }

        // B. ACTUALIZAR MODELO AIRCRAFT (F-16) SOLO SI NO ES HISTÓRICO
        // 1. Planeador
        aeronaveDoc.tgPlaneadorActual = Number((parsearHs(aeronaveDoc.tgPlaneadorActual) + hsAIncrementar).toFixed(2));
        aeronaveDoc.tgPlaneadorLandings = Number((parsearHs(aeronaveDoc.tgPlaneadorLandings) + ciclosIngresados).toFixed(2));

        // 2. Motores
        aeronaveDoc.motorTsn = Number((parsearHs(aeronaveDoc.motorTsn) + hsAIncrementar).toFixed(2));
        aeronaveDoc.motorCsnCso = Number((parsearHs(aeronaveDoc.motorCsnCso) + ciclosIngresados).toFixed(2));

        if (aeronaveDoc.motor2Sn || aeronaveDoc.motor2Tsn !== undefined) {
            aeronaveDoc.motor2Tsn = Number((parsearHs(aeronaveDoc.motor2Tsn) + hsAIncrementar).toFixed(2));
            aeronaveDoc.motor2CsnCso = Number((parsearHs(aeronaveDoc.motor2CsnCso) + ciclosIngresados).toFixed(2));
            aeronaveDoc.markModified('motor2Tsn');
            aeronaveDoc.markModified('motor2CsnCso');
        }

        // 3. Hélices
        aeronaveDoc.helice1Tsn = Number((parsearHs(aeronaveDoc.helice1Tsn) + hsAIncrementar).toFixed(2));
        aeronaveDoc.helice1CsnCso = Number((parsearHs(aeronaveDoc.helice1CsnCso) + ciclosIngresados).toFixed(2));

        if (aeronaveDoc.helice2Sn || aeronaveDoc.helice2Tsn !== undefined) {
            aeronaveDoc.helice2Tsn = Number((parsearHs(aeronaveDoc.helice2Tsn) + hsAIncrementar).toFixed(2));
            aeronaveDoc.helice2CsnCso = Number((parsearHs(aeronaveDoc.helice2CsnCso) + ciclosIngresados).toFixed(2));
            aeronaveDoc.markModified('helice2Tsn');
            aeronaveDoc.markModified('helice2CsnCso');
        }

        aeronaveDoc.markModified('tgPlaneadorActual');
        aeronaveDoc.markModified('tgPlaneadorLandings');
        aeronaveDoc.markModified('motorTsn');
        aeronaveDoc.markModified('motorCsnCso');
        aeronaveDoc.markModified('helice1Tsn');
        aeronaveDoc.markModified('helice1CsnCso');

        // 4. Componentes del Planeador
        if (Array.isArray(aeronaveDoc.compPlaneador)) {
            aeronaveDoc.compPlaneador.forEach(comp => actualizarHorasComponente(comp, hsAIncrementar));
            aeronaveDoc.markModified('compPlaneador');
        }

        // 5. Componentes del Grupo Motopropulsor (Motores y Hélices)
        ['motores', 'helices'].forEach(grupo => {
            if (Array.isArray(aeronaveDoc[grupo])) {
                aeronaveDoc[grupo].forEach(item => {
                    if (Array.isArray(item.componentes)) {
                        item.componentes.forEach(comp => actualizarHorasComponente(comp, hsAIncrementar));
                    }
                });
                aeronaveDoc.markModified(grupo);
            }
        });

        await aeronaveDoc.save();

        // C. ACTUALIZAR PROGRAMA DE MANTENIMIENTO
        try {
            const programa = await ProgramaMantenimiento.findOne({ aeronaveId: idAeronave });
            if (programa) {
                // Sincronizar totales generales del programa
                programa.tgPlaneadorActual = formatearHs(parsearHs(programa.tgPlaneadorActual) + hsAIncrementar);
                programa.tgMotorActual = formatearHs(parsearHs(programa.tgMotorActual) + hsAIncrementar);

                // Descontar horas disponibles en los renglones de inspección
                ['programaPlaneador', 'programaMotor'].forEach(seccion => {
                    if (Array.isArray(programa[seccion])) {
                        programa[seccion].forEach(renglon => {
                            if (renglon.disp) {
                                const dispActual = parsearHs(renglon.disp);
                                renglon.disp = formatearHs(dispActual - hsAIncrementar);
                            }
                        });
                    }
                });

                await programa.save();
            }
        } catch (progErr) {
            console.error('⚠️ Advertencia: No se pudo actualizar el ProgramaMantenimiento:', progErr.message);
        }

        return res.status(201).json({
            ok: true,
            msg: 'Formulario F-13 registrado exitosamente y horas/ciclos impactados en la F-16.',
            f13: f13Guardado
        });

    } catch (error) {
        console.error('❌ Error al crear F-13:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al procesar el formulario F-13.',
            error: error.message
        });
    }
};

/**
 * 4. Eliminar F-13 con rollback en Aircraft (F-16) y Programa
 */
const eliminarF13 = async (req, res) => {
    try {
        const { id } = req.params;

        const f13AEliminar = await F13.findById(id);
        if (!f13AEliminar) {
            return res.status(404).json({
                ok: false,
                msg: 'El registro de F-13 que intenta eliminar no existe.'
            });
        }

        const idAeronave = f13AEliminar.aeronave;
        const horasARestar = Number(f13AEliminar.horasDelDia) || 0;
        const ciclosARestar = parsearHs(f13AEliminar.ciclos || f13AEliminar.aterrizajes || f13AEliminar.landings || 0);
        const eraHistorico = Boolean(f13AEliminar.esHistorico);

        await F13.findByIdAndDelete(id);

        // 📜 SI ERA HISTÓRICO: Solo se elimina el F-13 sin descontar horas/ciclos de los componentes
        if (eraHistorico) {
            return res.status(200).json({
                ok: true,
                msg: 'Formulario F-13 histórico eliminado con éxito (los contadores de la F-16 no sufrieron modificaciones).'
            });
        }

        if (horasARestar > 0 || ciclosARestar > 0) {
            // Rollback en Aircraft (F-16)
            const aeronaveDoc = await Aeronave.findById(idAeronave);
            if (aeronaveDoc) {
                aeronaveDoc.tgPlaneadorActual = Number(Math.max(0, parsearHs(aeronaveDoc.tgPlaneadorActual) - horasARestar).toFixed(2));
                aeronaveDoc.tgPlaneadorLandings = Number(Math.max(0, parsearHs(aeronaveDoc.tgPlaneadorLandings) - ciclosARestar).toFixed(2));

                aeronaveDoc.motorTsn = Number(Math.max(0, parsearHs(aeronaveDoc.motorTsn) - horasARestar).toFixed(2));
                aeronaveDoc.motorCsnCso = Number(Math.max(0, parsearHs(aeronaveDoc.motorCsnCso) - ciclosARestar).toFixed(2));

                if (aeronaveDoc.motor2Sn || aeronaveDoc.motor2Tsn !== undefined) {
                    aeronaveDoc.motor2Tsn = Number(Math.max(0, parsearHs(aeronaveDoc.motor2Tsn) - horasARestar).toFixed(2));
                    aeronaveDoc.motor2CsnCso = Number(Math.max(0, parsearHs(aeronaveDoc.motor2CsnCso) - ciclosARestar).toFixed(2));
                    aeronaveDoc.markModified('motor2Tsn');
                    aeronaveDoc.markModified('motor2CsnCso');
                }

                aeronaveDoc.helice1Tsn = Number(Math.max(0, parsearHs(aeronaveDoc.helice1Tsn) - horasARestar).toFixed(2));
                aeronaveDoc.helice1CsnCso = Number(Math.max(0, parsearHs(aeronaveDoc.helice1CsnCso) - ciclosARestar).toFixed(2));

                if (aeronaveDoc.helice2Sn || aeronaveDoc.helice2Tsn !== undefined) {
                    aeronaveDoc.helice2Tsn = Number(Math.max(0, parsearHs(aeronaveDoc.helice2Tsn) - horasARestar).toFixed(2));
                    aeronaveDoc.helice2CsnCso = Number(Math.max(0, parsearHs(aeronaveDoc.helice2CsnCso) - ciclosARestar).toFixed(2));
                    aeronaveDoc.markModified('helice2Tsn');
                    aeronaveDoc.markModified('helice2CsnCso');
                }

                aeronaveDoc.markModified('tgPlaneadorActual');
                aeronaveDoc.markModified('tgPlaneadorLandings');
                aeronaveDoc.markModified('motorTsn');
                aeronaveDoc.markModified('motorCsnCso');
                aeronaveDoc.markModified('helice1Tsn');
                aeronaveDoc.markModified('helice1CsnCso');

                if (Array.isArray(aeronaveDoc.compPlaneador)) {
                    aeronaveDoc.compPlaneador.forEach(comp => actualizarHorasComponente(comp, horasARestar, true));
                    aeronaveDoc.markModified('compPlaneador');
                }

                ['motores', 'helices'].forEach(grupo => {
                    if (Array.isArray(aeronaveDoc[grupo])) {
                        aeronaveDoc[grupo].forEach(item => {
                            if (Array.isArray(item.componentes)) {
                                item.componentes.forEach(comp => actualizarHorasComponente(comp, horasARestar, true));
                            }
                        });
                        aeronaveDoc.markModified(grupo);
                    }
                });

                await aeronaveDoc.save();
            }

            // Rollback en ProgramaMantenimiento
            try {
                const programa = await ProgramaMantenimiento.findOne({ aeronaveId: idAeronave });
                if (programa) {
                    programa.tgPlaneadorActual = formatearHs(parsearHs(programa.tgPlaneadorActual) - horasARestar);
                    programa.tgMotorActual = formatearHs(parsearHs(programa.tgMotorActual) - horasARestar);

                    ['programaPlaneador', 'programaMotor'].forEach(seccion => {
                        if (Array.isArray(programa[seccion])) {
                            programa[seccion].forEach(renglon => {
                                if (renglon.disp) {
                                    const dispActual = parsearHs(renglon.disp);
                                    renglon.disp = formatearHs(dispActual + horasARestar);
                                }
                            });
                        }
                    });

                    await programa.save();
                }
            } catch (progErr) {
                console.error('⚠️ Advertencia en rollback de ProgramaMantenimiento:', progErr.message);
            }
        }

        return res.status(200).json({
            ok: true,
            msg: 'Formulario F-13 eliminado con éxito y horas/ciclos reajustados en la F-16.'
        });

    } catch (error) {
        console.error('❌ Error al eliminar F-13:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al intentar eliminar el F-13.'
        });
    }
};

module.exports = {
    getF13s,
    getAeronavesDisponibles,
    crearF13,
    eliminarF13
};