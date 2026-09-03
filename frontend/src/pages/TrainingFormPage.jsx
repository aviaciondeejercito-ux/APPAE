import React, { useState, useEffect } from 'react';
import API, { getTripulantes, getVuelos, guardarEntrenamiento } from '../services/api';

const PROCEDIMIENTOS_INICIALES = {
    despegueNormal: 0, despegueMinimaDistancia: 0, aterrizajeNormal: 0,
    aterrizajeMinimaDistancia: 0, aterrizajeVientoCruzado: 0, aterrizajeSinFlaps: 0,
    toqueYMotor: 0, circuitoTransitoVisual: 0, escapeGoAround: 0,
    partidaEstandarizadaIFR: 0, arriboEstandarizadoIFR: 0, aproxNoPrecision: 0, aproxPrecision: 0,
    despegueNocturno: 0, aterrizajeNocturno: 0, circuitoTransitoNocturno: 0
};

// Grados válidos pertenecientes al cuadro de Oficiales
const GRADOS_OFICIALES = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];

const TrainingFormPage = () => {
    const [busquedaVuelo, setBusquedaVuelo] = useState('');
    const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
    const [oficialesDelVuelo, setOficialesDelVuelo] = useState([]);
    
    const [oficialesUnidad, setOficialesUnidad] = useState([]);
    const [tripulanteId, setTripulanteId] = useState('');
    const [tripulanteNombre, setTripulanteNombre] = useState('');
    
    const [procedimientos, setProcedimientos] = useState(PROCEDIMIENTOS_INICIALES);
    const [cargando, setCargando] = useState(false);

    // Obtención de la unidad/elemento del usuario conectado
    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';

    // Función auxiliar para determinar si un legajo corresponde a un Oficial
    const esOficial = (tripulante) => {
        if (!tripulante || !tripulante.grado) return false;
        const gradoLimpio = tripulante.grado.toUpperCase().trim();
        return GRADOS_OFICIALES.includes(gradoLimpio);
    };

    // Carga de Oficiales pertenecientes únicamente al elemento/unidad activo
    useEffect(() => {
        const cargarOficialesUnidad = async () => {
            try {
                const res = await getTripulantes();
                const todos = res.data?.data || res.data || [];
                
                // Filtro 1: Debe pertenecer al elemento/unidad del usuario
                // Filtro 2: Debe ser un Oficial (CR a ST)
                const filtrados = todos.filter(t => {
                    const elemTrip = (t.elemento || t.unidad || '').toUpperCase().trim();
                    const elemUser = userUnidad.toUpperCase().trim();
                    
                    const coincideUnidad = elemTrip && elemUser && elemTrip === elemUser;
                    return coincideUnidad && esOficial(t);
                });

                setOficialesUnidad(filtrados);
            } catch (error) {
                console.error("Error al obtener oficiales de la unidad:", error);
            }
        };

        if (userUnidad) {
            cargarOficialesUnidad();
        }
    }, [userUnidad]);

    // Búsqueda de vuelo en el backend y extracción de Oficiales (Instructor, Piloto, Copiloto)
    const buscarVuelo = async () => {
        if (!busquedaVuelo.trim()) return alert("Ingrese un ID o criterio de búsqueda de vuelo.");
        setCargando(true);
        try {
            const res = await getVuelos({ search: busquedaVuelo.trim() });
            const lista = res.data?.data || res.data || [];
            
            const vuelo = lista.find(v => v._id === busquedaVuelo.trim() || v.matricula === busquedaVuelo.trim().toUpperCase()) || lista[0];

            if (!vuelo) {
                alert("No se encontró ningún vuelo registrado con ese parámetro.");
                setVueloSeleccionado(null);
                setOficialesDelVuelo([]);
                setCargando(false);
                return;
            }

            setVueloSeleccionado({
                id: vuelo._id,
                fecha: vuelo.fecha ? new Date(vuelo.fecha).toISOString().split('T')[0] : 'S/D',
                aeronave: vuelo.aeronave || 'S/D',
                matricula: vuelo.matricula || 'S/D',
                tipoMision: vuelo.tipoMision || vuelo.mision || 'S/D',
                desde: vuelo.desde || 'S/D',
                hasta: vuelo.hasta || 'S/D'
            });

            // Extraer tripulantes (descartando mecánicos) y validar que posean grado de Oficial
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
        } catch (error) {
            console.error("Error al vincular el vuelo:", error);
            alert("Error al intentar recuperar la información del vuelo.");
        } finally {
            setCargando(false);
        }
    };

    const handleProcChange = (key, val) => {
        setProcedimientos(prev => ({ ...prev, [key]: Math.max(0, parseInt(val) || 0) }));
    };

    const seleccionarOficial = (id) => {
        setTripulanteId(id);
        const t = oficialesDelVuelo.find(x => (x._id || x.id) === id) || 
                  oficialesUnidad.find(x => (x._id || x.id) === id);
        
        if (t) {
            const nombreCompleto = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim();
            setTripulanteNombre(nombreCompleto);
        } else {
            setTripulanteNombre('');
        }
    };

    const guardarFormulario = async () => {
        if (!vueloSeleccionado || !tripulanteId) {
            return alert("Debe vincular un vuelo y seleccionar un oficial obligatoriamente.");
        }

        const payload = {
            vueloId: vueloSeleccionado.id,
            vueloFecha: vueloSeleccionado.fecha,
            aeronave: vueloSeleccionado.aeronave,
            matricula: vueloSeleccionado.matricula,
            mision: vueloSeleccionado.tipoMision,
            desde: vueloSeleccionado.desde,
            hasta: vueloSeleccionado.hasta,
            tripulanteId,
            tripulanteNombre,
            procedimientos
        };

        try {
            const res = await guardarEntrenamiento(payload);
            if (res.data?.success || res.status === 200 || res.status === 201) {
                alert("Entrenamiento registrado con éxito para el oficial.");
                setVueloSeleccionado(null);
                setOficialesDelVuelo([]);
                setTripulanteId('');
                setTripulanteNombre('');
                setBusquedaVuelo('');
                setProcedimientos(PROCEDIMIENTOS_INICIALES);
            }
        } catch (e) {
            console.error("Error al guardar entrenamiento:", e);
            alert("Error al conectar con el servidor para guardar la planilla.");
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>📋 PLANILLA DE CONTROL DE ENTRENAMIENTO DE TRIPULANTES</h2>

            {/* VINCULACIÓN DE VUELO Y OFICIAL */}
            <div style={styles.card}>
                <div style={styles.grid2}>
                    <div>
                        <label style={styles.label}>🔍 Buscar Vuelo (ID / Matrícula):</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input 
                                type="text" 
                                value={busquedaVuelo} 
                                onChange={e => setBusquedaVuelo(e.target.value)} 
                                style={styles.input} 
                                placeholder="Ej: ID_VUELO o Matrícula AE-XXX" 
                            />
                            <button onClick={buscarVuelo} disabled={cargando} style={styles.btnAction}>
                                {cargando ? 'Buscando...' : 'Vincular'}
                            </button>
                        </div>

                        {vueloSeleccionado && (
                            <div style={styles.vueloBadge}>
                                <div>📅 <b>Fecha:</b> {vueloSeleccionado.fecha}</div>
                                <div>✈️ <b>Aeronave / Matrícula:</b> {vueloSeleccionado.aeronave} ({vueloSeleccionado.matricula})</div>
                                <div>🎯 <b>Misión:</b> {vueloSeleccionado.tipoMision}</div>
                                <div>🛫 <b>Ruta:</b> {vueloSeleccionado.desde} ➔ {vueloSeleccionado.hasta}</div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={styles.label}>👤 Seleccionar Oficial a Evaluar ({userUnidad || 'Sin Elemento'}):</label>
                        <select 
                            value={tripulanteId}
                            onChange={e => seleccionarOficial(e.target.value)} 
                            style={styles.input}
                        >
                            <option value="">-- Seleccionar Oficial --</option>
                            
                            {/* Oficiales que integraron la tripulación del vuelo */}
                            {oficialesDelVuelo.length > 0 && (
                                <optgroup label="Oficiales del Vuelo">
                                    {oficialesDelVuelo.map(o => (
                                        <option key={o._id || o.id} value={o._id || o.id}>
                                            [{o.rolEnVuelo}] {o.grado} {o.apellido} {o.nombre}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* Resto de Oficiales pertenecientes al elemento/unidad */}
                            <optgroup label={`Oficiales de la Unidad (${userUnidad || 'General'})`}>
                                {oficialesUnidad.map(t => (
                                    <option key={t._id || t.id} value={t._id || t.id}>
                                        {t.grado} {t.apellido} {t.nombre}
                                    </option>
                                ))}
                            </optgroup>
                        </select>

                        {tripulanteNombre && (
                            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#2c3e50' }}>
                                <b>Oficial Seleccionado:</b> {tripulanteNombre}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PLANILLA DE EXIGENCIAS */}
            <div style={styles.grid3}>
                <div style={{ ...styles.card, borderTop: '4px solid #27ae60' }}>
                    <h3 style={{ color: '#27ae60', fontSize: '0.9rem' }}>🛩️ EXIGENCIAS VISUALES</h3>
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

                <div style={{ ...styles.card, borderTop: '4px solid #2980b9' }}>
                    <h3 style={{ color: '#2980b9', fontSize: '0.9rem' }}>📡 EXIGENCIAS IFR</h3>
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

                <div style={{ ...styles.card, borderTop: '4px solid #8e44ad' }}>
                    <h3 style={{ color: '#8e44ad', fontSize: '0.9rem' }}>🌙 EXIGENCIAS NOCTURNAS</h3>
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

            <button onClick={guardarFormulario} style={styles.btnSave}>💾 Registrar Formulario de Entrenamiento</button>
        </div>
    );
};

const styles = {
    container: { padding: '15px', backgroundColor: '#f4f6f7', fontFamily: 'sans-serif' },
    header: { fontSize: '1.1rem', backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '15px' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
    labelText: { fontSize: '0.75rem' },
    input: { width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '3px' },
    numInput: { width: '60px', padding: '3px', textAlign: 'right', fontSize: '0.8rem' },
    rowInput: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px dashed #eee', paddingBottom: '3px' },
    btnAction: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '3px' },
    btnSave: { width: '100%', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' },
    vueloBadge: { marginTop: '8px', padding: '8px', backgroundColor: '#e8f8f5', border: '1px solid #27ae60', fontSize: '0.75rem', borderRadius: '3px', lineHeight: '1.4' }
};

export default TrainingFormPage;