import React, { useState, useEffect, useCallback } from 'react';
import { getActiveOperations, createEvent, deleteEvent, getAircrafts } from '../services/api';
import Swal from 'sweetalert2';

const CargaTactica = () => {
    const getUser = () => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : {};
        } catch { return {}; }
    };

    const user = getUser();
    const userElemento = localStorage.getItem('elemento') || user.elemento || "SIN UNIDAD";

    const isMando = user.role === 'admin' || user.role === 'OTO' || 
                    ['boss', 'director', 'otoae'].includes(user.role?.toLowerCase()) ||
                    !user.role;

    const [misiones, setMisiones] = useState([]);
    const [aeronaves, setAeronaves] = useState([]); // Nuevo estado para la flota
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [selectedMatricula, setSelectedMatricula] = useState('');

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Cargar operaciones activas
            const evRes = await getActiveOperations();
            const events = Array.isArray(evRes) ? evRes : [];
            setMisiones(events.filter(ev => ev.isRealTime && (isMando || ev.elemento === userElemento)));

            // 2. Cargar flota disponible desde DB
            const airRes = await getAircrafts();
            const dataAeronaves = Array.isArray(airRes) ? airRes : airRes.data || [];
            
            // LOG DE DEPURACIÓN
            console.log("--- DEPURACIÓN AERONAVES ---");
            console.log("Total aeronaves recibidas:", dataAeronaves.length);
            if (dataAeronaves.length > 0) {
                console.log("Ejemplo primer aeronave:", dataAeronaves[0]);
                const filtradas = dataAeronaves.filter(a => a.condicion === 'E/S');
                console.log("Aeronaves que pasan el filtro E/S:", filtradas.length);
            }
            
            setAeronaves(dataAeronaves);
        } catch (e) { 
            console.error("Error en la carga de datos:", e); 
        }
        setLoading(false);
    }, [isMando, userElemento]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Buscamos la aeronave seleccionada en nuestra lista local para obtener sus datos de DB
        const aeroInfo = aeronaves.find(a => a.matricula === selectedMatricula);

        if (!title.trim() || !selectedMatricula || !aeroInfo) {
            Swal.fire('Atención', 'Debe completar el indicativo y seleccionar una aeronave', 'warning');
            return;
        }

        const payload = {
            title: title.toUpperCase().trim(),
            elemento: aeroInfo.unidad || aeroInfo.elemento || userElemento,
            isRealTime: true,
            status: 'E/S',
            // Datos críticos extraídos de la base de datos:
            tipoIcono: aeroInfo.tipoIcono, 
            matricula: aeroInfo.matricula,
            aeronave: aeroInfo.sda
        };

        try {
            await createEvent(payload);
            Swal.fire({ title: 'ÉXITO', text: 'Vuelo lanzado al radar', icon: 'success', timer: 1500, showConfirmButton: false });
            setTitle('');
            setSelectedMatricula('');
            cargarDatos();
        } catch (err) {
            Swal.fire('Error', 'No se pudo registrar el vuelo.', 'error');
        }
    };

    const handleFinalizar = async (id) => {
        const res = await Swal.fire({ 
            title: '¿Arribo de aeronave?', 
            text: "Se finalizará la operación en el radar",
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#d33', 
            confirmButtonText: 'CONFIRMAR ARRIBO' 
        });

        if (res.isConfirmed) { 
            try { 
                await deleteEvent(id); 
                cargarDatos(); 
            } catch { 
                Swal.fire('Error', 'No se pudo finalizar la operación', 'error'); 
            } 
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                
                <div style={styles.card}>
                    <h2 style={styles.headerTitle}>⚡ DESPACHO TÁCTICO</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={styles.label}>INDICATIVO DE VUELO (CALLSIGN)</label>
                            <input 
                                style={styles.input} 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="Ej: HALCON 1" 
                                required 
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={styles.label}>SELECCIONAR AERONAVE (SdA)</label>
                            <select 
                                style={styles.input}
                                value={selectedMatricula}
                                onChange={e => setSelectedMatricula(e.target.value)}
                                required
                            >
                                <option value="">-- SELECCIONE MATRÍCULA --</option>
                                {/* FILTRO: Solo aeronaves con condicion "E/S" */}
                                {aeronaves
                                    .filter(a => String(a.condicion).trim().toUpperCase() === 'E/S')
                                    .map(a => (
                                        <option key={a._id} value={a.matricula}>
                                            {a.matricula} - {a.sda} ({a.unidad})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <button type="submit" style={styles.btn} disabled={loading}>
                            {loading ? 'PROCESANDO...' : 'LANZAR OPERACIÓN'}
                        </button>
                    </form>
                </div>

                <div style={styles.logCard}>
                    <div style={styles.logHeader}>
                        <span>📡 RADAR TÁCTICO</span>
                        <button onClick={cargarDatos} style={styles.btnRefresh} disabled={loading}>
                            {loading ? '...' : 'REFRESCAR'}
                        </button>
                    </div>
                    <div style={styles.scrollArea}>
                        {misiones.length === 0 ? (
                            <p style={styles.emptyMsg}>No hay vuelos activos</p>
                        ) : (
                            misiones.map(m => (
                                <div key={m._id} style={styles.misionItem}>
                                    <div style={styles.misionHeader}>
                                        <span style={styles.badge}>{m.matricula}</span>
                                        <span style={styles.elementoText}>{m.elemento}</span>
                                    </div>
                                    <div style={styles.misionTitle}>{m.title}</div>
                                    <div style={styles.btnRow}>
                                        <button onClick={() => handleFinalizar(m._id)} style={styles.btnSmallRed}>
                                            ARRIBO / FINALIZAR
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

const styles = {
    page: { padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    container: { display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', maxWidth: '1200px', margin: '0 auto' },
    card: { backgroundColor: '#2d2d2d', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', height: 'fit-content' },
    logCard: { backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: 'fit-content', border: '1px solid #444' },
    headerTitle: { margin: '0 0 20px 0', fontSize: '1.4rem', color: '#ffd700', borderBottom: '1px solid #444', paddingBottom: '10px' },
    label: { fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '10px', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#3d3d3d', color: '#fff', fontSize: '1.1rem', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '15px', backgroundColor: '#1b5e20', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px' },
    logHeader: { padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '0.9rem' },
    scrollArea: { maxHeight: '75vh', overflowY: 'auto', padding: '12px' },
    misionItem: { backgroundColor: '#3d3d3d', padding: '15px', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #ffd700' },
    misionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    badge: { backgroundColor: '#ffd700', color: '#000', padding: '2px 8px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' },
    elementoText: { color: '#aaa', fontSize: '0.75rem', fontWeight: 'bold' },
    misionTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginBottom: '10px' },
    btnRow: { marginTop: '5px' },
    btnSmallRed: { width: '100%', padding: '10px', fontSize: '0.8rem', backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' },
    btnRefresh: { padding: '5px 12px', fontSize: '0.75rem', backgroundColor: '#0277bd', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' },
    emptyMsg: { textAlign: 'center', color: '#777', marginTop: '20px', fontStyle: 'italic' }
};

export default CargaTactica;