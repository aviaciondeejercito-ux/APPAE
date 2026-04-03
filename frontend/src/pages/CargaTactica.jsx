import React, { useState, useEffect, useCallback } from 'react';
import { getActiveOperations, deleteEvent } from '../services/api';
import Swal from 'sweetalert2';

const CargaTactica = () => {
    const getUser = () => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : {};
        } catch { return {}; }
    };

    const user = getUser();
    const isMando = user.role === 'admin' || user.role === 'OTO' || 
                    ['boss', 'director', 'otoae'].includes(user.role?.toLowerCase()) ||
                    !user.role;

    const [misiones, setMisiones] = useState([]);
    const [loading, setLoading] = useState(false);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const evRes = await getActiveOperations();
            const events = Array.isArray(evRes) ? evRes : evRes.data || [];

            // Filtramos misiones en tiempo real según permisos de unidad o mando
            setMisiones(events.filter(ev => ev.isRealTime && (isMando || ev.elemento === user.elemento)));
        } catch (e) { 
            console.error("Error en la carga de datos:", e); 
        }
        setLoading(false);
    }, [isMando, user.elemento]);

    // Solo carga al montar el componente, sin intervalos automáticos
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const handleFinalizar = async (id) => {
        const res = await Swal.fire({ 
            title: '¿Finalizar?', 
            text: "Se eliminará el rastro del radar táctico", 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#d33', 
            confirmButtonText: 'ARRIBO / FINALIZAR' 
        });

        if (res.isConfirmed) { 
            try { 
                await deleteEvent(id); 
                cargarDatos(); 
            } catch { 
                Swal.fire('Error', 'Sin permisos para finalizar', 'error'); 
            } 
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* ESPACIO VACÍO PARA FUTURO FORMULARIO */}
                <div style={styles.emptyCard}>
                    <h2 style={styles.headerTitle}>⚡ SISTEMA DE CARGA</h2>
                    <p style={{color: '#888'}}>Control manual activado. El visor no se actualizará solo.</p>
                </div>

                {/* VISOR DE LOGS / RADAR TÁCTICO */}
                <div style={styles.logCard}>
                    <div style={styles.logHeader}>
                        <span>📡 RADAR TÁCTICO</span>
                        <button onClick={cargarDatos} style={styles.btnRefresh} disabled={loading}>
                            {loading ? 'CARGANDO...' : 'REFRESCAR'}
                        </button>
                    </div>
                    <div style={styles.scrollArea}>
                        {misiones.length === 0 ? (
                            <p style={styles.emptyMsg}>No hay operaciones activas</p>
                        ) : (
                            misiones.map(m => (
                                <div key={m._id} style={styles.misionItem}>
                                    <div style={styles.misionHeader}>
                                        <span style={styles.badge}>
                                            {m.misionDetalle?.aeronave || 'S/D'}
                                        </span> 
                                        <span style={styles.matriculaText}>
                                            {m.misionDetalle?.matricula || m.matricula || '---'}
                                        </span>
                                    </div>
                                    <div style={styles.misionTitle}>{m.title}</div>
                                    <div style={styles.misionSub}>{m.elemento}</div>
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
    emptyCard: { backgroundColor: '#2d2d2d', padding: '40px', borderRadius: '8px', textAlign: 'center', border: '2px dashed #444' },
    logCard: { backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: 'fit-content', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' },
    headerTitle: { margin: '0 0 20px 0', fontSize: '1.5rem', color: '#ffd700', borderBottom: '1px solid #444', paddingBottom: '10px' },
    logHeader: { padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', borderBottom: '1px solid #333' },
    scrollArea: { maxHeight: '75vh', overflowY: 'auto', padding: '10px' },
    misionItem: { backgroundColor: '#3d3d3d', padding: '12px', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #ffd700' },
    misionHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    badge: { backgroundColor: '#ffd700', color: '#000', padding: '2px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' },
    matriculaText: { color: '#00e5ff', fontWeight: 'bold', fontSize: '0.9rem' },
    misionTitle: { fontSize: '1.1rem', fontWeight: 'bold', margin: '2px 0', color: '#fff' },
    misionSub: { fontSize: '0.75rem', color: '#aaa', marginBottom: '8px' },
    btnRow: { marginTop: '10px' },
    btnSmallRed: { width: '100%', padding: '8px', fontSize: '0.75rem', backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' },
    btnRefresh: { padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#0277bd', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' },
    emptyMsg: { textAlign: 'center', color: '#888', marginTop: '20px', fontSize: '0.9rem' }
};

export default CargaTactica;