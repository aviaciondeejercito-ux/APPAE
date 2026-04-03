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
    const [aeronaves, setAeronaves] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [selectedMatricula, setSelectedMatricula] = useState('');

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const evRes = await getActiveOperations();
            const events = Array.isArray(evRes) ? evRes : [];
            setMisiones(events.filter(ev => ev.isRealTime && (isMando || ev.elemento === userElemento)));

            const airRes = await getAircrafts();
            const dataAeronaves = Array.isArray(airRes) ? airRes : airRes.data || [];
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
        
        const aeroInfo = aeronaves.find(a => a.matricula === selectedMatricula);

        if (!title.trim() || !selectedMatricula || !aeroInfo) {
            Swal.fire('Atención', 'Debe completar el indicativo y seleccionar una aeronave', 'warning');
            return;
        }

        const payload = {
            title: title.toUpperCase().trim(),
            elemento: aeroInfo.unidad || aeroInfo.elemento || userElemento,
            isRealTime: true,
            status: aeroInfo.estado, 
            tipoIcono: aeroInfo.tipoIcono, 
            matricula: aeroInfo.matricula,
            aeronave: aeroInfo.sda
        };

        try {
            await createEvent(payload);
            Swal.fire({ 
                title: 'OPERACIÓN LANZADA', 
                text: 'Vuelo registrado en el sistema de seguimiento', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false,
                background: '#1a1a1a',
                color: '#fff'
            });
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
            confirmButtonColor: '#c62828', 
            cancelButtonColor: '#444',
            confirmButtonText: 'CONFIRMAR ARRIBO',
            background: '#1a1a1a',
            color: '#fff'
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
                
                {/* SECCIÓN IZQUIERDA: FORMULARIO DE DESPACHO */}
                <div style={styles.card}>
                    <div style={styles.headerDecoration}></div>
                    <h2 style={styles.headerTitle}>🛩️ DESPACHO TÁCTICO</h2>
                    <p style={styles.subHeader}>SISTEMA DE GESTIÓN DE VUELO - {userElemento}</p>
                    
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>INDICATIVO DE VUELO (CALLSIGN)</label>
                            <input 
                                style={styles.input} 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="EJ: HALCON 1" 
                                required 
                            />
                        </div>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>AERONAVE DISPONIBLE (SdA)</label>
                            <select 
                                style={styles.select}
                                value={selectedMatricula}
                                onChange={e => setSelectedMatricula(e.target.value)}
                                required
                            >
                                <option value="">-- SELECCIONE MATRÍCULA --</option>
                                {aeronaves
                                    .filter(a => a.estado === 'E/S') 
                                    .map(a => (
                                        <option key={a._id} value={a.matricula}>
                                            {a.matricula} | {a.sda} ({a.unidad})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <button type="submit" style={styles.btnLaunch} disabled={loading}>
                            {loading ? 'PROCESANDO...' : 'LANZAR OPERACIÓN'}
                        </button>
                    </form>
                </div>

                {/* SECCIÓN DERECHA: RADAR / LOG */}
                <div style={styles.logCard}>
                    <div style={styles.logHeader}>
                        <span style={styles.radarText}>📡 MONITOR DE OPERACIONES</span>
                        <button onClick={cargarDatos} style={styles.btnRefresh} disabled={loading}>
                            {loading ? '...' : 'SINCRO'}
                        </button>
                    </div>
                    
                    <div style={styles.scrollArea}>
                        {misiones.length === 0 ? (
                            <div style={styles.emptyBox}>
                                <p style={styles.emptyMsg}>SIN ACTIVIDAD EN EL RADAR</p>
                            </div>
                        ) : (
                            misiones.map(m => (
                                <div key={m._id} style={styles.misionItem}>
                                    <div style={styles.misionHeader}>
                                        <span style={styles.badgeMatricula}>{m.matricula}</span>
                                        <span style={styles.tagElemento}>{m.elemento}</span>
                                    </div>
                                    <div style={styles.misionTitle}>{m.title}</div>
                                    <div style={styles.misionSub}>{m.aeronave}</div>
                                    <button onClick={() => handleFinalizar(m._id)} style={styles.btnFinish}>
                                        NOTIFICAR ARRIBO
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={styles.logFooter}>
                        MODO: TÁCTICO REAL-TIME
                    </div>
                </div>

            </div>
        </div>
    );
};

const styles = {
    page: { 
        padding: '30px', 
        backgroundColor: '#0d1117', // Negro azulado profundo
        minHeight: '100vh', 
        color: '#e6edf3', 
        fontFamily: "'Segoe UI', Tahoma, sans-serif" 
    },
    container: { 
        display: 'grid', 
        gridTemplateColumns: '1fr 380px', 
        gap: '25px', 
        maxWidth: '1300px', 
        margin: '0 auto' 
    },
    // Estilo de la Carta de Despacho
    card: { 
        backgroundColor: '#161b22', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.7)', 
        height: 'fit-content',
        border: '1px solid #30363d',
        position: 'relative',
        overflow: 'hidden'
    },
    headerDecoration: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '4px',
        background: 'linear-gradient(90deg, #0056b3, #00a8ff)'
    },
    headerTitle: { 
        margin: '0 0 5px 0', 
        fontSize: '1.6rem', 
        color: '#fff', 
        fontWeight: '800',
        letterSpacing: '1px'
    },
    subHeader: {
        color: '#58a6ff',
        fontSize: '0.85rem',
        margin: '0 0 25px 0',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    fieldGroup: { marginBottom: '20px' },
    label: { 
        fontSize: '0.75rem', 
        color: '#8b949e', 
        display: 'block', 
        marginBottom: '8px', 
        fontWeight: '700',
        letterSpacing: '0.5px'
    },
    input: { 
        width: '100%', 
        padding: '14px', 
        borderRadius: '6px', 
        border: '1px solid #30363d', 
        backgroundColor: '#0d1117', 
        color: '#fff', 
        fontSize: '1.1rem', 
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.3s'
    },
    select: { 
        width: '100%', 
        padding: '14px', 
        borderRadius: '6px', 
        border: '1px solid #30363d', 
        backgroundColor: '#0d1117', 
        color: '#fff', 
        fontSize: '1rem', 
        boxSizing: 'border-box',
        cursor: 'pointer'
    },
    btnLaunch: { 
        width: '100%', 
        padding: '16px', 
        backgroundColor: '#1f6feb', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '800', 
        fontSize: '1.1rem', 
        marginTop: '10px',
        boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
        transition: 'all 0.2s ease'
    },

    // Estilo del Monitor (Radar)
    logCard: { 
        backgroundColor: '#161b22', 
        borderRadius: '12px', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '80vh', 
        border: '1px solid #30363d',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    },
    logHeader: { 
        padding: '15px 20px', 
        backgroundColor: '#0d1117', 
        borderRadius: '12px 12px 0 0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid #30363d'
    },
    radarText: { color: '#fff', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '1px' },
    btnRefresh: { 
        padding: '6px 15px', 
        fontSize: '0.7rem', 
        backgroundColor: '#30363d', 
        color: '#c9d1d9', 
        border: '1px solid #8b949e', 
        borderRadius: '20px', 
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    scrollArea: { flex: 1, overflowY: 'auto', padding: '15px' },
    emptyBox: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #30363d',
        borderRadius: '8px'
    },
    emptyMsg: { color: '#484f58', fontWeight: 'bold', fontSize: '0.8rem' },
    
    // Items de misión en el log
    misionItem: { 
        backgroundColor: '#0d1117', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px', 
        border: '1px solid #30363d',
        borderLeft: '5px solid #58a6ff'
    },
    misionHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    badgeMatricula: { 
        backgroundColor: '#30363d', 
        color: '#58a6ff', 
        padding: '3px 10px', 
        borderRadius: '4px', 
        fontSize: '0.75rem', 
        fontWeight: '800',
        border: '1px solid #58a6ff'
    },
    tagElemento: { color: '#8b949e', fontSize: '0.7rem', fontWeight: '700' },
    misionTitle: { fontSize: '1.3rem', fontWeight: '900', color: '#fff', marginBottom: '2px' },
    misionSub: { fontSize: '0.8rem', color: '#8b949e', marginBottom: '12px', fontWeight: '500' },
    btnFinish: { 
        width: '100%', 
        padding: '10px', 
        fontSize: '0.75rem', 
        backgroundColor: 'transparent', 
        color: '#f85149', 
        border: '1px solid #f85149', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontWeight: 'bold',
        transition: 'all 0.2s'
    },
    logFooter: {
        padding: '10px',
        backgroundColor: '#0d1117',
        textAlign: 'center',
        fontSize: '0.65rem',
        color: '#484f58',
        borderRadius: '0 0 12px 12px',
        borderTop: '1px solid #30363d',
        fontWeight: 'bold'
    }
};

export default CargaTactica;