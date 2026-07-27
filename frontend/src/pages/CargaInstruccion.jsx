import React, { useState, useEffect } from 'react';
import { registrarInstruccion, getCamadaActiva, getPatronesVuelo } from '../services/api';

const NOTAS_OPCIONES = [
    { value: 'NS', label: 'NS - No Satisfactorio' },
    { value: 'S', label: 'S - Satisfactorio' },
    { value: 'SB', label: 'SB - Sobresaliente' },
    { value: 'AS', label: 'AS - Altamente Satisfactorio' }
];

const CargaInstruccion = () => {
    // -----------------------------------------------------------------
    // 1. ESTADOS: CAMADA ACTIVA Y PATRONES DE VUELO DE LA BD
    // -----------------------------------------------------------------
    const [alumnosCurso, setAlumnosCurso] = useState([]);
    const [nombreCurso, setNombreCurso] = useState('');
    const [alumnoActivoId, setAlumnoActivoId] = useState('');
    const [alumnoData, setAlumnoData] = useState(null);
    const [tabActiva, setTabActiva] = useState('vuelo');
    const [cargandoCamada, setCargandoCamada] = useState(true);

    // Estados para la cascada del Gestor de Patrones
    const [todosLosPatrones, setTodosLosPatrones] = useState([]);
    const [aeronavesDisponibles, setAeronavesDisponibles] = useState([]);
    const [agrupamientosDisponibles, setAgrupamientosDisponibles] = useState([]);
    const [codigosDisponibles, setCodigosDisponibles] = useState([]);

    // Selección en cascada
    const [aeronaveSeleccionada, setAeronaveSeleccionada] = useState('');
    const [agrupamientoSeleccionado, setAgrupamientoSeleccionado] = useState('');
    const [codigoSeleccionado, setCodigoSeleccionado] = useState('');

    // -----------------------------------------------------------------
    // 2. RECUPERAR DATOS INICIALES (CAMADA ACTIVA + PATRONES)
    // -----------------------------------------------------------------
    useEffect(() => {
        const cargarDatosIniciales = async () => {
            try {
                setCargandoCamada(true);
                // a) Cargar Camada Activa
                const resCamada = await getCamadaActiva();
                const dataCamada = resCamada.data?.data || resCamada.data || {};
                const listaAlumnos = dataCamada.alumnos || [];
                
                setAlumnosCurso(listaAlumnos);
                setNombreCurso(dataCamada.curso || 'Curso Activo');

                if (listaAlumnos.length > 0) {
                    setAlumnoActivoId(listaAlumnos[0]._id);
                    setAlumnoData(listaAlumnos[0]);
                }

                // b) Cargar Patrones de Vuelo
                const resPatrones = await getPatronesVuelo();
                const listaPatrones = resPatrones.data?.data || resPatrones.data || [];
                setTodosLosPatrones(listaPatrones);

                // Obtener tipos de aeronave únicos
                const tiposAeronaves = [...new Set(listaPatrones.map(p => p.aeronaveTipo || 'GENERAL'))];
                setAeronavesDisponibles(tiposAeronaves);

            } catch (e) {
                console.error("❌ Error al cargar datos iniciales:", e);
            } finally {
                setCargandoCamada(false);
            }
        };

        cargarDatosIniciales();
    }, []);

    // -----------------------------------------------------------------
    // 3. EFECTOS CASCADA DE PATRONES DE VUELO
    // -----------------------------------------------------------------
    // Al cambiar Aeronave/Curso -> Filtrar Agrupamientos (Nombres)
    useEffect(() => {
        if (!aeronaveSeleccionada) {
            setAgrupamientosDisponibles([]);
            setAgrupamientoSeleccionado('');
            return;
        }

        const patronesFiltrados = todosLosPatrones.filter(
            p => (p.aeronaveTipo || 'GENERAL') === aeronaveSeleccionada
        );

        const agrupamientos = [...new Set(patronesFiltrados.map(p => p.nombre))];
        setAgrupamientosDisponibles(agrupamientos);
        setAgrupamientoSeleccionado('');
        setCodigoSeleccionado('');
        setCodigosDisponibles([]);
    }, [aeronaveSeleccionada, todosLosPatrones]);

    // Al cambiar Agrupamiento -> Filtrar Códigos
    useEffect(() => {
        if (!agrupamientoSeleccionado) {
            setCodigosDisponibles([]);
            setCodigoSeleccionado('');
            return;
        }

        const codigos = todosLosPatrones.filter(
            p => (p.aeronaveTipo || 'GENERAL') === aeronaveSeleccionada && p.nombre === agrupamientoSeleccionado
        );

        setCodigosDisponibles(codigos);
        setCodigoSeleccionado('');
    }, [agrupamientoSeleccionado, aeronaveSeleccionada, todosLosPatrones]);

    // Al seleccionar Código -> Cargar Maniobras/Estándares automáticamente al Formulario
    useEffect(() => {
        if (!codigoSeleccionado) return;

        const patronEncontrado = todosLosPatrones.find(p => p._id === codigoSeleccionado || p.codigo === codigoSeleccionado);
        
        if (patronEncontrado && patronEncontrado.estandares) {
            const estandaresFormateados = patronEncontrado.estandares.map(est => ({
                estandar: est.nombre,
                descripcion: est.descripcion || '',
                nota: 'S' // Nota por defecto: Satisfactorio
            }));

            setFormVuelo(prev => ({
                ...prev,
                fase: patronEncontrado.nombre,
                codigoPatron: patronEncontrado.codigo,
                estandares: estandaresFormateados
            }));
        }
    }, [codigoSeleccionado, todosLosPatrones]);

    // Manejador para cambiar de alumno activo
    const handleAlumnoChange = (e) => {
        const id = e.target.value;
        setAlumnoActivoId(id);
        const seleccionado = alumnosCurso.find(a => String(a._id) === String(id));
        setAlumnoData(seleccionado || null);
    };

    // -----------------------------------------------------------------
    // 4. ESTADOS DE LOS FORMULARIOS
    // -----------------------------------------------------------------
    const [formVuelo, setFormVuelo] = useState({
        fecha: new Date().toISOString().split('T')[0],
        aeronaveMatricula: '',
        horasVuelo: '',
        instructorNombre: '',
        codigoPatron: '',
        calificacionGeneral: 'S', // NS - S - SB - AS
        estandares: [],
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
        informeDetallado: ''
    });

    const [formFisico, setFormFisico] = useState({
        fecha: new Date().toISOString().split('T')[0],
        periodo: 'TRIMESTRAL_1',
        calificacionGlobal: '',
        observaciones: ''
    });

    // Cambiar la nota individual de cada estándar
    const handleEstandarNotaChange = (index, nuevaNota) => {
        const nuevosEstandares = [...formVuelo.estandares];
        nuevosEstandares[index].nota = nuevaNota;
        setFormVuelo({ ...formVuelo, estandares: nuevosEstandares });
    };

    // Agregar un estándar de maniobra personalizado
    const addEstandarVuelo = () => {
        setFormVuelo({
            ...formVuelo,
            estandares: [...formVuelo.estandares, { estandar: '', descripcion: '', nota: 'S' }]
        });
    };

    // -----------------------------------------------------------------
    // 5. ENVÍO DE DATOS
    // -----------------------------------------------------------------
    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!alumnoActivoId || !alumnoData) {
            alert("⚠️ Seleccione un Alumno antes de registrar evaluaciones.");
            return;
        }

        if (tabActiva === 'vuelo' && !formVuelo.instructorNombre.trim()) {
            alert("⚠️ Debe ingresar el nombre del Instructor que realiza la evaluación.");
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

        if (tabActiva === 'vuelo') {
            payload.data = {
                ...formVuelo,
                aeronaveTipo: aeronaveSeleccionada,
                agrupamiento: agrupamientoSeleccionado
            };
        }
        if (tabActiva === 'academico') payload.data = formAcademico;
        if (tabActiva === 'psicotecnico') payload.data = formPsicotecnico;
        if (tabActiva === 'fisico') payload.data = formFisico;

        try {
            await registrarInstruccion(payload);
            alert(`✅ Ficha de [${tabActiva.toUpperCase()}] guardada exitosamente por el instructor ${formVuelo.instructorNombre}`);
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

            {/* SELECCIÓN DEL ALUMNO */}
            {cargandoCamada ? (
                <div style={styles.warningBox}>
                    ⏳ Sincronizando datos de camada y patrones con el servidor central...
                </div>
            ) : alumnosCurso.length > 0 ? (
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
                    ⚠️ No hay alumnos cargados para evaluar en el servidor. Vaya al módulo <strong>"Gestión de Alumnos"</strong>.
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

            {/* FORMULARIO DE EVALUACIÓN */}
            <form onSubmit={handleGuardar} style={styles.formCard}>
                {tabActiva === 'vuelo' && (
                    <div>
                        <h3 style={styles.sectionTitle}>✈️ Ficha de Evaluación de Vuelo</h3>
                        
                        {/* SELECCIÓN EN CASCADA DEL PATRÓN */}
                        <div style={styles.cascadaBox}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#1b2a4a' }}>
                                🎯 Selección de Curso y Patrón de Vuelo
                            </h4>
                            <div style={styles.grid3}>
                                <div>
                                    <label style={styles.miniLabel}>1. Curso / Tipo Aeronave:</label>
                                    <select 
                                        style={styles.input} 
                                        value={aeronaveSeleccionada}
                                        onChange={e => setAeronaveSeleccionada(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Seleccionar Curso / Aeronave --</option>
                                        {aeronavesDisponibles.map(aero => (
                                            <option key={aero} value={aero}>{aero}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={styles.miniLabel}>2. Agrupamiento / Misión:</label>
                                    <select 
                                        style={styles.input} 
                                        value={agrupamientoSeleccionado}
                                        onChange={e => setAgrupamientoSeleccionado(e.target.value)}
                                        disabled={!aeronaveSeleccionada}
                                        required
                                    >
                                        <option value="">-- Seleccionar Agrupamiento --</option>
                                        {agrupamientosDisponibles.map(agrup => (
                                            <option key={agrup} value={agrup}>{agrup}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={styles.miniLabel}>3. Código de Patrón:</label>
                                    <select 
                                        style={styles.input} 
                                        value={codigoSeleccionado}
                                        onChange={e => setCodigoSeleccionado(e.target.value)}
                                        disabled={!agrupamientoSeleccionado}
                                        required
                                    >
                                        <option value="">-- Seleccionar Código --</option>
                                        {codigosDisponibles.map(patron => (
                                            <option key={patron._id} value={patron._id}>
                                                [{patron.codigo}] - {patron.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* DATOS GENERALES DEL VUELO */}
                        <div style={{ ...styles.grid2, marginTop: '15px' }}>
                            <div>
                                <label style={styles.miniLabel}>Fecha de Vuelo:</label>
                                <input type="date" style={styles.input} value={formVuelo.fecha} onChange={e => setFormVuelo({...formVuelo, fecha: e.target.value})} required />
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
                                <label style={styles.miniLabel}>👨‍✈️ Instructor de Vuelo (Nombre):</label>
                                <input type="text" style={styles.input} placeholder="Cap. Juan Pérez" value={formVuelo.instructorNombre} onChange={e => setFormVuelo({...formVuelo, instructorNombre: e.target.value})} required />
                            </div>
                        </div>

                        {/* ESTÁNDARES Y MANIOBRAS A EVALUAR */}
                        <h4 style={{ ...styles.sectionTitle, marginTop: '20px', fontSize: '0.85rem' }}>
                            📊 Evaluación de Estándares / Maniobras
                        </h4>
                        
                        {formVuelo.estandares.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                Seleccione un Código de Patrón para cargar automáticamente las maniobras asociadas.
                            </p>
                        ) : (
                            formVuelo.estandares.map((est, idx) => (
                                <div key={idx} style={styles.rowEstandar}>
                                    <div style={{ flex: 3 }}>
                                        <input 
                                            type="text" 
                                            style={styles.input} 
                                            placeholder="Maniobra / Estándar"
                                            value={est.estandar} 
                                            onChange={e => {
                                                const nuevos = [...formVuelo.estandares];
                                                nuevos[idx].estandar = e.target.value;
                                                setFormVuelo({...formVuelo, estandares: nuevos});
                                            }}
                                        />
                                        {est.descripcion && (
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                                {est.descripcion}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <select 
                                            style={{ ...styles.input, fontWeight: 'bold' }} 
                                            value={est.nota}
                                            onChange={e => handleEstandarNotaChange(idx, e.target.value)}
                                        >
                                            {NOTAS_OPCIONES.map(op => (
                                                <option key={op.value} value={op.value}>{op.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))
                        )}

                        <button type="button" style={styles.btnSecondary} onClick={addEstandarVuelo}>
                            ➕ Agregar Maniobra Adicional
                        </button>

                        {/* CALIFICACIÓN FINAL Y OBSERVACIONES */}
                        <div style={{ marginTop: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <div style={styles.grid2}>
                                <div>
                                    <label style={styles.miniLabel}>🏆 CALIFICACIÓN FINAL DEL PATRÓN:</label>
                                    <select 
                                        style={{ ...styles.input, fontSize: '0.9rem', fontWeight: 'bold', color: '#1b2a4a' }} 
                                        value={formVuelo.calificacionGeneral} 
                                        onChange={e => setFormVuelo({...formVuelo, calificacionGeneral: e.target.value})}
                                    >
                                        {NOTAS_OPCIONES.map(op => (
                                            <option key={op.value} value={op.value}>{op.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.miniLabel}>Observaciones del Instructor:</label>
                                    <textarea 
                                        style={styles.textarea} 
                                        rows="2" 
                                        value={formVuelo.observacionesInstructor} 
                                        onChange={e => setFormVuelo({...formVuelo, observacionesInstructor: e.target.value})}
                                        placeholder="Comentarios sobre el desempeño o desvíos..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* OTROS MÓDULOS PERMANECEN SINO CAMBIAN */}
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
    cascadaBox: { backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' },
    input: { width: '100%', padding: '7px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '7px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'sans-serif' },
    rowEstandar: { display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' },
    btnSecondary: { backgroundColor: '#34495e', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
    actionRow: { marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '15px' },
    btnSubmit: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }
};

export default CargaInstruccion;