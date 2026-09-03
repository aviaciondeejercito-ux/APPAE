import React, { useState, useEffect } from 'react';
import API, { getTripulantes, getVuelos, guardarEntrenamiento } from '../services/api';

const PROCEDIMIENTOS_INICIALES = {
    despegueNormal: 0, despegueMinimaDistancia: 0, aterrizajeNormal: 0,
    aterrizajeMinimaDistancia: 0, aterrizajeVientoCruzado: 0, aterrizajeSinFlaps: 0,
    toqueYMotor: 0, circuitoTransitoVisual: 0, escapeGoAround: 0,
    partidaEstandarizadaIFR: 0, arriboEstandarizadoIFR: 0, aproxNoPrecision: 0, aproxPrecision: 0,
    despegueNocturno: 0, aterrizajeNocturno: 0, circuitoTransitoNocturno: 0
};

const GRADOS_OFICIALES = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];

const mismoId = (id1, id2) => {
    if (!id1 || !id2) return false;
    return String(id1).trim() === String(id2).trim();
};

const TrainingFormPage = () => {
    const [vuelosUnidad, setVuelosUnidad] = useState([]);
    const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
    const [oficialesDelVuelo, setOficialesDelVuelo] = useState([]);
    const [registrosCargados, setRegistrosCargados] = useState([]);
    
    const [oficialesUnidad, setOficialesUnidad] = useState([]);
    const [tripulanteId, setTripulanteId] = useState('');
    const [tripulanteNombre, setTripulanteNombre] = useState('');
    const [esEdicion, setEsEdicion] = useState(false);
    
    const [procedimientos, setProcedimientos] = useState(PROCEDIMIENTOS_INICIALES);
    const [cargando, setCargando] = useState(false);

    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';

    const esOficial = (tripulante) => {
        if (!tripulante || !tripulante.grado) return false;
        return GRADOS_OFICIALES.includes(tripulante.grado.toUpperCase().trim());
    };

    const cargarDatosUnidad = async () => {
        setCargando(true);
        try {
            const resVuelos = await getVuelos();
            const todosVuelos = resVuelos.data?.data || resVuelos.data || [];
            const vuelosFiltrados = todosVuelos.filter(v => {
                const uVuelo = (v.unidadResponsable || '').toUpperCase().trim();
                const uUser = userUnidad.toUpperCase().trim();
                return uVuelo && uUser && uVuelo === uUser;
            });
            setVuelosUnidad(vuelosFiltrados);

            const resTrip = await getTripulantes();
            const todosTrip = resTrip.data?.data || resTrip.data || [];
            const oficialesFiltrados = todosTrip.filter(t => {
                const elemTrip = (t.elemento || t.unidad || '').toUpperCase().trim();
                const elemUser = userUnidad.toUpperCase().trim();
                return elemTrip && elemUser && elemTrip === elemUser && esOficial(t);
            });
            setOficialesUnidad(oficialesFiltrados);

            // CORRECCIÓN CLAVE: La ruta correcta es /training (definida en server.js)
            const resTrain = await API.get('/training');
            setRegistrosCargados(resTrain.data?.data || resTrain.data || []);

        } catch (error) {
            console.error("Error al cargar datos de la unidad:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (userUnidad) cargarDatosUnidad();
    }, [userUnidad]);

    const seleccionarVueloParaCargar = (vuelo) => {
        const fechaFormateada = vuelo.fecha ? new Date(vuelo.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        setVueloSeleccionado({
            id: String(vuelo._id || vuelo.id),
            fecha: fechaFormateada,
            aeronave: vuelo.aeronave || 'S/D',
            matricula: vuelo.matricula || 'S/D',
            tipoMision: vuelo.tipoMision || vuelo.mision || 'S/D',
            desde: vuelo.desde || 'S/D',
            hasta: vuelo.hasta || 'S/D'
        });

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
        setEsEdicion(false);
        setProcedimientos(PROCEDIMIENTOS_INICIALES);
    };

    const handleProcChange = (key, val) => {
        setProcedimientos(prev => ({ ...prev, [key]: Math.max(0, parseInt(val) || 0) }));
    };

    const seleccionarOficial = (id) => {
        setTripulanteId(id);
        
        const t = oficialesDelVuelo.find(x => mismoId(x._id || x.id, id)) || 
                  oficialesUnidad.find(x => mismoId(x._id || x.id, id));
        
        if (t) {
            setTripulanteNombre(`${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim());
        } else {
            setTripulanteNombre('');
        }

        const existente = registrosCargados.find(r => mismoId(r.vueloId, vueloSeleccionado?.id) && mismoId(r.tripulanteId, id));
        
        if (existente) {
            setProcedimientos({ ...PROCEDIMIENTOS_INICIALES, ...existente.procedimientos });
            setEsEdicion(true);
        } else {
            setProcedimientos(PROCEDIMIENTOS_INICIALES);
            setEsEdicion(false);
        }
    };

    const guardarFormulario = async () => {
        if (!vueloSeleccionado || !tripulanteId) {
            return alert("Debe seleccionar un oficial para registrar la planilla.");
        }

        const payload = {
            vueloId: vueloSeleccionado.id,
            vueloFecha: vueloSeleccionado.fecha,
            unidad: userUnidad, // Se envía la unidad explícitamente
            origen: vueloSeleccionado.desde || 'S/D',
            destino: vueloSeleccionado.hasta || 'S/D',
            tripulanteId,
            tripulanteNombre,
            procedimientos,
            cargadoPor: localStorage.getItem('usuario') || 'Sistema'
        };

        try {
            const res = await guardarEntrenamiento(payload);
            const respuestaData = res.data?.data || res.data;

            if (res.data?.success || res.status === 200 || res.status === 201) {
                alert(esEdicion ? "Planilla actualizada correctamente." : "Planilla registrada con éxito.");
                
                setRegistrosCargados(prev => {
                    const filtrados = prev.filter(r => !(mismoId(r.vueloId, vueloSeleccionado.id) && mismoId(r.tripulanteId, tripulanteId)));
                    return [...filtrados, respuestaData];
                });

                setVueloSeleccionado(null);
                setOficialesDelVuelo([]);
                setTripulanteId('');
                setTripulanteNombre('');
                setProcedimientos(PROCEDIMIENTOS_INICIALES);
                
                cargarDatosUnidad();
            }
        } catch (e) {
            console.error("Error al guardar entrenamiento:", e);
            alert("Error al intentar guardar el formulario.");
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>📋 GESTIÓN DE ENTRENAMIENTO - ELEMENTO: {userUnidad || 'SIN ELEMENTO'}</h2>

            <div style={styles.splitLayout}>
                {/* LISTA DE VUELOS */}
                <div style={styles.leftColumn}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>✈️ Vuelos Disponibles</h3>
                    </div>
                    
                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '15px' }}>Cargando vuelos...</div>
                    ) : vuelosUnidad.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '15px', color: '#7f8c8d' }}>
                            Sin vuelos para {userUnidad}.
                        </div>
                    ) : (
                        <div style={styles.vuelosList}>
                            {vuelosUnidad.map((v) => {
                                const idVueloStr = String(v._id || v.id);
                                const fechaFormat = v.fecha ? new Date(v.fecha).toISOString().split('T')[0] : 'S/D';
                                const esElSeleccionado = mismoId(vueloSeleccionado?.id, idVueloStr);

                                // Buscar todas las planillas cargadas para este vuelo
                                const planillasDelVuelo = registrosCargados.filter(r => mismoId(r.vueloId, idVueloStr));
                                const tienePlanilla = planillasDelVuelo.length > 0;

                                return (
                                    <div 
                                        key={idVueloStr} 
                                        onClick={() => seleccionarVueloParaCargar(v)}
                                        style={esElSeleccionado ? styles.vueloCardActive : styles.vueloCard}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '0.85rem' }}>
                                                ✈️ {v.aeronave} ({v.matricula})
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>📅 {fechaFormat}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#34495e', marginBottom: '4px' }}>
                                            <b>Misión:</b> {v.tipoMision || v.mision} | <b>Ruta:</b> {v.desde} ➔ {v.hasta}
                                        </div>
                                        
                                        {/* DETALLE DE PLANILLAS Y TRIPULANTES CARGADOS */}
                                        <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #e0e0e0', fontSize: '0.7rem' }}>
                                            {tienePlanilla ? (
                                                <div style={{ color: '#27ae60', fontWeight: 'bold' }}>
                                                    ✅ Cargado: {planillasDelVuelo.map(p => p.tripulanteNombre).join(', ')}
                                                </div>
                                            ) : (
                                                <div style={{ color: '#e67e22' }}>⏳ Pendiente de Carga</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FORMULARIO DE CARGA / EDICIÓN */}
                <div style={styles.rightColumn}>
                    {vueloSeleccionado ? (
                        <div style={{ ...styles.card, borderTop: esEdicion ? '4px solid #f39c12' : '4px solid #3498db' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ fontSize: '1rem', margin: 0, color: '#2c3e50' }}>
                                    📝 Planilla: <b>{vueloSeleccionado.aeronave} ({vueloSeleccionado.matricula})</b> - {vueloSeleccionado.fecha}
                                </h3>
                                {esEdicion && (
                                    <span style={{ backgroundColor: '#f39c12', color: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                        ✏️ Modo Edición
                                    </span>
                                )}
                            </div>
                            
                            <div style={{ marginBottom: '15px' }}>
                                <label style={styles.label}>👤 Seleccionar Oficial a Evaluar / Editar:</label>
                                <select 
                                    value={tripulanteId}
                                    onChange={e => seleccionarOficial(e.target.value)} 
                                    style={styles.input}
                                >
                                    <option value="">-- Seleccionar Oficial --</option>
                                    {oficialesDelVuelo.length > 0 && (
                                        <optgroup label="Oficiales de este Vuelo">
                                            {oficialesDelVuelo.map(o => {
                                                const id = String(o._id || o.id);
                                                const yaCargado = registrosCargados.some(r => mismoId(r.vueloId, vueloSeleccionado.id) && mismoId(r.tripulanteId, id));
                                                return (
                                                    <option key={id} value={id}>
                                                        [{o.rolEnVuelo}] {o.grado} {o.apellido} {o.nombre} {yaCargado ? ' (✅ Cargado)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}
                                    <optgroup label={`Otros Oficiales de la Unidad (${userUnidad})`}>
                                        {oficialesUnidad.map(t => {
                                            const id = String(t._id || t.id);
                                            const yaCargado = registrosCargados.some(r => mismoId(r.vueloId, vueloSeleccionado.id) && mismoId(r.tripulanteId, id));
                                            return (
                                                <option key={id} value={id}>
                                                    {t.grado} {t.apellido} {t.nombre} {yaCargado ? ' (✅ Cargado)' : ''}
                                                </option>
                                            );
                                        })}
                                    </optgroup>
                                </select>
                            </div>

                            <div style={styles.grid3}>
                                <div style={{ ...styles.subCard, borderTop: '3px solid #27ae60' }}>
                                    <h4 style={{ color: '#27ae60', margin: '0 0 8px 0', fontSize: '0.8rem' }}>🛩️ EXIGENCIAS VISUALES</h4>
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

                                <div style={{ ...styles.subCard, borderTop: '3px solid #2980b9' }}>
                                    <h4 style={{ color: '#2980b9', margin: '0 0 8px 0', fontSize: '0.8rem' }}>📡 EXIGENCIAS IFR</h4>
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

                                <div style={{ ...styles.subCard, borderTop: '3px solid #8e44ad' }}>
                                    <h4 style={{ color: '#8e44ad', margin: '0 0 8px 0', fontSize: '0.8rem' }}>🌙 EXIGENCIAS NOCTURNAS</h4>
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

                            <button onClick={guardarFormulario} style={esEdicion ? styles.btnUpdate : styles.btnSave}>
                                {esEdicion ? `✏️ Actualizar Planilla de ${tripulanteNombre}` : `💾 Guardar Planilla de ${tripulanteNombre || 'Oficial'}`}
                            </button>
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            👈 Selecciona un vuelo de la lista para cargar o editar una planilla.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '15px', backgroundColor: '#f4f6f7', fontFamily: 'sans-serif', minHeight: '100vh' },
    header: { fontSize: '1rem', backgroundColor: '#2c3e50', color: 'white', padding: '10px 15px', borderRadius: '4px', marginBottom: '15px' },
    splitLayout: { display: 'flex', gap: '15px', alignItems: 'flex-start' },
    leftColumn: { flex: '1 1 320px', maxWidth: '380px', backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '10px' },
    rightColumn: { flex: '2 1 600px' },
    cardHeader: { borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' },
    cardTitle: { margin: 0, fontSize: '0.9rem', color: '#2c3e50' },
    vuelosList: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
    vueloCard: { padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', transition: 'all 0.2s' },
    vueloCardActive: { padding: '10px', border: '2px solid #3498db', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ebf5fb' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    subCard: { backgroundColor: '#fafafa', padding: '10px', borderRadius: '4px', border: '1px solid #eee' },
    emptyState: { backgroundColor: 'white', padding: '40px', borderRadius: '4px', textAlign: 'center', color: '#7f8c8d', border: '2px dashed #bdc3c7', fontSize: '0.9rem' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' },
    labelText: { fontSize: '0.75rem' },
    input: { width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '3px' },
    numInput: { width: '45px', padding: '2px 4px', textAlign: 'right', fontSize: '0.8rem' },
    rowInput: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderBottom: '1px dashed #eee', paddingBottom: '2px' },
    btnSave: { width: '100%', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' },
    btnUpdate: { width: '100%', backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }
};

export default TrainingFormPage;