import React, { useState, useEffect } from 'react';
import { registrarInstruccion, getCamadaActiva, getPatronesVuelo, getTripulantes } from '../services/api';

const NOTAS_OPCIONES = [
    { value: 'NS', label: 'NS', color: '#e74c3c' },
    { value: 'S', label: 'S', color: '#27ae60' },
    { value: 'SB', label: 'SB', color: '#2980b9' },
    { value: 'AS', label: 'AS', color: '#8e44ad' }
];

const CargaInstruccion = () => {
    // -----------------------------------------------------------------
    // ESTADOS GENERALES
    // -----------------------------------------------------------------
    const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
    const [nombreCurso, setNombreCurso] = useState('');
    const [alumnoActivoId, setAlumnoActivoId] = useState('');
    const [alumnoData, setAlumnoData] = useState(null);
    const [tabActiva, setTabActiva] = useState('vuelo');
    const [cargandoDatos, setCargandoDatos] = useState(true);

    // Cascadas de patrones
    const [todosLosPatrones, setTodosLosPatrones] = useState([]);
    const [aeronavesDisponibles, setAeronavesDisponibles] = useState([]);
    const [agrupamientosDisponibles, setAgrupamientosDisponibles] = useState([]);
    const [codigosDisponibles, setCodigosDisponibles] = useState([]);

    const [aeronaveSeleccionada, setAeronaveSeleccionada] = useState('');
    const [agrupamientoSeleccionado, setAgrupamientoSeleccionado] = useState('');
    const [codigoSeleccionado, setCodigoSeleccionado] = useState('');

    // Formulario Simplificado de Vuelo
    const [formVuelo, setFormVuelo] = useState({
        instructorNombre: '',
        calificacionGeneral: 'S',
        estandares: [],
        observacionesInstructor: ''
    });

    const [formAcademico, setFormAcademico] = useState({ materia: 'AERODINAMICA', tipoEvaluacion: 'PARCIAL', fecha: new Date().toISOString().split('T')[0], nota: '', observaciones: '' });
    const [formPsicotecnico, setFormPsicotecnico] = useState({ fechaEvaluacion: new Date().toISOString().split('T')[0], especialistaNombre: '', aptitudVuelo: 'APTO', informeDetallado: '' });
    const [formFisico, setFormFisico] = useState({ fecha: new Date().toISOString().split('T')[0], periodo: 'TRIMESTRAL_1', calificacionGlobal: '', observaciones: '' });

    // -----------------------------------------------------------------
    // CARGAR TRIPULANTES (ALUMNOS) Y PATRONES DE VUELO
    // -----------------------------------------------------------------
    useEffect(() => {
        const cargarTodo = async () => {
            try {
                setCargandoDatos(true);
                
                // 1. Cargar Camada Activa (si existe)
                let listaAlumnosCamada = [];
                try {
                    const resCamada = await getCamadaActiva();
                    const dataCamada = resCamada.data?.data || resCamada.data || {};
                    listaAlumnosCamada = dataCamada.alumnos || [];
                    if (dataCamada.curso) setNombreCurso(dataCamada.curso);
                } catch (e) {
                    console.warn("⚠️ No se encontró camada activa activa.");
                }

                // 2. Cargar Tripulantes Totales desde el Backend
                let listaTripulantes = [];
                try {
                    const resTrip = await getTripulantes();
                    listaTripulantes = resTrip.data?.data || resTrip.data || [];
                } catch (e) {
                    console.warn("⚠️ Error al obtener tripulantes globales.");
                }

                // Filtrar Tripulantes con rol/función de "Alumno" o los que estén en la Camada
                const alumnosGlobales = listaTripulantes.filter(t => 
                    (t.funcion && t.funcion.toUpperCase().includes('ALUMNO')) ||
                    (t.especialidad && t.especialidad.toUpperCase().includes('ALUMNO')) ||
                    (t.rol && t.rol.toUpperCase().includes('ALUMNO'))
                );

                // Unificar sin duplicados (Prioriza la lista si no hay filtro estricto)
                const mapaAlumnos = new Map();
                [...listaAlumnosCamada, ...alumnosGlobales, ...listaTripulantes].forEach(a => {
                    if (a._id && !mapaAlumnos.has(String(a._id))) {
                        mapaAlumnos.set(String(a._id), a);
                    }
                });

                const listaFinalAlumnos = Array.from(mapaAlumnos.values());
                setAlumnosDisponibles(listaFinalAlumnos);

                if (listaFinalAlumnos.length > 0) {
                    setAlumnoActivoId(listaFinalAlumnos[0]._id);
                    setAlumnoData(listaFinalAlumnos[0]);
                }

                // 3. Cargar Patrones de Vuelo
                const resPatrones = await getPatronesVuelo();
                const listaPatrones = resPatrones.data?.data || resPatrones.data || [];
                setTodosLosPatrones(listaPatrones);

                const tiposAeronaves = [...new Set(listaPatrones.map(p => p.aeronaveTipo || 'GENERAL'))];
                setAeronavesDisponibles(tiposAeronaves);

            } catch (e) {
                console.error("❌ Error en carga inicial:", e);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarTodo();
    }, []);

    // -----------------------------------------------------------------
    // CASCADA DE PATRONES DE VUELO
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!aeronaveSeleccionada) {
            setAgrupamientosDisponibles([]);
            setAgrupamientoSeleccionado('');
            return;
        }
        const filtrados = todosLosPatrones.filter(p => (p.aeronaveTipo || 'GENERAL') === aeronaveSeleccionada);
        setAgrupamientosDisponibles([...new Set(filtrados.map(p => p.nombre))]);
        setAgrupamientoSeleccionado('');
        setCodigoSeleccionado('');
        setCodigosDisponibles([]);
    }, [aeronaveSeleccionada, todosLosPatrones]);

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

    // MANIOBRAS AUTOMÁTICAS AL SELECCIONAR EL CÓDIGO
    useEffect(() => {
        if (!codigoSeleccionado) {
            setFormVuelo(prev => ({ ...prev, estandares: [] }));
            return;
        }

        const patron = todosLosPatrones.find(p => p._id === codigoSeleccionado || p.codigo === codigoSeleccionado);
        
        if (patron && patron.estandares) {
            const estandaresCargados = patron.estandares.map(est => ({
                estandar: est.nombre,
                nota: 'S'
            }));

            setFormVuelo(prev => ({
                ...prev,
                estandares: estandaresCargados
            }));
        }
    }, [codigoSeleccionado, todosLosPatrones]);

    const handleAlumnoChange = (e) => {
        const id = e.target.value;
        setAlumnoActivoId(id);
        setAlumnoData(alumnosDisponibles.find(a => String(a._id) === String(id)) || null);
    };

    const setNotaManiobra = (index, nota) => {
        const nuevosEstandares = [...formVuelo.estandares];
        nuevosEstandares[index].nota = nota;
        setFormVuelo({ ...formVuelo, estandares: nuevosEstandares });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!alumnoActivoId || !alumnoData) {
            alert("⚠️ Seleccione un Alumno antes de guardar.");
            return;
        }

        if (tabActiva === 'vuelo') {
            if (!codigoSeleccionado) {
                alert("⚠️ Seleccione un Patrón de Vuelo.");
                return;
            }
            if (!formVuelo.instructorNombre.trim()) {
                alert("⚠️ Ingrese el nombre del Instructor de Vuelo.");
                return;
            }
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
                agrupamiento: agrupamientoSeleccionado,
                codigoPatron: codigoSeleccionado,
                fecha: new Date().toISOString().split('T')[0]
            };
        }
        if (tabActiva === 'academico') payload.data = formAcademico;
        if (tabActiva === 'psicotecnico') payload.data = formPsicotecnico;
        if (tabActiva === 'fisico') payload.data = formFisico;

        try {
            await registrarInstruccion(payload);
            alert(`✅ Ficha guardada exitosamente.`);
        } catch (error) {
            console.error("❌ Error al guardar evaluación:", error);
            alert("⚠️ Ocurrió un error al guardar la evaluación.");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>🎓 ESCUELA DE AVIACIÓN DE EJÉRCITO — CARGA DE EVALUACIONES</h2>
            </div>

            {/* BARRA SELECCIÓN DE TRIPULANTE / ALUMNO */}
            {cargandoDatos ? (
                <div style={styles.warningBox}>⏳ Cargando catálogo de tripulantes alumnos y patrones...</div>
            ) : alumnosDisponibles.length > 0 ? (
                <div style={styles.selectorBar}>
                    <div style={{ flex: 1 }}>
                        <label style={styles.label}>
                            👤 SELECCIONAR TRIPULANTE ALUMNO {nombreCurso ? `(${nombreCurso})` : ''}:
                        </label>
                        <select style={styles.selectAlumno} value={alumnoActivoId} onChange={handleAlumnoChange}>
                            {alumnosDisponibles.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.grado || ''} {a.apellido}, {a.nombre} {a.dni ? `— DNI: ${a.dni}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    {alumnoData && (
                        <div style={styles.summaryBadge}>
                            <div><strong>Elemento / Unidad:</strong> {alumnoData.elemento || alumnoData.unidad || 'ECAE'}</div>
                            <div><strong>Función:</strong> {alumnoData.funcion || alumnoData.especialidad || 'Alumno Pilotín'}</div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={styles.warningBox}>
                    ⚠️ No se encontraron tripulantes alumnos registrados. Diríjase al módulo de <strong>"Personal / Tripulantes"</strong> para dar de alta alumnos.
                </div>
            )}

            {/* PESTAÑAS */}
            <div style={styles.tabsContainer}>
                <button type="button" style={tabActiva === 'vuelo' ? styles.tabActive : styles.tabInactive} onClick={() => setTabActiva('vuelo')}>
                    ✈️ Ficha de Vuelo
                </button>
                <button type="button" style={tabActiva === 'academico' ? styles.tabActive : styles.tabInactive} onClick={() => setTabActiva('academico')}>
                    📚 Académico
                </button>
                <button type="button" style={tabActiva === 'psicotecnico' ? styles.tabActive : styles.tabInactive} onClick={() => setTabActiva('psicotecnico')}>
                    🧠 Psicotécnico
                </button>
                <button type="button" style={tabActiva === 'fisico' ? styles.tabActive : styles.tabInactive} onClick={() => setTabActiva('fisico')}>
                    🏋️ Físico
                </button>
            </div>

            {/* FORMULARIO PRINCIPAL */}
            <form onSubmit={handleGuardar} style={styles.formCard}>
                {tabActiva === 'vuelo' && (
                    <div>
                        {/* 1. SELECCIÓN DE PATRÓN */}
                        <div style={styles.cascadaBox}>
                            <div style={styles.grid3}>
                                <div>
                                    <label style={styles.miniLabel}>1. Curso / Tipo Aeronave:</label>
                                    <select style={styles.input} value={aeronaveSeleccionada} onChange={e => setAeronaveSeleccionada(e.target.value)} required>
                                        <option value="">-- Seleccionar --</option>
                                        {aeronavesDisponibles.map(aero => <option key={aero} value={aero}>{aero}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.miniLabel}>2. Agrupamiento / Misión:</label>
                                    <select style={styles.input} value={agrupamientoSeleccionado} onChange={e => setAgrupamientoSeleccionado(e.target.value)} disabled={!aeronaveSeleccionada} required>
                                        <option value="">-- Seleccionar --</option>
                                        {agrupamientosDisponibles.map(agrup => <option key={agrup} value={agrup}>{agrup}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.miniLabel}>3. Código de Patrón:</label>
                                    <select style={styles.input} value={codigoSeleccionado} onChange={e => setCodigoSeleccionado(e.target.value)} disabled={!agrupamientoSeleccionado} required>
                                        <option value="">-- Seleccionar --</option>
                                        {codigosDisponibles.map(p => <option key={p._id} value={p._id}>[{p.codigo}] {p.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. INSTRUCTOR */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={styles.miniLabel}>👨‍✈️ Instructor de Vuelo (Nombre y Apellido):</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                placeholder="Ej: Cap. Juan Pérez" 
                                value={formVuelo.instructorNombre} 
                                onChange={e => setFormVuelo({...formVuelo, instructorNombre: e.target.value})} 
                                required 
                            />
                        </div>

                        {/* 3. MANIOBRAS AUTOMÁTICAS */}
                        <h4 style={styles.sectionTitle}>📋 Maniobras del Patrón ({formVuelo.estandares.length})</h4>
                        
                        {formVuelo.estandares.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d', fontStyle: 'italic', background: '#fafafa', border: '1px dashed #ccc' }}>
                                Seleccione un Código de Patrón en el menú superior para desplegar las maniobras.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {formVuelo.estandares.map((m, idx) => (
                                    <div key={idx} style={styles.rowManiobra}>
                                        <div style={{ flex: 1, fontWeight: 'bold', fontSize: '0.85rem', color: '#2c3e50' }}>
                                            {idx + 1}. {m.estandar}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {NOTAS_OPCIONES.map(op => {
                                                const isSelected = m.nota === op.value;
                                                return (
                                                    <button
                                                        key={op.value}
                                                        type="button"
                                                        onClick={() => setNotaManiobra(idx, op.value)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            border: isSelected ? `2px solid ${op.color}` : '1px solid #cbd5e1',
                                                            backgroundColor: isSelected ? op.color : '#fff',
                                                            color: isSelected ? '#fff' : '#333',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            minWidth: '40px'
                                                        }}
                                                    >
                                                        {op.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 4. CALIFICACIÓN FINAL Y OBSERVACIÓN */}
                        <div style={{ marginTop: '25px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <div style={styles.grid2}>
                                <div>
                                    <label style={styles.miniLabel}>🏆 CALIFICACIÓN FINAL DEL PATRÓN:</label>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                        {NOTAS_OPCIONES.map(op => {
                                            const isSelected = formVuelo.calificacionGeneral === op.value;
                                            return (
                                                <button
                                                    key={op.value}
                                                    type="button"
                                                    onClick={() => setFormVuelo({ ...formVuelo, calificacionGeneral: op.value })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '4px',
                                                        border: isSelected ? `2px solid ${op.color}` : '1px solid #cbd5e1',
                                                        backgroundColor: isSelected ? op.color : '#fff',
                                                        color: isSelected ? '#fff' : '#333',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {op.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label style={styles.miniLabel}>Observaciones del Instructor:</label>
                                    <textarea 
                                        style={styles.textarea} 
                                        rows="2" 
                                        value={formVuelo.observacionesInstructor} 
                                        onChange={e => setFormVuelo({...formVuelo, observacionesInstructor: e.target.value})}
                                        placeholder="Escriba comentarios u observaciones..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODULOS SECUNDARIOS */}
                {tabActiva === 'academico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>📚 Evaluaciones Académicas</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Materia / Asignatura:</label>
                                <select style={styles.input} value={formAcademico.materia} onChange={e => setFormAcademico({...formAcademico, materia: e.target.value})}>
                                    <option value="AERODINAMICA">Aerodinámica y Performance</option>
                                    <option value="NAVEGACION">Navegación Aérea y Cartografía</option>
                                    <option value="METEOROLOGIA">Meteorología Aeronáutica</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.miniLabel}>Nota Numérica (1 - 10):</label>
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
                                <label style={styles.miniLabel}>Especialista Evaluador:</label>
                                <input type="text" style={styles.input} value={formPsicotecnico.especialistaNombre} onChange={e => setFormPsicotecnico({...formPsicotecnico, especialistaNombre: e.target.value})} required />
                            </div>
                        </div>
                    </div>
                )}

                {tabActiva === 'fisico' && (
                    <div>
                        <h3 style={styles.sectionTitle}>🏋️ Adiestramiento Físico</h3>
                        <div style={styles.grid2}>
                            <div>
                                <label style={styles.miniLabel}>Nota Global:</label>
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
    sectionTitle: { fontSize: '0.9rem', color: '#1b2a4a', borderBottom: '2px solid #e2e8f0', paddingBottom: '5px', marginBottom: '15px', marginTop: '15px' },
    cascadaBox: { backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' },
    input: { width: '100%', padding: '8px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '7px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'sans-serif' },
    rowManiobra: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fdfdfd', border: '1px solid #e2e8f0', borderRadius: '4px' },
    actionRow: { marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '15px' },
    btnSubmit: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }
};

export default CargaInstruccion;