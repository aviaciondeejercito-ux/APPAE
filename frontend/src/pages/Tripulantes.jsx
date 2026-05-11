import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight, UserPlus, AlertCircle, Clock, ShieldCheck, X, Save, Edit3, Trash2, PlusCircle, Calendar, Award } from 'lucide-react';
import { getTripulantes, createTripulante, updateTripulante, deleteTripulante } from '../services/api';
// Nota: Asegúrate de agregar 'updateHabilitacion' en tu archivo de servicios si no existe, o usa updateTripulante general.

const Tripulantes = () => {
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // ESTADOS DE MODALES
    const [showAltaModal, setShowAltaModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'certificaciones', 'horas', 'habilitacion'

    const [formData, setFormData] = useState({});

    const [user] = useState({
        role: localStorage.getItem('role')?.toLowerCase() || 'user',
        unidad: localStorage.getItem('elemento')?.trim().toUpperCase() || '' 
    });

    const unidadesAE = ["B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"];
    const gradosAE = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST', 'SM', 'SP', 'SA', 'SI', 'SG', 'CI', 'CB'];
    const aeronavesAE = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"];
    const rolesVuelo = ['Mecánico', 'Copiloto', 'Piloto', 'Instructor', 'Normalizador', 'Inspector'];

    useEffect(() => { fetchPersonal(); }, []);

    const fetchPersonal = async () => {
        try {
            setLoading(true);
            const response = await getTripulantes();
            setPersonal(response.data || []);
            if (seleccionado) {
                const actualizado = response.data.find(p => p._id === seleccionado._id);
                setSeleccionado(actualizado);
            }
        } catch (error) { console.error("❌ Error:", error); } finally { setLoading(false); }
    };

    const handleOpenAlta = () => {
        setFormData({ grado: '', apellido: '', nombre: '', unidad: user.role === 'admin' ? '' : user.unidad });
        setShowAltaModal(true);
    };

    const handleOpenEdit = (type) => {
        setModalType(type);
        if (type === 'certificaciones') setFormData(seleccionado.certificaciones || {});
        if (type === 'horas') setFormData(seleccionado.totalesHistoricos || {});
        if (type === 'habilitacion') setFormData({ aeronave: '', rolActual: '', fechaHabilitacion: '' });
        setShowEditModal(true);
    };

    const handleAction = async (e) => {
        e.preventDefault();
        try {
            if (showAltaModal) {
                await createTripulante(formData);
            } else {
                // Lógica para actualizaciones parciales
                let payload = {};
                if (modalType === 'certificaciones') payload = { certificaciones: formData };
                if (modalType === 'horas') payload = { totalesHistoricos: formData };
                if (modalType === 'habilitacion') {
                    // Aquí llamamos a la lógica acumulativa
                    const response = await fetch(`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://appae.onrender.com'}/api/tripulantes/${seleccionado._id}/habilitacion`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify(formData)
                    });
                    if (response.ok) { fetchPersonal(); setShowEditModal(false); return; }
                }
                await updateTripulante(seleccionado._id, payload);
            }
            setShowAltaModal(false);
            setShowEditModal(false);
            fetchPersonal();
        } catch (error) { alert("Error en la operación"); }
    };

    const handleDelete = async () => {
        if (window.confirm(`¿Está seguro de eliminar el legajo de ${seleccionado.apellido}? Esta acción es irreversible.`)) {
            try {
                await deleteTripulante(seleccionado._id);
                setSeleccionado(null);
                fetchPersonal();
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    const personalFiltrado = personal.filter(p => p.apellido?.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div style={styles.dashboardContainer}>
            {/* BARRA LATERAL */}
            <div style={styles.sidebar}>
                <div style={styles.altaBox}>
                    <button style={styles.btnAlta} onClick={handleOpenAlta}>
                        <UserPlus size={18} /> <span>Alta de Personal</span>
                    </button>
                </div>
                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input type="text" placeholder="Buscar..." style={styles.input} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <div style={styles.listContainer}>
                    {personalFiltrado.map(p => (
                        <div key={p._id} onClick={() => setSeleccionado(p)} style={{...styles.personItem, backgroundColor: seleccionado?._id === p._id ? '#e3f2fd' : 'white'}}>
                            <div style={styles.personInfo}>
                                <span style={styles.itemGrado}>{p.grado} - {p.unidad}</span>
                                <span style={styles.itemNombre}>{p.apellido}, {p.nombre}</span>
                            </div>
                            <ChevronRight size={16} color="#bdc3c7" />
                        </div>
                    ))}
                </div>
            </div>

            {/* VISTA PRINCIPAL */}
            <div style={styles.mainView}>
                {seleccionado ? (
                    <div style={styles.legajoCard}>
                        <div style={styles.legajoHeader}>
                            <div style={styles.avatar}><User size={35} color="white" /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h2 style={styles.legajoTitle}>{seleccionado.grado} {seleccionado.apellido}, {seleccionado.nombre}</h2>
                                    {user.role === 'admin' && <button onClick={handleDelete} style={styles.btnDelete}><Trash2 size={16}/></button>}
                                </div>
                                <span style={styles.legajoSubtitle}>{seleccionado.unidad}</span>
                            </div>
                        </div>

                        <div style={styles.legajoBody}>
                            {/* SECCIÓN 1: VENCIMIENTOS */}
                            <div style={styles.sectionHeader}>
                                <ShieldCheck size={18} /> <span>CERTIFICACIONES Y VENCIMIENTOS</span>
                                <button onClick={() => handleOpenEdit('certificaciones')} style={styles.btnEditSmall}><Edit3 size={14}/></button>
                            </div>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}>
                                    <span style={styles.statLabel}>PSICOFÍSICO</span>
                                    <span style={{...styles.statValue, color: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#e74c3c' : '#27ae60'}}>
                                        {seleccionado.certificaciones?.psicofisico?.vencimiento ? new Date(seleccionado.certificaciones.psicofisico.vencimiento).toLocaleDateString() : 'SIN DATOS'}
                                    </span>
                                </div>
                                <div style={styles.statCard}>
                                    <span style={styles.statLabel}>CRM</span>
                                    <span style={{...styles.statValue, color: seleccionado.estadoCertificaciones?.crmVencido ? '#e74c3c' : '#27ae60'}}>
                                        {seleccionado.certificaciones?.crm?.vencimiento ? new Date(seleccionado.certificaciones.crm.vencimiento).toLocaleDateString() : 'SIN DATOS'}
                                    </span>
                                </div>
                            </div>

                            {/* SECCIÓN 2: HORAS TOTALES */}
                            <div style={styles.sectionHeader}>
                                <Clock size={18} /> <span>TOTALES HISTÓRICOS (LIBRETA)</span>
                                <button onClick={() => handleOpenEdit('horas')} style={styles.btnEditSmall}><Edit3 size={14}/></button>
                            </div>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}><span style={styles.statLabel}>DIURNO</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloDiurno || 0} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>NOCTURNO</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloNocturno || 0} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>INSTRUMENTAL</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloInstrumental || 0} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>NVG</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloVisual || 0} hs</span></div>
                            </div>

                            {/* SECCIÓN 3: HABILITACIONES ACUMULATIVAS */}
                            <div style={styles.sectionHeader}>
                                <Award size={18} /> <span>HABILITACIONES SdA Y ANTIGÜEDAD</span>
                                <button onClick={() => handleOpenEdit('habilitacion')} style={styles.btnAddSmall}><PlusCircle size={14}/> AGREGAR</button>
                            </div>
                            <div style={styles.habilitacionesList}>
                                {seleccionado.habilitaciones?.length > 0 ? seleccionado.habilitaciones.map((h, i) => (
                                    <div key={i} style={styles.habItem}>
                                        <div style={styles.habInfo}>
                                            <strong>{h.aeronave}</strong>
                                            <span>{h.rolActual}</span>
                                        </div>
                                        <div style={styles.habYears}>
                                            <Calendar size={14} />
                                            <span>{Math.floor((new Date() - new Date(h.fechaHabilitacion)) / (1000 * 60 * 60 * 24 * 365))} años de exp.</span>
                                        </div>
                                    </div>
                                )) : <div style={styles.emptyMsg}>Sin habilitaciones registradas</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}><User size={60} color="#dcdde1" /><h3>Consola de Legajos AE</h3></div>
                )}
            </div>

            {/* MODAL MULTIUSO (ALTA Y EDICIÓN) */}
            {(showAltaModal || showEditModal) && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>{showAltaModal ? 'Nuevo Tripulante' : `Editar ${modalType.toUpperCase()}`}</h3>
                            <X size={24} style={{cursor:'pointer'}} onClick={() => {setShowAltaModal(false); setShowEditModal(false);}} />
                        </div>
                        <form onSubmit={handleAction} style={styles.form}>
                            {showAltaModal && (
                                <>
                                    <select style={styles.formInput} onChange={e => setFormData({...formData, grado: e.target.value})} required>
                                        <option value="">Grado...</option>{gradosAE.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <input type="text" placeholder="Apellido" style={styles.formInput} onChange={e => setFormData({...formData, apellido: e.target.value.toUpperCase()})} required />
                                    <input type="text" placeholder="Nombre" style={styles.formInput} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                                    <select style={styles.formInput} value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} required>
                                        <option value="">Unidad...</option>{unidadesAE.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </>
                            )}
                            {modalType === 'certificaciones' && (
                                <>
                                    <label style={styles.label}>Vencimiento Psicofísico</label>
                                    <input type="date" style={styles.formInput} value={formData.psicofisico?.vencimiento?.split('T')[0]} onChange={e => setFormData({...formData, psicofisico: {...formData.psicofisico, vencimiento: e.target.value}})} />
                                    <label style={styles.label}>Vencimiento CRM</label>
                                    <input type="date" style={styles.formInput} value={formData.crm?.vencimiento?.split('T')[0]} onChange={e => setFormData({...formData, crm: {...formData.crm, vencimiento: e.target.value}})} />
                                </>
                            )}
                            {modalType === 'horas' && (
                                <div style={styles.row}>
                                    <input type="number" placeholder="Diurno" style={styles.formInput} value={formData.vueloDiurno} onChange={e => setFormData({...formData, vueloDiurno: e.target.value})} />
                                    <input type="number" placeholder="Nocturno" style={styles.formInput} value={formData.vueloNocturno} onChange={e => setFormData({...formData, vueloNocturno: e.target.value})} />
                                </div>
                            )}
                            {modalType === 'habilitacion' && (
                                <>
                                    <select style={styles.formInput} onChange={e => setFormData({...formData, aeronave: e.target.value})} required>
                                        <option value="">Aeronave...</option>{aeronavesAE.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <select style={styles.formInput} onChange={e => setFormData({...formData, rolActual: e.target.value})} required>
                                        <option value="">Capacidad...</option>{rolesVuelo.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <label style={styles.label}>Fecha de Habilitación Inicial</label>
                                    <input type="date" style={styles.formInput} onChange={e => setFormData({...formData, fechaHabilitacion: e.target.value})} required />
                                </>
                            )}
                            <button type="submit" style={styles.btnSave}><Save size={18} /> Guardar Cambios</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    dashboardContainer: { display: 'flex', height: '100%', width: '100%', backgroundColor: '#f4f7f6', overflow: 'hidden' },
    sidebar: { width: '350px', borderRight: '1px solid #dcdde1', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' },
    altaBox: { padding: '20px' },
    btnAlta: { width: '100%', backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' },
    searchBox: { padding: '0 20px 20px 20px' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', padding: '10px', borderRadius: '10px' },
    searchIcon: { color: '#7f8c8d', marginRight: '10px' },
    input: { border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%' },
    listContainer: { flex: 1, overflowY: 'auto' },
    personItem: { padding: '15px 20px', borderBottom: '1px solid #f1f2f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    personInfo: { display: 'flex', flexDirection: 'column' },
    itemGrado: { fontSize: '0.65rem', color: '#1b3a57', fontWeight: 'bold' },
    itemNombre: { fontSize: '0.95rem', color: '#2f3640', fontWeight: '600' },
    mainView: { flex: 1, padding: '25px', overflowY: 'auto' },
    legajoCard: { backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' },
    legajoHeader: { padding: '25px', borderBottom: '1px solid #f1f2f6', display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#1b3a57', color: 'white', borderRadius: '15px 15px 0 0' },
    avatar: { width: '50px', height: '50px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    legajoTitle: { margin: 0, fontSize: '1.4rem' },
    legajoSubtitle: { opacity: 0.8, fontSize: '0.9rem' },
    legajoBody: { padding: '25px' },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 'bold', color: '#1b3a57', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '5px' },
    gridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' },
    statCard: { padding: '15px', border: '1px solid #f1f2f6', borderRadius: '10px', display: 'flex', flexDirection: 'column' },
    statLabel: { fontSize: '0.6rem', color: '#7f8c8d', fontWeight: 'bold', textTransform: 'uppercase' },
    statValue: { fontSize: '1.1rem', fontWeight: 'bold' },
    habilitacionesList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    habItem: { padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    habInfo: { display: 'flex', flexDirection: 'column' },
    habYears: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#27ae60', fontWeight: 'bold' },
    btnEditSmall: { background: 'none', border: 'none', cursor: 'pointer', color: '#3498db' },
    btnAddSmall: { background: '#27ae60', border: 'none', cursor: 'pointer', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' },
    btnDelete: { background: 'none', border: 'none', cursor: 'pointer', color: '#ff7675' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', width: '400px', borderRadius: '15px', padding: '25px' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    formInput: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd' },
    label: { fontSize: '0.75rem', fontWeight: 'bold' },
    row: { display: 'flex', gap: '10px' },
    btnSave: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7' }
};

export default Tripulantes;