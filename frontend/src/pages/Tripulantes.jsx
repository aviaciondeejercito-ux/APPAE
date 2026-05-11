import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight, UserPlus, AlertCircle, Clock, ShieldCheck, X, Save } from 'lucide-react';

const Tripulantes = () => {
    // ESTADOS PRINCIPALES
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // ESTADOS PARA EL MODAL DE ALTA
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        grado: '', apellido: '', nombre: '', unidad: '', antiguedad: ''
    });

    // DATOS DE SESIÓN (Basados en localStorage del Login)
    const [user] = useState({
        role: localStorage.getItem('role')?.toLowerCase() || 'user',
        unidad: localStorage.getItem('unidad') || '' 
    });

    // CONFIGURACIÓN BASADA EN TU MODELO DE MONGOOSE
    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
        "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
        "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"
    ];
    const gradosAE = ['Cnel', 'Tcnl', 'My', 'Cap', 'Ten', 'Subt', 'Subof My', 'Subof Pr', 'Subof Prpal', 'Sarg Ay', 'Sarg 1ro', 'Sarg', 'Cabo 1ro', 'Cabo'];

    useEffect(() => {
        fetchPersonal();
    }, []);

    // 1. OBTENER TRIPULANTES (Endpoint GET /api/tripulantes)
    const fetchPersonal = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/tripulantes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setPersonal(data);
        } catch (error) {
            console.error("Error al sincronizar con el servidor:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. FUNCIÓN PARA ABRIR ALTA (Lógica Admin vs User)
    const handleOpenModal = () => {
        setFormData({
            grado: '', 
            apellido: '', 
            nombre: '', 
            unidad: user.role === 'admin' ? '' : user.unidad, // Si no es admin, queda fija su unidad
            antiguedad: ''
        });
        setShowModal(true);
    };

    // 3. GUARDAR NUEVO TRIPULANTE (Endpoint POST /api/tripulantes)
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/tripulantes', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setShowModal(false);
                fetchPersonal(); // Recargar lista
            } else {
                const err = await response.json();
                alert(err.mensaje);
            }
        } catch (error) {
            console.error("Error en el alta:", error);
        }
    };

    const personalFiltrado = personal.filter(p => 
        p.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div style={styles.dashboardContainer}>
            
            {/* COLUMNA IZQUIERDA: GESTIÓN */}
            <div style={styles.sidebar}>
                <div style={styles.altaBox}>
                    <button style={styles.btnAlta} onClick={handleOpenModal}>
                        <UserPlus size={18} />
                        <span>Dar de Alta Personal</span>
                    </button>
                </div>

                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input 
                            type="text" 
                            placeholder="Buscar legajo..." 
                            style={styles.input}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div style={styles.listContainer}>
                    <div style={styles.listHeader}>TRIPULANTES DE LA UNIDAD</div>
                    {loading ? (
                        <div style={styles.loadingArea}>Sincronizando...</div>
                    ) : (
                        personalFiltrado.map(p => (
                            <div 
                                key={p._id} 
                                onClick={() => setSeleccionado(p)}
                                style={{
                                    ...styles.personItem,
                                    backgroundColor: seleccionado?._id === p._id ? '#e3f2fd' : 'white',
                                    borderLeft: seleccionado?._id === p._id ? '4px solid #1b3a57' : '4px solid transparent'
                                }}
                            >
                                <div style={styles.personInfo}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={styles.itemGrado}>{p.grado}</span>
                                        {p.estadoCertificaciones?.psicofisicoVencido && <AlertCircle size={12} color="#e74c3c" />}
                                    </div>
                                    <span style={styles.itemNombre}>{p.apellido}, {p.nombre}</span>
                                </div>
                                <ChevronRight size={16} color={seleccionado?._id === p._id ? '#1b3a57' : '#bdc3c7'} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL DE ALTA (Logic Admin/User) */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3><UserPlus size={20}/> Nuevo Legajo de Personal</h3>
                            <X size={24} style={{cursor:'pointer'}} onClick={() => setShowModal(false)} />
                        </div>
                        <form onSubmit={handleSave} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Grado</label>
                                <select required style={styles.formInput} value={formData.grado} onChange={e => setFormData({...formData, grado: e.target.value})}>
                                    <option value="">Seleccionar Grado</option>
                                    {gradosAE.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div style={styles.row}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Apellido</label>
                                    <input type="text" required style={styles.formInput} placeholder="Ej: PEREZ" onChange={e => setFormData({...formData, apellido: e.target.value.toUpperCase()})} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Nombre</label>
                                    <input type="text" required style={styles.formInput} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Unidad</label>
                                {user.role === 'admin' ? (
                                    <select required style={styles.formInput} value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})}>
                                        <option value="">Seleccionar Unidad</option>
                                        {unidadesAE.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" readOnly style={{...styles.formInput, backgroundColor: '#f5f5f5'}} value={user.unidad} />
                                )}
                            </div>
                            <button type="submit" style={styles.btnSave}><Save size={18} /> Dar de Alta en Sistema</button>
                        </form>
                    </div>
                </div>
            )}

            {/* COLUMNA DERECHA: LEGAJO */}
            <div style={styles.mainView}>
                {seleccionado ? (
                    <div style={styles.legajoCard}>
                        <div style={styles.legajoHeader}>
                            <div style={styles.avatar}><User size={35} color="white" /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h2 style={styles.legajoTitle}>{seleccionado.grado} {seleccionado.apellido}, {seleccionado.nombre}</h2>
                                    <div style={styles.activeBadge}>● LEGAJO ACTIVO</div>
                                </div>
                                <span style={styles.legajoSubtitle}>{seleccionado.unidad}</span>
                            </div>
                        </div>
                        <div style={styles.legajoBody}>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}>
                                    <Clock size={20} color="#1b3a57" />
                                    <div style={styles.statData}>
                                        <span style={styles.statLabel}>HORAS TOTALES</span>
                                        <span style={styles.statValue}>{(seleccionado.totalesHistoricos?.vueloDiurno || 0) + (seleccionado.totalesHistoricos?.vueloNocturno || 0)} hs</span>
                                    </div>
                                </div>
                                <div style={styles.statCard}>
                                    <ShieldCheck size={20} color={seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#e74c3c' : '#27ae60'} />
                                    <div style={styles.statData}>
                                        <span style={styles.statLabel}>PSICOFÍSICO</span>
                                        <span style={{...styles.statValue, color: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#e74c3c' : '#2c3e50'}}>
                                            {seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'VENCIDO' : 'AL DÍA'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={styles.sectionHeader}><FileText size={16} /> <span>DATOS OPERATIVOS</span></div>
                            <div style={styles.placeholderMsg}>
                                Última modificación: {new Date(seleccionado.fechaUltimaModificacion).toLocaleDateString()} hs.
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <User size={60} color="#dcdde1" />
                        <h3>Gestión de Personal AE</h3>
                        <p>Seleccione un tripulante para visualizar su historial inmutable.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    dashboardContainer: { display: 'flex', height: '100%', width: '100%', backgroundColor: '#f4f7f6', overflow: 'hidden' },
    sidebar: { width: '380px', borderRight: '1px solid #dcdde1', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' },
    altaBox: { padding: '20px' },
    btnAlta: { width: '100%', backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', fontSize: '0.85rem' },
    searchBox: { padding: '10px 20px 20px 20px', borderBottom: '1px solid #f1f2f6' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', padding: '10px 15px', borderRadius: '10px' },
    searchIcon: { color: '#7f8c8d', marginRight: '10px' },
    input: { border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' },
    listContainer: { flex: 1, overflowY: 'auto' },
    listHeader: { padding: '15px 20px', fontSize: '0.7rem', fontWeight: '800', color: '#95a5a6', textTransform: 'uppercase' },
    personItem: { padding: '15px 20px', borderBottom: '1px solid #f1f2f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    personInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
    itemGrado: { fontSize: '0.65rem', color: '#1b3a57', fontWeight: 'bold' },
    itemNombre: { fontSize: '0.95rem', color: '#2f3640', fontWeight: '600' },
    mainView: { flex: 1, padding: '25px', overflowY: 'auto', backgroundColor: '#f8f9fa' },
    legajoCard: { backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', minHeight: '100%' },
    legajoHeader: { padding: '25px', borderBottom: '1px solid #f1f2f6', display: 'flex', alignItems: 'center', gap: '20px' },
    avatar: { width: '55px', height: '55px', borderRadius: '12px', backgroundColor: '#1b3a57', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    legajoTitle: { margin: 0, color: '#1b3a57', fontSize: '1.4rem', fontWeight: '800' },
    legajoSubtitle: { color: '#7f8c8d', fontSize: '0.9rem' },
    activeBadge: { fontSize: '0.65rem', color: '#27ae60', fontWeight: 'bold' },
    legajoBody: { padding: '25px' },
    gridStats: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '25px' },
    statCard: { display: 'flex', gap: '15px', padding: '15px', border: '1px solid #f1f2f6', borderRadius: '12px', backgroundColor: '#fff', alignItems: 'center' },
    statData: { display: 'flex', flexDirection: 'column' },
    statLabel: { fontSize: '0.65rem', color: '#7f8c8d', fontWeight: 'bold' },
    statValue: { fontSize: '1.1rem', fontWeight: '800', color: '#1b3a57' },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57', marginBottom: '15px', borderBottom: '2px solid #1b3a57', paddingBottom: '5px' },
    placeholderMsg: { padding: '40px', textAlign: 'center', color: '#bdc3c7', fontSize: '0.9rem', border: '2px dashed #f1f2f6', borderRadius: '12px' },
    emptyState: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7', textAlign: 'center' },
    loadingArea: { padding: '20px', textAlign: 'center', color: '#7f8c8d', fontSize: '0.85rem' },
    
    // OVERLAY Y MODAL
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000 },
    modal: { backgroundColor: 'white', width: '450px', borderRadius: '15px', padding: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: '#1b3a57' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#7f8c8d' },
    formInput: { padding: '10px', borderRadius: '8px', border: '1px solid #dcdde1', fontSize: '0.9rem', outline: 'none' },
    row: { display: 'flex', gap: '15px' },
    btnSave: { marginTop: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }
};

export default Tripulantes;