const F13 = require('../models/F13'); 
const Aeronave = require('../models/Aircraft');
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
    
    // 1. Horas del estado actual del componente
    comp.estadoActual = Number(Math.max(0, (comp.estadoActual || 0) + (hs * factor)).toFixed(2));

    // 2. Sub-renglones TSN / CSN (Horas voladas)
    if (Array.isArray(comp.tsnCsnRenglones)) {
        comp.tsnCsnRenglones.forEach(r => {
            if (r.unidad === 'H') {
                const actual = parsearHs(r.valor);
                r.valor = formatearHs(actual + (hs * factor));
            }
        });
    }

    // 3. Sub-renglones de Disponibilidades (Restan al volar, suman al hacer rollback)
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
 * 1. Obtener todos los registros de F-13 (con Populate adaptado)
 */
const getF13s = async (req, res) => {
    try {
        const registros = await F13.find()
            .populate('aeronave', 'matricula modelo sda tgPlaneadorActual motorTsn unidad')
            .populate('creadoPor', 'nombre apellido rango'); 

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
 * 2. Obtener aeronaves disponibles para el desplegable
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
 * 3. Crear y guardar un nuevo formulario F-13 (Impacto en Aircraft F-16 y Programa)
 */
const crearF13 = async (req, res) => {
    try {
        const { aeronave: idAeronave, horasDelDia } = req.body;

        const aeronaveDoc = await Aeronave.findById(idAeronave);
        if (!aeronaveDoc) {
            return res.status(404).json({
                ok: false,
                msg: 'La aeronave seleccionada no existe en el sistema.'
            });
        }

        const creadorId = req.usuarioId || (req.user && req.user._id);
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

        // A. Guardar el nuevo registro F-13
        const nuevoF13 = new F13({
            ...req.body,
            horasDelDia: hsAIncrementar,
            creadoPor: creadorId 
        });
        const f13Guardado = await nuevoF13.save();

        // B. ACTUALIZAR MODELO AIRCRAFT (F-16)
        // 1. Totales generales
        aeronaveDoc.tgPlaneadorActual = Number(((aeronaveDoc.tgPlaneadorActual || 0) + hsAIncrementar).toFixed(2));
        aeronaveDoc.motorTsn = Number(((aeronaveDoc.motorTsn || 0) + hsAIncrementar).toFixed(2));

        // 2. Componentes del Planeador
        if (Array.isArray(aeronaveDoc.compPlaneador)) {
            aeronaveDoc.compPlaneador.forEach(comp => actualizarHorasComponente(comp, hsAIncrementar));
        }

        // 3. Componentes del Grupo Motopropulsor (Motores y Hélices)
        ['motores', 'helices'].forEach(grupo => {
            if (Array.isArray(aeronaveDoc[grupo])) {
                aeronaveDoc[grupo].forEach(item => {
                    if (Array.isArray(item.componentes)) {
                        item.componentes.forEach(comp => actualizarHorasComponente(comp, hsAIncrementar));
                    }
                });
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
            msg: 'Formulario F-13 registrado exitosamente y horas impactadas en los componentes de la F-16.',
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

        await F13.findByIdAndDelete(id);

        if (horasARestar > 0) {
            // Rollback en Aircraft (F-16)
            const aeronaveDoc = await Aeronave.findById(idAeronave);
            if (aeronaveDoc) {
                aeronaveDoc.tgPlaneadorActual = Number(Math.max(0, (aeronaveDoc.tgPlaneadorActual || 0) - horasARestar).toFixed(2));
                aeronaveDoc.motorTsn = Number(Math.max(0, (aeronaveDoc.motorTsn || 0) - horasARestar).toFixed(2));

                if (Array.isArray(aeronaveDoc.compPlaneador)) {
                    aeronaveDoc.compPlaneador.forEach(comp => actualizarHorasComponente(comp, horasARestar, true));
                }

                ['motores', 'helices'].forEach(grupo => {
                    if (Array.isArray(aeronaveDoc[grupo])) {
                        aeronaveDoc[grupo].forEach(item => {
                            if (Array.isArray(item.componentes)) {
                                item.componentes.forEach(comp => actualizarHorasComponente(comp, horasARestar, true));
                            }
                        });
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
            msg: 'Formulario F-13 eliminado con éxito y horas reajustadas en la F-16.'
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