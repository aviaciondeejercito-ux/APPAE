import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight, UserPlus, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

const Tripulantes = () => {
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Datos de sesión (basados en tu authMiddleware)
    const [userRole] = useState(localStorage.getItem('role')?.toLowerCase() || 'user');
    const [userUnidad] = useState(localStorage.getItem('unidad') || '');

    useEffect(() => {
        fetchPersonal();
    }, []);

    // 1. OBTENER TRIPULANTES (Conecta con GET /api/tripulantes)
    const fetchPersonal = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/tripulantes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (response.ok) {
                setPersonal(data);
            }
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. BUSCADOR (Lógica local para rapidez, compatible con el Controlador)
    const personalFiltrado = personal.filter(p => 
        p.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div style={styles.dashboardContainer}>
            
            {/* COLUMNA IZQUIERDA: GESTIÓN AE */}
            <div style={styles.sidebar}>
                
                {/* 1. SECCIÓN ALTA (Solo Admin o User de la Unidad) */}
                {(userRole === 'admin' || userRole === 'user') && (
                    <div style={styles.altaBox}>
                        <button style={styles.btnAlta} onClick={() => alert('Abriendo Formulario de Alta...')}>
                            <UserPlus size={18} />
                            <span>Dar de Alta Personal</span>
                        </button>
                    </div>
                )}

                {/* 2. BUSCADOR INTEGRADO */}
                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input 
                            type="text" 
                            placeholder="Buscar por apellido..." 
                            style={styles.input}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                {/* 3. LISTADO DINÁMICO (Ordenado por apellido del controlador) */}
                <div style={styles.listContainer}>
                    <div style={styles.listHeader}>TRIPULANTES DISPONIBLES</div>
                    {loading ? (
                        <div style={styles.loadingArea}>Sincronizando legajos...</div>
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
                                        {/* Alerta de vencimiento basada en el virtual de tu controlador */}
                                        {p.estadoCertificaciones?.psicofisicoVencido && (
                                            <AlertCircle size={12} color="#e74c3c" />
                                        )}
                                    </div>
                                    <span style={styles.itemNombre}>{p.apellido}, {p.nombre}</span>
                                </div>
                                <ChevronRight size={16} color={seleccionado?._id === p._id ? '#1b3a57' : '#bdc3c7'} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: PANEL DEL LEGAJO (IDENTIKIT) */}
            <div style={styles.mainView}>
                {seleccionado ? (
                    <div style={styles.legajoCard}>
                        {/* Cabecera inmutable */}
                        <div style={styles.legajoHeader}>
                            <div style={styles.avatar}>
                                <User size={35} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={styles.legajoTitle}>{seleccionado.grado} {seleccionado.apellido}, {seleccionado.nombre}</h2>
                                    <div style={styles.activeBadge}>● LEGAJO ACTIVO</div>
                                </div>
                                <span style={styles.legajoSubtitle}>{seleccionado.unidad}</span>
                            </div>
                        </div>

                        {/* Cuerpo - Datos de Auditoría y Legajo */}
                        <div style={styles.legajoBody}>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}>
                                    <div style={styles.statIcon}><Clock size={16} /></div>
                                    <div style={styles.statData}>
                                        <span style={styles.statLabel}>HORAS TOTALES</span>
                                        <span style={styles.statValue}>
                                            {(seleccionado.totalesHistoricos?.vueloDiurno || 0) + (seleccionado.totalesHistoricos?.vueloNocturno || 0)} hs
                                        </span>
                                    </div>
                                </div>

                                <div style={styles.statCard}>
                                    <div style={{...styles.statIcon, backgroundColor: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#fadbd8' : '#d4efdf'}}>
                                        <ShieldCheck size={16} color={seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#e74c3c' : '#27ae60'} />
                                    </div>
                                    <div style={styles.statData}>
                                        <span style={styles.statLabel}>PSICOFÍSICO</span>
                                        <span style={{...styles.statValue, color: seleccionado.estadoCertificaciones?.psicofisicoVencido ? '#e74c3c' : '#2c3e50'}}>
                                            {seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'VENCIDO' : 'AL DÍA'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.sectionHeader}>
                                <FileText size={16} />
                                <span>DATOS OPERATIVOS Y HABILITACIONES</span>
                            </div>
                            
                            <div style={styles.placeholderMsg}>
                                Seleccionado: <strong>{seleccionado.apellido}</strong>. <br/>
                                Registrado por última vez: {new Date(seleccionado.fechaUltimaModificacion).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <User size={60} color="#dcdde1" />
                        <h3>Gestión de Personal AE</h3>
                        <p>Seleccione un tripulante para visualizar su historial inmutable y habilitaciones por SdA.</p>
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
    statCard: { display: 'flex', gap: '15px', padding: '15px', border: '1px solid #f1f2f6', borderRadius: '12px', backgroundColor: '#fff' },
    statIcon: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ebf5fb', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    statData: { display: 'flex', flexDirection: 'column' },
    statLabel: { fontSize: '0.65rem', color: '#7f8c8d', fontWeight: 'bold' },
    statValue: { fontSize: '1.1rem', fontWeight: '800', color: '#1b3a57' },
    
    sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57', marginBottom: '15px', borderBottom: '2px solid #1b3a57', paddingBottom: '5px' },
    placeholderMsg: { padding: '40px', textAlign: 'center', color: '#bdc3c7', fontSize: '0.9rem', border: '2px dashed #f1f2f6', borderRadius: '12px' },
    emptyState: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7', textAlign: 'center' },
    loadingArea: { padding: '20px', textAlign: 'center', color: '#7f8c8d', fontSize: '0.85rem' }
};

export default Tripulantes;