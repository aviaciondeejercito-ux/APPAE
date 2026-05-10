import React, { useState, useEffect } from 'react';
import { EventService } from './services/api'; 

const Tripulantes = () => {
    const [tripulantes, setTripulantes] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Unidad del usuario para el alta automática
    const unidadUsuario = localStorage.getItem('elemento')?.toUpperCase() || 'B HELIC ASAL 601';

    const [nuevo, setNuevo] = useState({
        apellido: '', nombre: '', grado: 'ST', unidad: unidadUsuario
    });

    const ordenGrados = ["CR", "TC", "MY", "CT", "TP", "TT", "ST", "SM", "SP", "SA", "SI", "SG", "CI", "CB"];

    useEffect(() => {
        cargarTripulantes();
    }, []);

    const cargarTripulantes = async () => {
        try {
            setLoading(true);
            const res = await EventService.getTripulantes();
            // Ordenar por jerarquía antes de setear
            const ordenados = res.data.sort((a, b) => {
                const pesoA = ordenGrados.indexOf(a.grado);
                const pesoB = ordenGrados.indexOf(b.grado);
                return pesoA - pesoB || a.apellido.localeCompare(b.apellido);
            });
            setTripulantes(ordenados);
        } catch (error) {
            console.error("❌ Error al cargar personal:", error);
        } finally {
            setLoading(false);
        }
    };

    const manejarCrear = async (e) => {
        e.preventDefault();
        try {
            // Aseguramos que la unidad sea la correcta para evitar el Error 400
            const dataEnvio = { ...nuevo, unidad: unidadUsuario };
            await EventService.createTripulante(dataEnvio);
            setShowModal(false);
            setNuevo({ apellido: '', nombre: '', grado: 'ST', unidad: unidadUsuario });
            cargarTripulantes();
            alert("Legajo creado con éxito y registrado en auditoría.");
        } catch (error) {
            alert("Error al crear: " + (error.response?.data?.mensaje || "Error de validación del servidor"));
        }
    };

    const eliminar = async (id) => {
        if (window.confirm("¿Confirmar eliminación de legajo? Esta acción quedará registrada en el historial de auditoría.")) {
            try {
                await EventService.deleteTripulante(id);
                cargarTripulantes();
                if (seleccionado?._id === id) setSeleccionado(null);
            } catch (error) {
                alert("Error al eliminar el registro.");
            }
        }
    };

    return (
        <div style={styles.mainContainer}>
            {/* PANEL IZQUIERDO: LISTADO */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <span style={{fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px'}}>PERSONAL UNIDAD</span>
                    <button onClick={() => setShowModal(true)} style={styles.btnAdd}>+ ALTA</button>
                </div>
                <div style={styles.listContainer}>
                    {loading ? (
                        <div style={{padding: '40px', textAlign: 'center', fontSize: '0.7rem', color: '#95a5a6'}}>CONECTANDO CON SERVIDOR...</div>
                    ) : (
                        tripulantes.map(t => (
                            <div 
                                key={t._id} 
                                onClick={() => setSeleccionado(t)}
                                style={{
                                    ...styles.item,
                                    backgroundColor: seleccionado?._id === t._id ? '#e3f2fd' : 'transparent',
                                    borderLeft: seleccionado?._id === t._id ? '4px solid #1b3a57' : '4px solid transparent'
                                }}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                    <div>
                                        <div style={{fontSize: '0.65rem', fontWeight: 'bold', color: '#1b3a57'}}>{t.grado}</div>
                                        <div style={{fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase'}}>{t.apellido}, {t.nombre}</div>
                                        <div style={{fontSize: '0.6rem', color: '#7f8c8d'}}>{t.unidad}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); eliminar(t._id); }} style={styles.btnTrash}>🗑️</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PANEL DERECHO: LEGAJO DETALLADO */}
            <div style={styles.content}>
                {seleccionado ? (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h2 style={{margin: 0, fontSize: '1.4rem', fontWeight: '900', italic: 'italic'}}>
                                {seleccionado.grado} {seleccionado.apellido}
                            </h2>
                            <p style={{margin: 0, fontSize: '0.8rem', opacity: 0.8, fontWeight: 'bold'}}>
                                {seleccionado.nombre} | LEGAJO: {seleccionado._id.substring(18).toUpperCase()}
                            </p>
                        </div>
                        
                        <div style={styles.cardBody}>
                            {/* Alertas de Vencimiento Automáticas */}
                            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                                <div style={{...styles.alert, backgroundColor: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#fff1f0' : '#f6ffed', color: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#cf1322' : '#389e0d', border: `1px solid ${seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#ffa39e' : '#b7eb8f'}`}}>
                                    ⚠️ PSICOFÍSICO: {seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'VENCIDO' : 'AL DÍA'}
                                </div>
                                <div style={{...styles.alert, backgroundColor: seleccionado.estadoCertificaciones?.crmVencido ? '#fff1f0' : '#f6ffed', color: seleccionado.estadoCertificaciones?.crmVencido ? '#cf1322' : '#389e0d', border: `1px solid ${seleccionado.estadoCertificaciones?.crmVencido ? '#ffa39e' : '#b7eb8f'}`}}>
                                    🛡️ CRM: {seleccionado.estadoCertificaciones?.crmVencido ? 'VENCIDO' : 'AL DÍA'}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}>SISTEMAS DE ARMAS HABILITADOS</h4>
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                                    {seleccionado.habilitaciones?.length > 0 ? seleccionado.habilitaciones.map((h, i) => (
                                        <div key={i} style={styles.subItem}>
                                            <span style={{fontWeight: 'bold'}}>{h.aeronave}</span>
                                            <span style={styles.badgeRol}>{h.rolActual}</span>
                                        </div>
                                    )) : <p style={{fontSize: '0.7rem', color: '#999'}}>No registra habilitaciones vigentes.</p>}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}>TOTALES ACUMULADOS (HS)</h4>
                                <div style={styles.statsGrid}>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>DIURNO</div>
                                        <div style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloDiurno || 0}</div>
                                    </div>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>NOCTURNO</div>
                                        <div style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloNocturno || 0}</div>
                                    </div>
                                    <div style={{...styles.statBox, backgroundColor: '#1b3a57', color: 'white'}}>
                                        <div style={{...styles.statLabel, color: '#bdc3c7'}}>TOTAL GRAL</div>
                                        <div style={styles.statValue}>{seleccionado.totalVueloGeneral || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={{fontSize: '3rem', marginBottom: '10px'}}>👤</div>
                        Seleccione un tripulante para inspección de legajo
                    </div>
                )}
            </div>

            {/* MODAL DE ALTA - POSICIÓN ABSOLUTA SOBRE TODO */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <span>ALTA DE PERSONAL</span>
                            <button onClick={() => setShowModal(false)} style={styles.btnClose}>X</button>
                        </div>
                        <form onSubmit={manejarCrear} style={styles.modalBody}>
                            <div style={styles.formRow}>
                                <div style={{flex: 1}}>
                                    <label style={styles.label}>GRADO</label>
                                    <select 
                                        style={styles.input}
                                        value={nuevo.grado}
                                        onChange={e => setNuevo({...nuevo, grado: e.target.value})}
                                    >
                                        {ordenGrados.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={styles.label}>UNIDAD</label>
                                    <input type="text" readOnly style={{...styles.input, backgroundColor: '#eee', color: '#777'}} value={unidadUsuario} />
                                </div>
                            </div>

                            <label style={styles.label}>APELLIDO</label>
                            <input 
                                type="text" required style={styles.input}
                                value={nuevo.apellido}
                                onChange={e => setNuevo({...nuevo, apellido: e.target.value.toUpperCase()})}
                                placeholder="Ej: PEREZ"
                            />

                            <label style={styles.label}>NOMBRE</label>
                            <input 
                                type="text" required style={styles.input}
                                value={nuevo.nombre}
                                onChange={e => setNuevo({...nuevo, nombre: e.target.value.toUpperCase()})}
                                placeholder="Ej: JUAN CARLOS"
                            />

                            <div style={{padding: '10px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', fontSize: '0.6rem', color: '#856404', borderRadius: '4px'}}>
                                ℹ️ El alta se registrará automáticamente en la base de datos de <strong>{unidadUsuario}</strong>.
                            </div>

                            <button type="submit" style={styles.btnSave}>GUARDAR EN BASE DE DATOS</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SISTEMA DE ESTILOS INLINE (SINCRO JOKER) ---
const styles = {
    mainContainer: { display: 'flex', height: '100%', width: '100%', backgroundColor: '#f4f7f6', overflow: 'hidden' },
    sidebar: { width: '320px', backgroundColor: 'white', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' },
    sidebarHeader: { padding: '15px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    btnAdd: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 'bold', transition: '0.3s hover' },
    listContainer: { flex: 1, overflowY: 'auto' },
    item: { padding: '15px', borderBottom: '1px solid #eee', cursor: 'pointer', transition: '0.2s' },
    btnTrash: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.5 },
    content: { flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', justifyContent: 'center' },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', width: '100%', maxWidth: '900px', height: 'fit-content' },
    cardHeader: { padding: '30px', backgroundColor: '#1b3a57', color: 'white', backgroundImage: 'linear-gradient(45deg, #1b3a57 0%, #2c3e50 100%)' },
    cardBody: { padding: '30px' },
    alert: { padding: '8px 15px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', flex: 1, textAlign: 'center' },
    section: { marginBottom: '30px' },
    sectionTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#1b3a57', borderBottom: '2px solid #f1f2f6', paddingBottom: '8px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' },
    statsGrid: { display: 'flex', gap: '20px' },
    statBox: { flex: 1, padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderBottom: '4px solid #1b3a57' },
    statLabel: { fontSize: '0.6rem', fontWeight: 'bold', color: '#95a5a6', marginBottom: '5px' },
    statValue: { fontSize: '1.5rem', fontWeight: '900' },
    subItem: { padding: '12px', backgroundColor: '#f1f2f6', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    badgeRol: { fontSize: '0.6rem', backgroundColor: 'white', padding: '3px 8px', borderRadius: '10px', border: '1px solid #ddd', fontWeight: 'bold', color: '#7f8c8d' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' },
    overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modal: { backgroundColor: 'white', width: '450px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
    modalHeader: { padding: '15px 20px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' },
    modalBody: { padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' },
    formRow: { display: 'flex', gap: '15px' },
    label: { fontSize: '0.65rem', fontWeight: 'bold', color: '#1b3a57', marginBottom: '-10px' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', fontSize: '0.9rem', fontWeight: 'bold' },
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '10px' },
    btnClose: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }
};

export default Tripulantes;