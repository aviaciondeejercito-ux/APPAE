import React, { useState, useEffect } from 'react';
import { EventService } from '../services/api'; 
import { Trash2, UserPlus, Shield, User, Clock, Award, X, Save, AlertTriangle } from 'lucide-react';

const Tripulantes = () => {
    const [tripulantes, setTripulantes] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Obtenemos la unidad del usuario logueado de forma segura
    const unidadUsuario = localStorage.getItem('elemento')?.toUpperCase() || 'B HELIC ASAL 601';

    const [nuevo, setNuevo] = useState({
        apellido: '', 
        nombre: '', 
        grado: 'ST', 
        unidad: unidadUsuario,
        totalesHistoricos: { vueloDiurno: 0, vueloNocturno: 0, vueloInstrumental: 0, vueloVisual: 0, aterrizajes: 0 }
    });

    const ordenGrados = ["CR", "TC", "MY", "CT", "TP", "TT", "ST", "SM", "SP", "SA", "SI", "SG", "CI", "CB"];

    useEffect(() => {
        cargarTripulantes();
    }, []);

    const cargarTripulantes = async () => {
        try {
            setLoading(true);
            const res = await EventService.getTripulantes();
            const ordenados = res.data.sort((a, b) => {
                const pesoA = ordenGrados.indexOf(a.grado);
                const pesoB = ordenGrados.indexOf(b.grado);
                return (pesoA === -1 ? 99 : pesoA) - (pesoB === -1 ? 99 : pesoB) || a.apellido.localeCompare(b.apellido);
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
            // Aseguramos que la unidad sea la que el backend espera (Error 400 fix)
            await EventService.createTripulante({ ...nuevo, unidad: unidadUsuario });
            setShowModal(false);
            setNuevo({ apellido: '', nombre: '', grado: 'ST', unidad: unidadUsuario, totalesHistoricos: { vueloDiurno: 0, vueloNocturno: 0, vueloInstrumental: 0, vueloVisual: 0, aterrizajes: 0 } });
            cargarTripulantes();
        } catch (error) {
            alert("Error al crear legajo: " + (error.response?.data?.mensaje || "Error de validación"));
        }
    };

    const eliminar = async (id) => {
        if (window.confirm("¿Confirmar eliminación de legajo? Esta acción se registrará en auditoría.")) {
            try {
                await EventService.deleteTripulante(id);
                cargarTripulantes();
                if (seleccionado?._id === id) setSeleccionado(null);
            } catch (error) {
                alert("No se pudo eliminar el registro");
            }
        }
    };

    return (
        <div style={styles.mainContainer}>
            {/* LISTADO LATERAL */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <Shield style={{color: '#f1c40f'}} size={16} />
                        <span style={{fontWeight: '900', fontSize: '0.7rem', letterSpacing: '1px'}}>PERSONAL UNIDAD</span>
                    </div>
                    <button onClick={() => setShowModal(true)} style={styles.btnAdd}>
                        <UserPlus size={14} style={{marginRight:'5px'}} /> ALTA
                    </button>
                </div>
                <div style={styles.listContainer}>
                    {loading ? (
                        <div style={{padding: '40px', textAlign: 'center', fontSize: '0.7rem', color: '#95a5a6', fontWeight: 'bold'}}>CONECTANDO...</div>
                    ) : (
                        tripulantes.map(t => (
                            <div key={t._id} onClick={() => setSeleccionado(t)}
                                style={{
                                    ...styles.item,
                                    backgroundColor: seleccionado?._id === t._id ? '#e3f2fd' : 'transparent',
                                    borderLeft: seleccionado?._id === t._id ? '4px solid #1b3a57' : '4px solid transparent'
                                }}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div>
                                        <div style={{fontSize: '0.6rem', fontWeight: '900', color: '#1b3a57'}}>{t.grado}</div>
                                        <div style={{fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase'}}>{t.apellido}, {t.nombre}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); eliminar(t._id); }} style={styles.btnTrash}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* VISTA DE DETALLE */}
            <div style={styles.content}>
                {seleccionado ? (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h2 style={{margin: 0, fontSize: '1.4rem', fontWeight: '900'}}>{seleccionado.grado} {seleccionado.apellido}</h2>
                            <p style={{margin: 0, fontSize: '0.75rem', opacity: 0.8, fontWeight: 'bold'}}>{seleccionado.nombre} | {seleccionado.unidad}</p>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={{display: 'flex', gap: '10px', marginBottom: '25px'}}>
                                <div style={{...styles.alert, backgroundColor: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#fff1f0' : '#f6ffed', color: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#cf1322' : '#389e0d', border: `1px solid ${seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#ffa39e' : '#b7eb8f'}`}}>
                                    PSICOFÍSICO: {seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'VENCIDO' : 'APTO'}
                                </div>
                                <div style={{...styles.alert, backgroundColor: seleccionado.estadoCertificaciones?.crmVencido ? '#fff1f0' : '#f6ffed', color: seleccionado.estadoCertificaciones?.crmVencido ? '#cf1322' : '#389e0d', border: `1px solid ${seleccionado.estadoCertificaciones?.crmVencido ? '#ffa39e' : '#b7eb8f'}`}}>
                                    CRM: {seleccionado.estadoCertificaciones?.crmVencido ? 'VENCIDO' : 'AL DÍA'}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}><Award size={14} style={{marginRight:'8px'}}/> HABILITACIONES SARM</h4>
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                                    {seleccionado.habilitaciones?.map((h, i) => (
                                        <div key={i} style={styles.subItem}>
                                            <span style={{fontWeight: '800'}}>{h.aeronave}</span>
                                            <span style={styles.badgeRol}>{h.rolActual}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}><Clock size={14} style={{marginRight:'8px'}}/> ESTADÍSTICAS DE VUELO</h4>
                                <div style={styles.statsGrid}>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>DIURNO</div>
                                        <div style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloDiurno || 0} <span style={{fontSize:'0.7rem'}}>HS</span></div>
                                    </div>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>NOCTURNO</div>
                                        <div style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloNocturno || 0} <span style={{fontSize:'0.7rem'}}>HS</span></div>
                                    </div>
                                    <div style={{...styles.statBox, backgroundColor: '#1b3a57', color: 'white', borderBottom:'none'}}>
                                        <div style={{...styles.statLabel, color: '#bdc3c7'}}>TOTAL GRAL</div>
                                        <div style={styles.statValue}>{seleccionado.totalVueloGeneral || 0} <span style={{fontSize:'0.7rem'}}>HS</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <User size={60} style={{marginBottom:'20px', opacity: 0.1}} />
                        <p style={{margin:0}}>SELECCIONE UN LEGAJO PARA INSPECCIÓN</p>
                    </div>
                )}
            </div>

            {/* MODAL DE ALTA */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <span>NUEVO LEGAJO DE VUELO</span>
                            <button onClick={() => setShowModal(false)} style={styles.btnClose}><X size={18}/></button>
                        </div>
                        <form onSubmit={manejarCrear} style={styles.modalBody}>
                            <div style={styles.formRow}>
                                <div style={{flex: 1}}>
                                    <label style={styles.label}>GRADO</label>
                                    <select style={styles.input} value={nuevo.grado} onChange={e => setNuevo({...nuevo, grado: e.target.value})}>
                                        {ordenGrados.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={styles.label}>UNIDAD</label>
                                    <input type="text" readOnly style={{...styles.input, backgroundColor: '#f5f5f5', color: '#888'}} value={unidadUsuario} />
                                </div>
                            </div>
                            <div>
                                <label style={styles.label}>APELLIDO</label>
                                <input type="text" required style={styles.input} value={nuevo.apellido} onChange={e => setNuevo({...nuevo, apellido: e.target.value.toUpperCase()})} placeholder="EJ: PEREZ" />
                            </div>
                            <div>
                                <label style={styles.label}>NOMBRE</label>
                                <input type="text" required style={styles.input} value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value.toUpperCase()})} placeholder="EJ: JUAN CARLOS" />
                            </div>
                            <button type="submit" style={styles.btnSave}>
                                <Save size={16} style={{marginRight:'10px'}}/> GUARDAR EN BASE DE DATOS
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    // 65px es la altura exacta del Navbar en App.jsx
    mainContainer: { display: 'flex', height: 'calc(100vh - 65px)', width: '100%', backgroundColor: '#f0f2f5', overflow: 'hidden', position: 'relative' },
    sidebar: { width: '300px', backgroundColor: 'white', borderRight: '1px solid #d1d8e0', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.05)' },
    sidebarHeader: { padding: '18px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    btnAdd: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: '900', display:'flex', alignItems:'center', transition: '0.2s hover' },
    listContainer: { flex: 1, overflowY: 'auto' },
    item: { padding: '15px 20px', borderBottom: '1px solid #f1f2f6', cursor: 'pointer', transition: '0.2s' },
    btnTrash: { background: 'none', border: 'none', color: '#d1d8e0', cursor: 'pointer', transition: '0.2s hover' },
    content: { flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', overflow: 'hidden', width: '100%', maxWidth: '850px' },
    cardHeader: { padding: '30px', backgroundColor: '#1b3a57', color: 'white', backgroundImage: 'linear-gradient(135deg, #1b3a57 0%, #2c3e50 100%)' },
    cardBody: { padding: '30px' },
    alert: { padding: '10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', flex: 1, textAlign: 'center', letterSpacing: '0.5px' },
    section: { marginBottom: '30px' },
    sectionTitle: { fontSize: '0.7rem', fontWeight: '900', color: '#1b3a57', borderBottom: '2px solid #f1f2f6', paddingBottom: '10px', marginBottom: '15px', display:'flex', alignItems:'center', textTransform: 'uppercase' },
    statsGrid: { display: 'flex', gap: '15px' },
    statBox: { flex: 1, padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', borderBottom: '4px solid #1b3a57' },
    statLabel: { fontSize: '0.55rem', fontWeight: '900', color: '#95a5a6', marginBottom: '5px', textTransform: 'uppercase' },
    statValue: { fontSize: '1.4rem', fontWeight: '900', color: '#2c3e50' },
    subItem: { padding: '12px', backgroundColor: '#f1f2f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' },
    badgeRol: { fontSize: '0.6rem', backgroundColor: 'white', padding: '3px 10px', borderRadius: '20px', border: '1px solid #d1d8e0', fontWeight: 'bold', color: '#7f8c8d' },
    emptyState: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.75rem' },
    overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(27, 58, 87, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' },
    modal: { backgroundColor: 'white', width: '420px', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' },
    modalHeader: { padding: '20px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '900', fontSize: '0.85rem' },
    modalBody: { padding: '30px', display: 'flex', flexDirection: 'column', gap: '15px' },
    formRow: { display: 'flex', gap: '15px' },
    label: { fontSize: '0.6rem', fontWeight: '900', color: '#1b3a57', marginBottom: '5px', textTransform: 'uppercase' },
    input: { padding: '12px', border: '1px solid #d1d8e0', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' },
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', marginTop: '10px' },
    btnClose: { background: 'none', border: 'none', color: 'white', cursor: 'pointer' }
};

export default Tripulantes;