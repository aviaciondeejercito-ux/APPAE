import React, { useState, useEffect } from 'react';
import API, { getTripulantes, getVuelos, guardarEntrenamiento } from '../services/api';

const PROCEDIMIENTOS_INICIALES = {
    despegueNormal: 0, despegueMinimaDistancia: 0, aterrizajeNormal: 0,
    aterrizajeMinimaDistancia: 0, aterrizajeVientoCruzado: 0, aterrizajeSinFlaps: 0,
    toqueYMotor: 0, circuitoTransitoVisual: 0, escapeGoAround: 0,
    partidaEstandarizadaIFR: 0, arriboEstandarizadoIFR: 0, aproxNoPrecision: 0, aproxPrecision: 0,
    despegueNocturno: 0, aterrizajeNocturno: 0, circuitoTransitoNocturno: 0
};

// Grados habilitados para el cuadro de Oficiales (CR a ST)
const GRADOS_OFICIALES = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];

const TrainingFormPage = () => {
    const [vuelosUnidad, setVuelosUnidad] = useState([]);
    const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
    const [oficialesDelVuelo, setOficialesDelVuelo] = useState([]);
    
    const [oficialesUnidad, setOficialesUnidad] = useState([]);
    const [tripulanteId, setTripulanteId] = useState('');
    const [tripulanteNombre, setTripulanteNombre] = useState('');
    
    const [procedimientos, setProcedimientos] = useState(PROCEDIMIENTOS_INICIALES);
    const [cargando, setCargando] = useState(false);

    // Unidad / Elemento del usuario logueado
    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';

    // Validar si un legajo es Oficial (CR a ST)
    const esOficial = (tripulante) => {
        if (!tripulante || !tripulante.grado) return false;
        return GRADOS_OFICIALES.includes(tripulante.grado.toUpperCase().trim());
    };

    // Cargar Vuelos y Oficiales del Elemento/Unidad
    useEffect(() => {
        const cargarDatosUnidad = async () => {
            setCargando(true);
            try {
                // 1. Cargar Vuelos filtrados por Unidad Responsable
                const resVuelos = await getVuelos();
                const todosVuelos = resVuelos.data?.data || resVuelos.data || [];
                
                const vuelosFiltrados = todosVuelos.filter(v => {
                    const uVuelo = (v.unidadResponsable || '').toUpperCase().trim();
                    const uUser = userUnidad.toUpperCase().trim();
                    return uVuelo && uUser && uVuelo === uUser;
                });
                setVuelosUnidad(vuelosFiltrados);

                // 2. Cargar Tripulantes (Oficiales) de la Unidad
                const resTrip = await getTripulantes();
                const todosTrip = resTrip.data?.data || resTrip.data || [];
                
                const oficialesFiltrados = todosTrip.filter(t => {
                    const elemTrip = (t.elemento || t.unidad || '').toUpperCase().trim();
                    const elemUser = userUnidad.toUpperCase().trim();
                    return elemTrip && elemUser && elemTrip === elemUser && esOficial(t);
                });
                setOficialesUnidad(oficialesFiltrados);

            } catch (error) {
                console.error("Error al cargar datos de la unidad:", error);
            } finally {
                setCargando(false);
            }
        };

        if (userUnidad) {
            cargarDatosUnidad();
        }
    }, [userUnidad]);

    // Seleccionar vuelo de la lista para cargar la planilla
    const seleccionarVueloParaCargar = (vuelo) => {
        const fechaFormateada = vuelo.fecha ? new Date(vuelo.fecha).toISOString().split('T')[0] : 'S/D';

        setVueloSeleccionado({
            id: vuelo._id,
            fecha: fechaFormateada,
            aeronave: vuelo.aeronave || 'S/D',
            matricula: vuelo.matricula || 'S/D',
            tipoMision: vuelo.tipoMision || vuelo.mision || 'S/D',
            desde: vuelo.desde || 'S/D',
            hasta: vuelo.hasta || 'S/D'
        });

        // Filtrar oficiales asignados al vuelo (Instructor, Piloto, Copiloto) descartando mecánicos
        const oficialesEncontrados = [];
        const rolesEvaluar = [
            { obj: vuelo.instructor, rol: 'Instructor' },
            { obj: vuelo.piloto, rol: 'Piloto' },
            { obj: vuelo.copiloto, rol: 'Copiloto' }
        ];

        rolesEvaluar.forEach(item => {
            if (item.obj && esOficial(item.obj)) {
                oficialesEncontrados.push({
                    ...item.obj,
                    rolEnVuelo: item.rol
                });
            }
        });

        setOficialesDelVuelo(oficialesEncontrados);
        setTripulanteId('');
        setTripulanteNombre('');
        setProcedimientos(PROCEDIMIENTOS_INICIALES);
    };

    const handleProcChange = (key, val) => {
        setProcedimientos(prev => ({ ...prev, [key]: Math.max(0, parseInt(val) || 0) }));
    };

    const seleccionarOficial = (id) => {
        setTripulanteId(id);
        const t = oficialesDelVuelo.find(x => (x._id || x.id) === id) || 
                  oficialesUnidad.find(x => (x._id || x.id) === id);
        
        if (t) {
            setTripulanteNombre(`${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim());
        } else {
            setTripulanteNombre('');
        }
    };

    const guardarFormulario = async () => {
        if (!vueloSeleccionado || !tripulanteId) {
            return alert("Debe seleccionar un oficial para registrar la planilla.");
        }

        const payload = {
            vueloId: vueloSeleccionado.id,
            vueloFecha: vueloSeleccionado.fecha,
            aeronave: vueloSeleccionado.aeronave,
            matricula: vueloSeleccionado.matricula,
            mision: vueloSeleccionado.tipoMision,
            tripulanteId,
            tripulanteNombre,
            procedimientos
        };

        try {
            const res = await guardarEntrenamiento(payload);
            if (res.data?.success || res.status === 200 || res.status === 201) {
                alert("Entrenamiento registrado con éxito.");
                setVueloSeleccionado(null);
                setOficialesDelVuelo([]);
                setTripulanteId('');
                setTripulanteNombre('');
                setProcedimientos(PROCEDIMIENTOS_INICIALES);
            }
        } catch (e) {
            console.error("Error al guardar entrenamiento:", e);
            alert("Error al intentar guardar el formulario.");
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>📋 VUELOS DEL ELEMENTO: {userUnidad || 'SIN ELEMENTO'}</h2>

            {/* TABLA DE VUELOS DE LA UNIDAD (RENGLÓN ÚNICO) */}
            <div style={styles.card}>
                {cargando ? (
                    <div style={{ textAlign: 'center', padding: '10px' }}>Cargando vuelos...</div>
                ) : vuelosUnidad.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#7f8c8d' }}>
                        No hay vuelos registrados para la unidad {userUnidad}.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thRow}>
                                    <th style={styles.th}>FECHA</th>
                                    <th style={styles.th}>AERONAVE</th>
                                    <th style={styles.th}>MATRÍCULA</th>
                                    <th style={styles.th}>MISIÓ N</th>
                                    <th style={styles.th}>RUTA</th>
                                    <th style={styles.th}>OFICIALES (INST / PIL / COP)</th>
                                    <th style={styles.th}>ACCIÓN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vuelosUnidad.map((v) => {
                                    const fechaFormat = v.fecha ? new Date(v.fecha).toISOString().split('T')[0] : 'S/D';
                                    
                                    // Formatear nombres de los oficiales en una sola línea
                                    const oficialesNombres = [v.instructor, v.piloto, v.copiloto]
                                        .filter(o => o && esOficial(o))
                                        .map(o => `${o.grado} ${o.apellido}`)
                                        .join(' | ') || 'Sin oficiales';

                                    const esElSeleccionado = vueloSeleccionado?.id === v._id;

                                    return (
                                        <tr key={v._id} style={esElSeleccionado ? styles.trActive : styles.tr}>
                                            <td style={styles.td}>📅 {fechaFormat}</td>
                                            <td style={styles.td}><b>{v.aeronave}</b></td>
                                            <td style={styles.td}>{v.matricula}</td>
                                            <td style={styles.td}>{v.tipoMision || v.mision}</td>
                                            <td style={styles.td}>{v.desde} ➔ {v.hasta}</td>
                                            <td style={{ ...styles.td, fontSize: '0.75rem', color: '#34495e' }}>{oficialesNombres}</td>
                                            <td style={styles.td}>
                                                <button 
                                                    onClick={() => seleccionarVueloParaCargar(v)} 
                                                    style={esElSeleccionado ? styles.btnActive : styles.btnSelect}
                                                >
                                                    {esElSeleccionado ? '✓ Cargando' : '📝 Cargar Planilla'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FORMULARIO DE CARGA (SE DESPLIEGA AL SELECCIONAR UN VUELO DE LA LISTA) */}
            {vueloSeleccionado && (
                <div style={{ ...styles.card, borderLeft: '5px solid #3498db' }}>
                    <h3 style={{ fontSize: '1rem', marginTop: 0, color: '#2c3e50' }}>
                        📝 Planilla para el Vuelo: <b>{vueloSeleccionado.aeronave} ({vueloSeleccionado.matricula})</b> - {vueloSeleccionado.fecha}
                    </h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={styles.label}>👤 Seleccionar Oficial a Evaluar:</label>
                        <select 
                            value={tripulanteId}
                            onChange={e => seleccionarOficial(e.target.value)} 
                            style={{ ...styles.input, maxWidth: '400px' }}
                        >
                            <option value="">-- Seleccionar Oficial --</option>
                            {oficialesDelVuelo.length > 0 && (
                                <optgroup label="Oficiales de este Vuelo">
                                    {oficialesDelVuelo.map(o => (
                                        <option key={o._id || o.id} value={o._id || o.id}>
                                            [{o.rolEnVuelo}] {o.grado} {o.apellido} {o.nombre}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            <optgroup label={`Otros Oficiales de la Unidad (${userUnidad})`}>
                                {oficialesUnidad.map(t => (
                                    <option key={t._id || t.id} value={t._id || t.id}>
                                        {t.grado} {t.apellido} {t.nombre}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* MANIOBRAS */}
                    <div style={styles.grid3}>
                        <div style={{ ...styles.card, borderTop: '4px solid #27ae60', marginBottom: 0 }}>
                            <h4 style={{ color: '#27ae60', margin: '0 0 10px 0', fontSize: '0.85rem' }}>🛩️ EXIGENCIAS VISUALES</h4>
                            {[
                                ['despegueNormal', 'Despegue Normal'],
                                ['despegueMinimaDistancia', 'Despegue Mín. Distancia'],
                                ['aterrizajeNormal', 'Aterrizaje Normal'],
                                ['aterrizajeMinimaDistancia', 'Aterrizaje Mín. Distancia'],
                                ['aterrizajeVientoCruzado', 'Aterrizaje Viento Cruzado'],
                                ['aterrizajeSinFlaps', 'Aterrizaje Sin Flaps'],
                                ['toqueYMotor', 'Toque y Motor'],
                                ['circuitoTransitoVisual', 'Circuito Tránsito Visual'],
                                ['escapeGoAround', 'Escape (Go-Around)']
                            ].map(([key, label]) => (
                                <div key={key} style={styles.rowInput}>
                                    <span style={styles.labelText}>{label}:</span>
                                    <input type="number" min="0" value={procedimientos[key]} onChange={e => handleProcChange(key, e.target.value)} style={styles.numInput} />
                                </div>
                            ))}
                        </div>

                        <div style={{ ...styles.card, borderTop: '4px solid #2980b9', marginBottom: 0 }}>
                            <h4 style={{ color: '#2980b9', margin: '0 0 10px 0', fontSize: '0.85rem' }}>📡 EXIGENCIAS IFR</h4>
                            {[
                                ['partidaEstandarizadaIFR', 'Partida Estandarizada (SID)'],
                                ['arriboEstandarizadoIFR', 'Arribo Estandarizado (STAR)'],
                                ['aproxNoPrecision', 'Aprox. No Precisión'],
                                ['aproxPrecision', 'Aprox. Precisión']
                            ].map(([key, label]) => (
                                <div key={key} style={styles.rowInput}>
                                    <span style={styles.labelText}>{label}:</span>
                                    <input type="number" min="0" value={procedimientos[key]} onChange={e => handleProcChange(key, e.target.value)} style={styles.numInput} />
                                </div>
                            ))}
                        </div>

                        <div style={{ ...styles.card, borderTop: '4px solid #8e44ad', marginBottom: 0 }}>
                            <h4 style={{ color: '#8e44ad', margin: '0 0 10px 0', fontSize: '0.85rem' }}>🌙 EXIGENCIAS NOCTURNAS</h4>
                            {[
                                ['despegueNocturno', 'Despegue Nocturno'],
                                ['aterrizajeNocturno', 'Aterrizaje Nocturno'],
                                ['circuitoTransitoNocturno', 'Circuito de Tránsito']
                            ].map(([key, label]) => (
                                <div key={key} style={styles.rowInput}>
                                    <span style={styles.labelText}>{label}:</span>
                                    <input type="number" min="0" value={procedimientos[key]} onChange={e => handleProcChange(key, e.target.value)} style={styles.numInput} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={guardarFormulario} style={styles.btnSave}>
                        💾 Guardar Planilla para {tripulanteNombre || 'Oficial Seleccionado'}
                    </button>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', backgroundColor: '#f4f6f7', fontFamily: 'sans-serif' },
    header: { fontSize: '1.1rem', backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '15px' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' },
    thRow: { backgroundColor: '#ecf0f1', borderBottom: '2px solid #bdc3c7' },
    th: { padding: '8px', fontSize: '0.75rem', color: '#2c3e50' },
    tr: { borderBottom: '1px solid #eee' },
    trActive: { borderBottom: '1px solid #3498db', backgroundColor: '#ebf5fb' },
    td: { padding: '8px', verticalAlign: 'middle' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginBottom: '15px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
    labelText: { fontSize: '0.75rem' },
    input: { width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '3px' },
    numInput: { width: '50px', padding: '3px', textAlign: 'right', fontSize: '0.8rem' },
    rowInput: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderBottom: '1px dashed #eee', paddingBottom: '2px' },
    btnSelect: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '0.75rem' },
    btnActive: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 'bold' },
    btnSave: { width: '100%', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', marginTop: '15px' }
};

export default TrainingFormPage;