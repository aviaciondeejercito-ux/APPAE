import React, { useState } from 'react';

const API_BASE_URL = window.location.hostname === 'localhost' ? '' : 'https://appae.onrender.com';

const PROCEDIMIENTOS_INICIALES = {
    despegueNormal: 0, despegueMinimaDistancia: 0, aterrizajeNormal: 0,
    aterrizajeMinimaDistancia: 0, aterrizajeVientoCruzado: 0, aterrizajeSinFlaps: 0,
    toqueYMotor: 0, circuitoTransitoVisual: 0, escapeGoAround: 0,
    partidaEstandarizadaIFR: 0, arriboEstandarizadoIFR: 0, aproxNoPrecision: 0, aproxPrecision: 0,
    despegueNocturno: 0, aterrizajeNocturno: 0, circuitoTransitoNocturno: 0
};

const TrainingFormPage = () => {
    const [busquedaVuelo, setBusquedaVuelo] = useState('');
    const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
    const [tripulanteId, setTripulanteId] = useState('');
    const [tripulanteNombre, setTripulanteNombre] = useState('');
    const [procedimientos, setProcedimientos] = useState(PROCEDIMIENTOS_INICIALES);

    // Mock de tripulantes
    const tripulantesList = [
        { id: 'T001', nombre: 'Cap. Juan Pérez' },
        { id: 'T002', nombre: 'Tte. María González' },
        { id: 'T003', nombre: 'Subt. Carlos Rodríguez' }
    ];

    const buscarVueloMock = () => {
        if (!busquedaVuelo) return alert("Ingrese un código de vuelo");
        // Simulación de respuesta de API de vuelos
        setVueloSeleccionado({
            id: busquedaVuelo.toUpperCase(),
            fecha: '2026-09-02',
            origen: 'SABE (Aeroparque)',
            destino: 'SACO (Córdoba)'
        });
    };

    const handleProcChange = (key, val) => {
        setProcedimientos(prev => ({ ...prev, [key]: Math.max(0, parseInt(val) || 0) }));
    };

    const guardarFormulario = async () => {
        if (!vueloSeleccionado || !tripulanteId) {
            return alert("Debe seleccionar un vuelo y un tripulante obligatoriamente.");
        }

        const payload = {
            vueloId: vueloSeleccionado.id,
            vueloFecha: vueloSeleccionado.fecha,
            origen: vueloSeleccionado.origen,
            destino: vueloSeleccionado.destino,
            tripulanteId,
            tripulanteNombre,
            procedimientos
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/training`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert("Entrenamiento asignado con éxito");
                setVueloSeleccionado(null);
                setProcedimientos(PROCEDIMIENTOS_INICIALES);
            }
        } catch (e) {
            alert("Error al conectar con el servidor.");
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>📋 PLANILLA DE CONTROL DE ENTRENAMIENTO</h2>

            {/* SECCIÓN VUELO Y TRIPULANTE */}
            <div style={styles.card}>
                <div style={styles.grid2}>
                    <div>
                        <label style={styles.label}>🔍 Buscar Vuelo ID:</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input 
                                type="text" 
                                value={busquedaVuelo} 
                                onChange={e => setBusquedaVuelo(e.target.value)} 
                                style={styles.input} 
                                placeholder="Ej: VUE-2026-88" 
                            />
                            <button onClick={buscarVueloMock} style={styles.btnAction}>Vincular</button>
                        </div>
                        {vueloSeleccionado && (
                            <div style={styles.vueloBadge}>
                                📅 <b>Fecha:</b> {vueloSeleccionado.fecha} | 🛫 <b>Ruta:</b> {vueloSeleccionado.origen} ➔ {vueloSeleccionado.destino}
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={styles.label}>👤 Asignar Tripulante:</label>
                        <select 
                            onChange={e => {
                                const t = tripulantesList.find(x => x.id === e.target.value);
                                setTripulanteId(e.target.value);
                                setTripulanteNombre(t ? t.nombre : '');
                            }} 
                            style={styles.input}
                        >
                            <option value="">-- Seleccionar Tripulante --</option>
                            {tripulantesList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* FORMULARIO DE MANIOBRAS */}
            <div style={styles.grid3}>
                {/* VISUAL */}
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

                {/* IFR */}
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

                {/* NOCTURNO */}
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
    container: { padding: '15px', backgroundColor: '#f4f6f7', fontFamily: 'monospace' },
    header: { fontSize: '1.1rem', backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px' },
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
    vueloBadge: { marginTop: '8px', padding: '6px', backgroundColor: '#e8f8f5', border: '1px solid #27ae60', fontSize: '0.7rem', borderRadius: '3px' }
};

export default TrainingFormPage;