import React, { useState, useEffect } from 'react';
import { EventService } from '../services/api'; 
import { Trash2, UserPlus, Shield, User, Clock, Award, X, Save, AlertTriangle } from 'lucide-react';

const Tripulantes = () => {
    const [tripulantes, setTripulantes] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const unidadUsuario = localStorage.getItem('elemento')?.toUpperCase() || 'B HELIC ASAL 601';

    const [nuevo, setNuevo] = useState({
        apellido: '', nombre: '', grado: 'ST', unidad: unidadUsuario,
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
            await EventService.createTripulante(nuevo);
            setShowModal(false);
            setNuevo({ apellido: '', nombre: '', grado: 'ST', unidad: unidadUsuario, totalesHistoricos: { vueloDiurno: 0, vueloNocturno: 0, vueloInstrumental: 0, vueloVisual: 0, aterrizajes: 0 } });
            cargarTripulantes();
        } catch (error) {
            alert("Error al crear: " + (error.response?.data?.mensaje || "Error de conexión"));
        }
    };

    const eliminar = async (id) => {
        if (window.confirm("¿Confirmar eliminación de legajo? Se registrará en auditoría.")) {
            try {
                await EventService.deleteTripulante(id);
                cargarTripulantes();
                if (seleccionado?._id === id) setSeleccionado(null);
            } catch (error) {
                alert("Error al eliminar");
            }
        }
    };

    return (
        <div style={styles.mainContainer}>
            {/* PANEL IZQUIERDO: LISTADO */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <Shield className="text-yellow-500" size={16} />
                        <span style={{fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '1px'}}>PERSONAL AE</span>
                    </div>
                    <button onClick={() => setShowModal(true)} style={styles.btnAdd}>
                        <UserPlus size={14} style={{marginRight:'5px'}} /> ALTA
                    </button>
                </div>
                <div style={styles.listContainer}>
                    {loading ? (
                        <div style={{padding: '40px', textAlign: 'center', fontSize: '0.7rem', color: '#95a5a6'}}>CONECTANDO...</div>
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
                                        <div style={{fontSize: '0.6rem', fontWeight: 'bold', color: '#1b3a57'}}>{t.grado}</div>
                                        <div style={{fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase'}}>{t.apellido}, {t.nombre}</div>
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

            {/* PANEL DERECHO: DETALLE */}
            <div style={styles.content}>
                {seleccionado ? (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h2 style={{margin: 0, fontSize: '1.4rem', fontWeight: '900'}}>{seleccionado.grado} {seleccionado.apellido}</h2>
                            <p style={{margin: 0, fontSize: '0.75rem', opacity: 0.8}}>{seleccionado.nombre} | {seleccionado.unidad}</p>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                                <div style={{...styles.alert, backgroundColor: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#fff1f0' : '#f6ffed', color: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#cf1322' : '#389e0d', border: `1px solid ${seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#ffa39e' : '#b7eb8f'}`}}>
                                    PSICOFÍSICO: {seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'VENCIDO' : 'APTO'}
                                </div>
                                <div style={{...styles.alert, backgroundColor: seleccionado.estadoCertificaciones?.crmVencido ? '#fff1f0' : '#f6ffed', color: seleccionado.estadoCertificaciones?.crmVencido ? '#cf1322' : '#389e0d', border: `1px solid ${seleccionado.estadoCertificaciones?.crmVencido ? '#ffa39e' : '#b7eb8f'}`}}>
                                    CRM: {seleccionado.estadoCertificaciones?.crmVencido ? 'VENCIDO' : 'AL DÍA'}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}><Award size={14} style={{marginRight:'5px'}}/> SISTEMAS DE ARMAS</h4>
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px'}}>
                                    {seleccionado.habilitaciones?.map((h, i) => (
                                        <div key={i} style={styles.subItem}>
                                            <span style={{fontWeight: 'bold'}}>{h.aeronave}</span>
                                            <span style={styles.badgeRol}>{h.rolActual}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}><Clock size={14} style={{marginRight:'5px'}}/> TOTALES ACUMULADOS</h4>
                                <div style={styles.statsGrid}>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>DIURNO</div>
                                        <div style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloDiurno || 0} HS</div>
                                    </div>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>NOCTURNO</div>
                                        <div style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloNocturno || 0} HS</div>
                                    </div>
                                    <div style={{...styles.statBox, backgroundColor: '#1b3a57', color: 'white'}}>
                                        <div style={{...styles.statLabel, color: '#bdc3c7'}}>TOTAL GRAL</div>
                                        <div style={styles.statValue}>{seleccionado.totalVueloGeneral || 0} HS</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <Shield size={60} style={{marginBottom:'15px', opacity:0.2}} />
                        Seleccione un legajo para inspección
                    </div>
                )}
            </div>

            {/* MODAL DE ALTA */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <span>NUEVO LEGAJO</span>
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
                                    <input type="text" readOnly style={{...styles.input, backgroundColor: '#eee'}} value={unidadUsuario} />
                                </div>
                            </div>
                            <div>
                                <label style={styles.label}>APELLIDO</label>
                                <input type="text" required style={styles.input} value={nuevo.apellido} onChange={e => setNuevo({...nuevo, apellido: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                                <label style={styles.label}>NOMBRE</label>
                                <input type="text" required style={styles.input} value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value.toUpperCase()})} />
                            </div>
                            <button type="submit" style={styles.btnSave}><Save size={16} style={{marginRight:'8px'}}/> GUARDAR LEGAJO</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    mainContainer: { display: 'flex', height: 'calc(100vh - 65px)', width: '100%', backgroundColor: '#f4f7f6', overflow: 'hidden' },
    sidebar: { width: '280px', backgroundColor: 'white', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' },
    sidebarHeader: { padding: '15px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    btnAdd: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 'bold', display:'flex', alignItems:'center' },
    listContainer: { flex: 1, overflowY: 'auto' },
    item: { padding: '12px 15px', borderBottom: '1px solid #eee', cursor: 'pointer' },
    btnTrash: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' },
    content: { flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', justifyContent: 'center' },
    card: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden', width: '100%', maxWidth: '850px', height: 'fit-content' },
    cardHeader: { padding: '25px', backgroundColor: '#1b3a57', color: 'white', backgroundImage: 'linear-gradient(45deg, #1b3a57 0%, #2c3e50 100%)' },
    cardBody: { padding: '25px' },
    alert: { padding: '8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', flex: 1, textAlign: 'center' },
    section: { marginBottom: '25px' },
    sectionTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#1b3a57', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px', display:'flex', alignItems:'center' },
    statsGrid: { display: 'flex', gap: '15px' },
    statBox: { flex: 1, padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', borderBottom: '3px solid #1b3a57' },
    statLabel: { fontSize: '0.55rem', fontWeight: 'bold', color: '#95a5a6' },
    statValue: { fontSize: '1.2rem', fontWeight: 'bold' },
    subItem: { padding: '10px', backgroundColor: '#f1f2f6', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' },
    badgeRol: { fontSize: '0.6rem', backgroundColor: 'white', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ddd' },
    emptyState: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize:'0.7rem' },
    overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 },
    modal: { backgroundColor: 'white', width: '400px', borderRadius: '8px', overflow: 'hidden' },
    modalHeader: { padding: '15px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '0.8rem' },
    modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    formRow: { display: 'flex', gap: '10px' },
    label: { fontSize: '0.6rem', fontWeight: 'bold', color: '#7f8c8d' },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', fontSize: '0.85rem', width:'100%', boxSizing:'border-box' },
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem' },
    btnClose: { background: 'none', border: 'none', color: 'white', cursor: 'pointer' }
};

export default Tripulantes;