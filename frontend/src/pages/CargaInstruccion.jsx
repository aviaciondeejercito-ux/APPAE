import React, { useState, useEffect } from 'react';
// Importamos getTripulantes o la función API existente para obtener la lista
// import { getTripulantes } from '../services/api';

const CargaInstruccion = () => {
    // -----------------------------------------------------------------
    // ESTADOS DE SELECCIÓN DE TRIPULANTE Y PESTAÑAS
    // -----------------------------------------------------------------
    const [tripulantes, setTripulantes] = useState([]);
    const [tripulanteSeleccionadoId, setTripulanteSeleccionadoId] = useState('');
    const [tripulanteData, setTripulanteData] = useState(null);
    const [tabActiva, setTabActiva] = useState('vuelo'); // 'vuelo' | 'academico' | 'psicotecnico' | 'fisico'

    // Mock de tripulantes alumnos para previsualizar si aún no está conectada la API
    useEffect(() => {
        // Reemplazar por la llamada a la API real:
        /*
        getTripulantes().then(res => {
            setTripulantes(res.data);
        });
        */
        setTripulantes([
            { id: '1', nombre: 'Tte. Juan Pérez', dni: '35123456', curso: 'Piloto de Aviación de Ejército', horasTotales: '320.5' },
            { id: '2', nombre: 'Subtte. María González', dni: '38987654', curso: 'Piloto de Aviación de Ejército', horasTotales: '185.0' },
            { id: '3', nombre: 'Sarg. Carlos Rodríguez', dni: '33456789', curso: 'Mecánico de Navegación', horasTotales: '510.2' },
        ]);
    }, []);

    // -----------------------------------------------------------------
    // FORMULARIO 1: FICHA DE INSTRUCCIÓN DE VUELO
    // -----------------------------------------------------------------
    const [formVuelo, setFormVuelo] = useState({
        fecha: new Date().toISOString().split('T')[0],
        fase: 'MANIOBRAS_BASICAS', // E.g., Vuelo Nocturno, Táctico, Emergencias
        aeronaveMatricula: '',
        horasVuelo: '',
        instructorNombre: '',
        calificacionGeneral: 'SATISFACTORIO', // SOBRESALIENTE, SATISFACTORIO, NO_SATISFACTORIO
        estandares: [
            { estandar: 'Procedimientos de Pre-vuelo y Despegue', nota: '4' },
            { estandar: 'Mantenimiento de Altitud y Rumbo', nota: '3' },
            { estandar: 'Procedimiento de Falla de Motor / Emergencia', nota: '3' },
            { estandar: 'Aterrizaje y Viento Cruzado', nota: '4' }
        ],
        observacionesInstructor: ''
    });

    // -----------------------------------------------------------------
    // FORMULARIO 2: ACADÉMICO / MATERIAS
    // -----------------------------------------------------------------
    const [formAcademico, setFormAcademico] = useState({
        materia: 'AERODINAMICA',
        tipoEvaluacion: 'PARCIAL', // TP, PARCIAL, FINAL, RECUPERATORIO
        fecha: new Date().toISOString().split('T')[0],
        nota: '',
        observaciones: ''
    });

    // -----------------------------------------------------------------
    // FORMULARIO 3: DESGLOSE PSICOTÉCNICO
    // -----------------------------------------------------------------
    const [formPsicotecnico, setFormPsicotecnico] = useState({
        fechaEvaluacion: new Date().toISOString().split('T')[0],
        especialistaNombre: '',
        aptitudVuelo: 'APTO', // APTO, APTO_CON_RESERVAS, NO_APTO
        atencionConcentracion: '8', // 1 al 10
        toleranciaEstres: '7',
        tomaDecisiones: '8',
        trabajoEnEquipo: '9',
        estabilidadEmocional: '8',
        informeDetallado: ''
    });

    // -----------------------------------------------------------------
    // FORMULARIO 4: ADIESTRAMIENTO FÍSICO MILITAR
    // -----------------------------------------------------------------
    const [formFisico, setFormFisico] = useState({
        fecha: new Date().toISOString().split('T')[0],
        periodo: 'TRIMESTRAL_1',
        aerobicoResistencia: '', // Nota o tiempo (ej: 12 min)
        flexionesBrazo: '',
        abdominales: '',
        natacionMilitar: '',
        calificacionGlobal: '',
        observaciones: ''
    });

    // Manejador de selección de Alumno
    const handleTripulanteChange = (e) => {
        const id = e.target.value;
        setTripulanteSeleccionadoId(id);
        const seleccionado = tripulantes.find(t => String(t.id) === String(id));
        setTripulanteData(seleccionado || null);
    };

    // Agregar nuevo estándar en vuelo
    const addEstandarVuelo = () => {
        setFormVuelo({
            ...formVuelo,
            estandares: [...formVuelo.estandares, { estandar: '', nota: '3' }]
        });
    };

    // Manejadores de Guardado
    const handleGuardar = (e) => {
        e.preventDefault();
        if (!tripulanteSeleccionadoId) {
            alert("⚠️ Seleccione un Tripulante Alumno antes de guardar.");
            return;
        }

        let payload = {
            tripulanteId: tripulanteSeleccionadoId,
            modulo: tabActiva,
        };

        if (tabActiva === 'vuelo') payload.data = formVuelo;
        if (tabActiva === 'academico') payload.data = formAcademico;
        if (tabActiva === 'psicotecnico') payload.data = formPsicotecnico;
        if (tabActiva === 'fisico') payload.data = formFisico;

        console.log("💾 Registrando datos de instrucción:", payload);
        alert(`✅ Evaluación de [${tabActiva.toUpperCase()}] guardada correctamente para ${tripulanteData.nombre}`);
    };

    return (
        <div style={styles.container}>
            {/* ENCABEZADO */}
            <div style={styles.header}>
                <h2 style={styles.title}>🎓 ESCUELA DE AVIACIÓN — CARGA DE INSTRUCCIÓN</h2>
            </div>

            {/* BARRA SUPERIOR: SELECCIÓN DEL TRIPULANTE ALUMNO */}
            <div style={styles.selectorBar}>
                <div style={{ flex: 1 }}>
                    <label style={styles.label}>SELECCIONAR TRIPULANTE / ALUMNO:</label>
                    <select 
                        style={styles.selectTripulante} 
                        value={tripulanteSeleccionadoId} 
                        onChange={handleTripulanteChange}
                    >
                        <option value="">-- Seleccione un alumno de la lista --</option>
                        {tripulantes.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.nombre} (DNI: {t.dni}) - {t.curso}
                            </option>
                        ))}
                    </select>
                </div>

                {tripulanteData && (
                    <div style={styles.summaryBadge}>
                        <div><strong>Curso:</strong> {tripulanteData.curso}</div>
                        <div><strong>Horas Totales:</strong> <span style={{ color: '#27ae60' }}>{tripulanteData.horasTotales} Hs</span></div>
                    </div>
                )}
            </div>

            {/* MENÚ DE NAVEGACIÓN DE SOLAPAS (TABS) */}
            <div style={styles.tabsContainer}>
                <button 
                    style={tabActiva === 'vuelo' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('vuelo')}
                >
                    ✈️ Ficha de Vuelo
                </button>
                <button 
                    style={tabActiva === 'academico' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('academico')}
                >
                    📚 Académico / Materias
                </button>
                <button 
                    style={tabActiva === 'psicotecnico' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('psicotecnico')}
                >
                    🧠 Psicotécnico
                </button>
                <button 
                    style={tabActiva === 'fisico' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setTabActiva('fisico')}
                >
                    🏋️ Adiestramiento Físico
                </button>
            </div>

            {/* FORMULARIO CONTENEDOR SEGÚN LA SOLAPA SELECCIONADA */}
            <form onSubmit={handleGuardar} style={styles.formCard}>

                {/* ------------------------------------------------------------- */}
                {/* 1. SOLAPA: FICHA DE VUELO                                    */}
                {/* ------------------------------------------------------------- */}
                {tabActiva === 'vuelo' && (
                    <div>
                        <h3 style={styles.sectionTitle}>✈️ Carga de Ficha de Vuelo de Instrucción</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Fecha de Vuelo:</label>
                                <input type="date" style={styles.input} value={formVuelo.fecha} onChange={e => setFormVuelo({...formVuelo, fecha: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Fase / Misión:</label>
                                <input type="text" style={styles.input} placeholder="Ej: Vuelo Táctico Noctuo / Emergencias" value={formVuelo.fase} onChange={e => setFormVuelo({...formVuelo, fase: e.target.value})} required />
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
                                <label style={styles.miniLabel}>Instructor a Cargo:</label>
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

                        <h4 style={{ ...styles.sectionTitle, marginTop: '20px', fontSize: '0.85rem' }}>Estándares de Vuelo Evaluados</h4>
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
                                    style={{ ...styles.input, width: '120px' }} 
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
                        <button type="button" style={styles.btnSecondary} onClick={addEstandarVuelo}>➕ Agregar Maniobra/Estándar</button>

                        <div style={{ marginTop: '15px' }}>
                            <label style={styles.miniLabel}>Observaciones del Instructor:</label>
                            <textarea style={styles.textarea} rows="3" value={formVuelo.observacionesInstructor} onChange={e => setFormVuelo({...formVuelo, observacionesInstructor: e.target.value})} placeholder="Detalle aspectos a corregir o destacar..."></textarea>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 2. SOLAPA: ACADÉMICO / MATERIAS                              */}
                {/* ------------------------------------------------------------- */}
                {tabActiva === 'academico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>📚 Carga de Notas Académicas</h3>
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
                                    <option value="RECUPERATORIO">Recuperatorio</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Fecha:</label>
                                <input type="date" style={styles.input} value={formAcademico.fecha} onChange={e => setFormAcademico({...formAcademico, fecha: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Nota Calificación (1 - 10):</label>
                                <input type="number" min="1" max="10" step="0.1" style={styles.input} placeholder="Ej: 8.5" value={formAcademico.nota} onChange={e => setFormAcademico({...formAcademico, nota: e.target.value})} required />
                            </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <label style={styles.miniLabel}>Observaciones Docente:</label>
                            <textarea style={styles.textarea} rows="3" value={formAcademico.observaciones} onChange={e => setFormAcademico({...formAcademico, observaciones: e.target.value})} placeholder="Comentarios sobre el examen..."></textarea>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3. SOLAPA: PSICOTÉCNICO                                      */}
                {/* ------------------------------------------------------------- */}
                {tabActiva === 'psicotecnico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>🧠 Evaluación Psicotécnica (Especialista)</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Fecha de Evaluación:</label>
                                <input type="date" style={styles.input} value={formPsicotecnico.fechaEvaluacion} onChange={e => setFormPsicotecnico({...formPsicotecnico, fechaEvaluacion: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Especialista / Licenciado:</label>
                                <input type="text" style={styles.input} placeholder="Nombre del Profesional" value={formPsicotecnico.especialistaNombre} onChange={e => setFormPsicotecnico({...formPsicotecnico, especialistaNombre: e.target.value})} required />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={styles.miniLabel}>Dictamen de Aptitud:</label>
                                <select style={{ ...styles.input, fontWeight: 'bold' }} value={formPsicotecnico.aptitudVuelo} onChange={e => setFormPsicotecnico({...formPsicotecnico, aptitudVuelo: e.target.value})}>
                                    <option value="APTO">🟢 APTO PARA EL VUELO</option>
                                    <option value="APTO_CON_RESERVAS">🟡 APTO CON RESERVAS / SEGUIMIENTO</option>
                                    <option value="NO_APTO">🔴 NO APTO TEMPORAL</option>
                                </select>
                            </div>
                        </div>

                        <h4 style={{ ...styles.sectionTitle, marginTop: '20px', fontSize: '0.85rem' }}>Puntaje por Métricas (1 al 10)</h4>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Atención y Concentración:</label>
                                <input type="number" min="1" max="10" style={styles.input} value={formPsicotecnico.atencionConcentracion} onChange={e => setFormPsicotecnico({...formPsicotecnico, atencionConcentracion: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Tolerancia al Estrés:</label>
                                <input type="number" min="1" max="10" style={styles.input} value={formPsicotecnico.toleranciaEstres} onChange={e => setFormPsicotecnico({...formPsicotecnico, toleranciaEstres: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Toma de Decisiones:</label>
                                <input type="number" min="1" max="10" style={styles.input} value={formPsicotecnico.tomaDecisiones} onChange={e => setFormPsicotecnico({...formPsicotecnico, tomaDecisiones: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Trabajo en Equipo:</label>
                                <input type="number" min="1" max="10" style={styles.input} value={formPsicotecnico.trabajoEnEquipo} onChange={e => setFormPsicotecnico({...formPsicotecnico, trabajoEnEquipo: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <label style={styles.miniLabel}>Informe Detallado Psicológico:</label>
                            <textarea style={styles.textarea} rows="4" value={formPsicotecnico.informeDetallado} onChange={e => setFormPsicotecnico({...formPsicotecnico, informeDetallado: e.target.value})} placeholder="Perfil conceptual, fortaleza emocional, observaciones socio-afectivas..."></textarea>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 4. SOLAPA: ADIESTRAMIENTO FÍSICO MILITAR                    */}
                {/* ------------------------------------------------------------- */}
                {tabActiva === 'fisico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>🏋️ Evaluación de Adiestramiento Físico Militar</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Fecha:</label>
                                <input type="date" style={styles.input} value={formFisico.fecha} onChange={e => setFormFisico({...formFisico, fecha: e.target.value})} required />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Período / Trimestre:</label>
                                <select style={styles.input} value={formFisico.periodo} onChange={e => setFormFisico({...formFisico, periodo: e.target.value})}>
                                    <option value="TRIMESTRAL_1">1° Trimestre</option>
                                    <option value="TRIMESTRAL_2">2° Trimestre</option>
                                    <option value="TRIMESTRAL_3">3° Trimestre</option>
                                    <option value="ANUAL">Examen Anual</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Resistencia Aeróbica (Marca / Nota):</label>
                                <input type="text" style={styles.input} placeholder="Ej: 2400m / Nota 8" value={formFisico.aerobicoResistencia} onChange={e => setFormFisico({...formFisico, aerobicoResistencia: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Flexiones de Brazo (Cantidad / Nota):</label>
                                <input type="text" style={styles.input} placeholder="Ej: 45 rep / Nota 9" value={formFisico.flexionesBrazo} onChange={e => setFormFisico({...formFisico, flexionesBrazo: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Abdominales (Cantidad / Nota):</label>
                                <input type="text" style={styles.input} placeholder="Ej: 50 rep / Nota 9" value={formFisico.abdominales} onChange={e => setFormFisico({...formFisico, abdominales: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Calificación Global Final:</label>
                                <input type="number" min="1" max="10" step="0.1" style={{ ...styles.input, fontWeight: 'bold' }} placeholder="Ej: 9.0" value={formFisico.calificacionGlobal} onChange={e => setFormFisico({...formFisico, calificacionGlobal: e.target.value})} required />
                            </div>
                        </div>
                    </div>
                )}

                {/* BOTÓN DE GUARDADO GENERAL */}
                <div style={styles.actionRow}>
                    <button type="submit" style={styles.btnSubmit} disabled={!tripulanteSeleccionadoId}>
                        💾 GUARDAR REGISTRO DE {tabActiva.toUpperCase()}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ESTILOS DE LA INTERFAZ
const styles = {
    container: { padding: '15px 25px', fontFamily: 'monospace, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    header: { backgroundColor: '#1b2a4a', padding: '12px 20px', borderRadius: '4px', marginBottom: '15px' },
    title: { color: '#fff', fontSize: '1rem', margin: 0, fontWeight: 'bold' },
    selectorBar: { background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #dcdfe6', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#2c3e50' },
    miniLabel: { fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#34495e' },
    selectTripulante: { width: '100%', padding: '8px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #1b2a4a', borderRadius: '4px' },
    summaryBadge: { background: '#eef2f5', padding: '10px 15px', borderRadius: '4px', borderLeft: '4px solid #1b2a4a', fontSize: '0.8rem' },
    tabsContainer: { display: 'flex', gap: '5px', marginBottom: '0px' },
    tabActive: { background: '#fff', border: '1px solid #dcdfe6', borderBottom: 'none', padding: '10px 18px', fontWeight: 'bold', color: '#1b2a4a', cursor: 'pointer', borderRadius: '4px 4px 0 0', borderTop: '3px solid #1b2a4a' },
    tabInactive: { background: '#e2e8f0', border: '1px solid #dcdfe6', padding: '10px 18px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', borderRadius: '4px 4px 0 0' },
    formCard: { background: '#fff', padding: '20px', border: '1px solid #dcdfe6', borderRadius: '0 0 4px 4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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