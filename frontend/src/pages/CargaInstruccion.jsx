import React, { useState, useEffect } from 'react';
import { registrarInstruccion } from '../services/api';

const CargaInstruccion = () => {
    // -----------------------------------------------------------------
    // ESTADOS: ALUMNOS PREVIAMENTE DADOS DE ALTA
    // -----------------------------------------------------------------
    const [alumnosCurso, setAlumnosCurso] = useState([]);
    const [nombreCurso, setNombreCurso] = useState('');
    const [alumnoActivoId, setAlumnoActivoId] = useState('');
    const [alumnoData, setAlumnoData] = useState(null);
    const [tabActiva, setTabActiva] = useState('vuelo');

    // Recuperar la nómina activa que se configuró previamente en GestionAlumnos
    useEffect(() => {
        const camadaGuardada = localStorage.getItem('camadaActivaECAE');
        if (camadaGuardada) {
            try {
                const parsed = JSON.parse(camadaGuardada);
                const lista = parsed.alumnos || [];
                setAlumnosCurso(lista);
                setNombreCurso(parsed.curso || 'Curso Activo');

                if (lista.length > 0) {
                    setAlumnoActivoId(lista[0]._id);
                    setAlumnoData(lista[0]);
                }
            } catch (e) {
                console.error("Error al leer la camada guardada:", e);
            }
        }
    }, []);

    // Manejador para cambiar de alumno en la barra limpia de evaluación
    const handleAlumnoChange = (e) => {
        const id = e.target.value;
        setAlumnoActivoId(id);
        const seleccionado = alumnosCurso.find(a => String(a._id) === String(id));
        setAlumnoData(seleccionado || null);
    };

    // -----------------------------------------------------------------
    // FORMULARIOS (LIMPIOS DE DATOS MOCK)
    // -----------------------------------------------------------------
    const [formVuelo, setFormVuelo] = useState({
        fecha: new Date().toISOString().split('T')[0],
        fase: '',
        aeronaveMatricula: '',
        horasVuelo: '',
        instructorNombre: '',
        calificacionGeneral: 'SATISFACTORIO',
        estandares: [
            { estandar: 'Procedimientos de Pre-vuelo y Despegue', nota: '3' },
            { estandar: 'Mantenimiento de Altitud y Rumbo', nota: '3' }
        ],
        observacionesInstructor: ''
    });

    const [formAcademico, setFormAcademico] = useState({
        materia: 'AERODINAMICA',
        tipoEvaluacion: 'PARCIAL',
        fecha: new Date().toISOString().split('T')[0],
        nota: '',
        observaciones: ''
    });

    const [formPsicotecnico, setFormPsicotecnico] = useState({
        fechaEvaluacion: new Date().toISOString().split('T')[0],
        especialistaNombre: '',
        aptitudVuelo: 'APTO',
        atencionConcentracion: '5',
        toleranciaEstres: '5',
        tomaDecisiones: '5',
        trabajoEnEquipo: '5',
        informeDetallado: ''
    });

    const [formFisico, setFormFisico] = useState({
        fecha: new Date().toISOString().split('T')[0],
        periodo: 'TRIMESTRAL_1',
        aerobicoResistencia: '',
        flexionesBrazo: '',
        abdominales: '',
        calificacionGlobal: '',
        observaciones: ''
    });

    const addEstandarVuelo = () => {
        setFormVuelo({
            ...formVuelo,
            estandares: [...formVuelo.estandares, { estandar: '', nota: '3' }]
        });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!alumnoActivoId || !alumnoData) {
            alert("⚠️ Seleccione un Alumno antes de registrar evaluaciones.");
            return;
        }

        let payload = {
            alumnoId: alumnoActivoId,
            modulo: tabActiva,
            alumnoInfo: {
                nombre: `${alumnoData.grado || ''} ${alumnoData.apellido || ''}, ${alumnoData.nombre || ''}`.trim(),
                dni: alumnoData.dni,
                unidad: alumnoData.unidad || alumnoData.elemento
            }
        };

        if (tabActiva === 'vuelo') payload.data = formVuelo;
        if (tabActiva === 'academico') payload.data = formAcademico;
        if (tabActiva === 'psicotecnico') payload.data = formPsicotecnico;
        if (tabActiva === 'fisico') payload.data = formFisico;

        try {
            await registrarInstruccion(payload);
            alert(`✅ Registro de [${tabActiva.toUpperCase()}] guardado para ${payload.alumnoInfo.nombre}`);
        } catch (error) {
            console.error("❌ Error al guardar evaluación:", error);
            alert("⚠️ Ocurrió un error al guardar los datos en el servidor.");
        }
    };

    return (
        <div style={styles.container}>
            {/* ENCABEZADO */}
            <div style={styles.header}>
                <h2 style={styles.title}>🎓 ESCUELA DE AVIACIÓN DE EJÉRCITO — CARGA DE EVALUACIONES</h2>
            </div>

            {/* SELECCIÓN LIMPIA DEL ALUMNO A EVALUAR */}
            {alumnosCurso.length > 0 ? (
                <div style={styles.selectorBar}>
                    <div style={{ flex: 1 }}>
                        <label style={styles.label}>SELECCIONAR ALUMNO A EVALUAR ({nombreCurso}):</label>
                        <select 
                            style={styles.selectAlumno} 
                            value={alumnoActivoId} 
                            onChange={handleAlumnoChange}
                        >
                            {alumnosCurso.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.grado} {a.apellido}, {a.nombre} {a.dni ? `(DNI: ${a.dni})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {alumnoData && (
                        <div style={styles.summaryBadge}>
                            <div><strong>Elemento:</strong> {alumnoData.elemento || alumnoData.unidad}</div>
                            <div><strong>Especialidad:</strong> {alumnoData.funcion || alumnoData.especialidad || 'Alumno'}</div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={styles.warningBox}>
                    ⚠️ No hay alumnos cargados para evaluar. Vaya al módulo <strong>"Gestión de Alumnos"</strong> para dar de alta o cargar la nómina del curso.
                </div>
            )}

            {/* SOLAPAS DE EVALUACIÓN */}
            <div style={styles.tabsContainer}>
                <button 
                    type="button"
                    style={tabActiva === 'vuelo' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('vuelo')}
                >
                    ✈️ Ficha de Vuelo
                </button>
                <button 
                    type="button"
                    style={tabActiva === 'academico' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('academico')}
                >
                    📚 Académico / Materias
                </button>
                <button 
                    type="button"
                    style={tabActiva === 'psicotecnico' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('psicotecnico')}
                >
                    🧠 Psicotécnico
                </button>
                <button 
                    type="button"
                    style={tabActiva === 'fisico' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('fisico')}
                >
                    🏋️ Adiestramiento Físico
                </button>
            </div>

            {/* FORMULARIO */}
            <form onSubmit={handleGuardar} style={styles.formCard}>
                {tabActiva === 'vuelo' && (
                    <div>
                        <h3 style={styles.sectionTitle}>✈️ Ficha de Vuelo de Instrucción</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Fecha de Vuelo:</label>
                                <input type="date" style={styles.input} value={formVuelo.fecha} onChange={e => setFormVuelo({...formVuelo, fecha: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Fase / Misión:</label>
                                <input type="text" style={styles.input} placeholder="Ej: Vuelo Táctico Nocturno" value={formVuelo.fase} onChange={e => setFormVuelo({...formVuelo, fase: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Aeronave (Matrícula):</label>
                                <input type="text" style={styles.input} placeholder="Ej: AE-452" value={formVuelo.aeronaveMatricula} onChange={e => setFormVuelo({...formVuelo, aeronaveMatricula: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Horas Voladas:</label>
                                <input type="text" style={styles.input} placeholder="Ej: 1.5" value={formVuelo.horasVuelo} onChange={e => setFormVuelo({...formVuelo, horasVuelo: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Instructor:</label>
                                <input type="text" style={styles.input} placeholder="Nombre del Instructor" value={formVuelo.instructorNombre} onChange={e => setFormVuelo({...formVuelo, instructorNombre: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Calificación General:</label>
                                <select style={styles.input} value={formVuelo.calificacionGeneral} onChange={e => setFormVuelo({...formVuelo, calificacionGeneral: e.target.value})}>
                                    <option value="SOBRESALIENTE">⭐ Sobresaliente (5)</option>
                                    <option value="SATISFACTORIO">✔️ Satisfactorio (4-3)</option>
                                    <option value="NO_SATISFACTORIO">❌ No Satisfactorio (1-2)</option>
                                </select>
                            </div>
                        </div>

                        <h4 style={{ ...styles.sectionTitle, marginTop: '20px', fontSize: '0.85rem' }}>Estándares Evaluados</h4>
                        {formVuelo.estandares.map((est, idx) => (
                            <div key={idx} style={styles.rowEstandar}>
                                <input 
                                    type="text" 
                                    style={{ ...styles.input, flex: 1 }} 
                                    placeholder="Maniobra / Estándar"
                                    value={est.estandar} 
                                    onChange={e => {
                                        const nuevos = [...formVuelo.estandares];
                                        nuevos[idx].estandar = e.target.value;
                                        setFormVuelo({...formVuelo, estandares: nuevos});
                                    }}
                                />
                                <select 
                                    style={{ ...styles.input, width: '150px' }} 
                                    value={est.nota}
                                    onChange={e => {
                                        const nuevos = [...formVuelo.estandares];
                                        nuevos[idx].nota = e.target.value;
                                        setFormVuelo({...formVuelo, estandares: nuevos});
                                    }}
                                >
                                    <option value="5">5 - Sobresaliente</option>
                                    <option value="4">4 - Bueno</option>
                                    <option value="3">3 - Satisfactorio</option>
                                    <option value="2">2 - Marginal</option>
                                    <option value="1">1 - Insatisfactorio</option>
                                </select>
                            </div>
                        ))}
                        <button type="button" style={styles.btnSecondary} onClick={addEstandarVuelo}>➕ Agregar Maniobra</button>

                        <div style={{ marginTop: '15px' }}>
                            <label style={styles.miniLabel}>Observaciones:</label>
                            <textarea style={styles.textarea} rows="3" value={formVuelo.observacionesInstructor} onChange={e => setFormVuelo({...formVuelo, observacionesInstructor: e.target.value})}></textarea>
                        </div>
                    </div>
                )}

                {tabActiva === 'academico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>📚 Notas Académicas</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Materia / Asignatura:</label>
                                <select style={styles.input} value={formAcademico.materia} onChange={e => setFormAcademico({...formAcademico, materia: e.target.value})}>
                                    <option value="AERODINAMICA">Aerodinámica y Performance</option>
                                    <option value="NAVEGACION">Navegación Aérea y Cartografía</option>
                                    <option value="METEOROLOGIA">Meteorología Aeronáutica</option>
                                    <option value="REGLAMENTACION">Reglamentación y Tránsito Aéreo</option>
                                    <option value="MOTORES_SISTEMAS">Sistemas de la Aeronave</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Tipo de Evaluación:</label>
                                <select style={styles.input} value={formAcademico.tipoEvaluacion} onChange={e => setFormAcademico({...formAcademico, tipoEvaluacion: e.target.value})}>
                                    <option value="TP">Trabajo Práctico</option>
                                    <option value="PARCIAL">Examen Parcial</option>
                                    <option value="FINAL">Examen Final</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Fecha:</label>
                                <input type="date" style={styles.input} value={formAcademico.fecha} onChange={e => setFormAcademico({...formAcademico, fecha: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Nota (1 - 10):</label>
                                <input type="number" min="1" max="10" step="0.1" style={styles.input} value={formAcademico.nota} onChange={e => setFormAcademico({...formAcademico, nota: e.target.value})} required />
                            </div>
                        </div>
                    </div>
                )}

                {tabActiva === 'psicotecnico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>🧠 Evaluación Psicotécnica</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Fecha:</label>
                                <input type="date" style={styles.input} value={formPsicotecnico.fechaEvaluacion} onChange={e => setFormPsicotecnico({...formPsicotecnico, fechaEvaluacion: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Especialista / Licenciado:</label>
                                <input type="text" style={styles.input} value={formPsicotecnico.especialistaNombre} onChange={e => setFormPsicotecnico({...formPsicotecnico, especialistaNombre: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Dictamen:</label>
                                <select style={styles.input} value={formPsicotecnico.aptitudVuelo} onChange={e => setFormPsicotecnico({...formPsicotecnico, aptitudVuelo: e.target.value})}>
                                    <option value="APTO">🟢 APTO PARA EL VUELO</option>
                                    <option value="APTO_CON_RESERVAS">🟡 APTO CON RESERVAS</option>
                                    <option value="NO_APTO">🔴 NO APTO TEMPORAL</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {tabActiva === 'fisico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>🏋️ Adiestramiento Físico Militar</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Fecha:</label>
                                <input type="date" style={styles.input} value={formFisico.fecha} onChange={e => setFormFisico({...formFisico, fecha: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Calificación Global Final:</label>
                                <input type="number" min="1" max="10" step="0.1" style={styles.input} value={formFisico.calificacionGlobal} onChange={e => setFormFisico({...formFisico, calificacionGlobal: e.target.value})} required />
                            </div>
                        </div>
                    </div>
                )}

                <div style={styles.actionRow}>
                    <button type="submit" style={styles.btnSubmit} disabled={!alumnoActivoId}>
                        💾 GUARDAR EVALUACIÓN DE {tabActiva.toUpperCase()}
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles = {
    container: { padding: '15px 25px', fontFamily: 'monospace, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    header: { backgroundColor: '#1b2a4a', padding: '12px 20px', borderRadius: '4px', marginBottom: '15px' },
    title: { color: '#fff', fontSize: '1rem', margin: 0, fontWeight: 'bold' },
    selectorBar: { background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #dcdfe6', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' },
    warningBox: { background: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #ffeeba', fontSize: '0.85rem' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#1b2a4a' },
    miniLabel: { fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#34495e' },
    selectAlumno: { width: '100%', padding: '8px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #1b2a4a', borderRadius: '4px' },
    summaryBadge: { background: '#f8fafc', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' },
    tabsContainer: { display: 'flex', gap: '5px', marginBottom: '0px' },
    tabActive: { background: '#fff', border: '1px solid #dcdfe6', borderBottom: 'none', padding: '10px 18px', fontWeight: 'bold', color: '#1b2a4a', cursor: 'pointer', borderRadius: '4px 4px 0 0', borderTop: '3px solid #1b2a4a' },
    tabInactive: { background: '#e2e8f0', border: '1px solid #dcdfe6', padding: '10px 18px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', borderRadius: '4px 4px 0 0' },
    formCard: { background: '#fff', padding: '20px', border: '1px solid #dcdfe6', borderRadius: '0 0 4px 4px' },
    sectionTitle: { fontSize: '0.9rem', color: '#1b2a4a', borderBottom: '2px solid #e2e8f0', paddingBottom: '5px', marginBottom: '15px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
    input: { width: '100%', padding: '7px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '7px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'sans-serif' },
    rowEstandar: { display: 'flex', gap: '10px', marginBottom: '8px' },
    btnSecondary: { backgroundColor: '#34495e', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
    actionRow: { marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '15px' },
    btnSubmit: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }
};

export default CargaInstruccion;