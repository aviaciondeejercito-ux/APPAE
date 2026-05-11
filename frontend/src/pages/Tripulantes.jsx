import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight } from 'lucide-react';

const Tripulantes = () => {
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [personal, setPersonal] = useState([
        // Datos de ejemplo para ver la estructura inicial
        { id: 1, grado: 'Cap', apellido: 'GARCIA', nombre: 'Juan', unidad: 'B HELIC ASAL 601' },
        { id: 2, grado: 'Ten', apellido: 'PEREZ', nombre: 'Matias', unidad: 'B AV APY COMB 601' },
        { id: 3, grado: 'Subt', apellido: 'LOPEZ', nombre: 'Carlos', unidad: 'SEC AE' },
    ]);

    // Filtrado por buscador
    const personalFiltrado = personal.filter(p => 
        p.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div style={styles.dashboardContainer}>
            
            {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA */}
            <div style={styles.sidebar}>
                
                {/* BLOQUE BUSCADOR */}
                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input 
                            type="text" 
                            placeholder="Buscar personal..." 
                            style={styles.input}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                {/* BLOQUE LISTADO */}
                <div style={styles.listContainer}>
                    <div style={styles.listHeader}>PERSONAL DE LA UNIDAD</div>
                    {personalFiltrado.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setSeleccionado(p)}
                            style={{
                                ...styles.personItem,
                                backgroundColor: seleccionado?.id === p.id ? '#e3f2fd' : 'white',
                                borderLeft: seleccionado?.id === p.id ? '4px solid #1b3a57' : '4px solid transparent'
                            }}
                        >
                            <div style={styles.personInfo}>
                                <span style={styles.itemGrado}>{p.grado}</span>
                                <span style={styles.itemNombre}>{p.apellido}, {p.nombre}</span>
                            </div>
                            <ChevronRight size={16} color="#bdc3c7" />
                        </div>
                    ))}
                    {personalFiltrado.length === 0 && (
                        <div style={styles.noResult}>No se encontró personal</div>
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: VISTA DEL LEGAJO */}
            <div style={styles.mainView}>
                {seleccionado ? (
                    <div style={styles.legajoCard}>
                        <div style={styles.legajoHeader}>
                            <div style={styles.avatar}>
                                <User size={40} color="white" />
                            </div>
                            <div>
                                <h2 style={styles.legajoTitle}>{seleccionado.grado} {seleccionado.apellido}, {seleccionado.nombre}</h2>
                                <span style={styles.legajoSubtitle}>{seleccionado.unidad}</span>
                            </div>
                        </div>

                        <div style={styles.legajoBody}>
                            <div style={styles.placeholderContent}>
                                <FileText size={50} color="#ecf0f1" />
                                <p>Información detallada del legajo de vuelo (Próximamente)</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <User size={80} color="#ecf0f1" />
                        <h3>Seleccione un integrante del personal</h3>
                        <p>Para visualizar el legajo de vuelo completo</p>
                    </div>
                )}
            </div>

        </div>
    );
};

const styles = {
    dashboardContainer: {
        display: 'flex',
        height: '100%', // Ocupa el alto definido en App.jsx (calc(100vh - 65px))
        width: '100%',
        backgroundColor: '#f8f9fa',
        overflow: 'hidden'
    },
    sidebar: {
        width: '350px',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff'
    },
    searchBox: {
        padding: '20px',
        borderBottom: '1px solid #f0f0f0'
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f1f3f4',
        padding: '8px 12px',
        borderRadius: '8px'
    },
    searchIcon: { color: '#5f6368', marginRight: '10px' },
    input: {
        border: 'none',
        backgroundColor: 'transparent',
        outline: 'none',
        width: '100%',
        fontSize: '0.9rem'
    },
    listContainer: {
        flex: 1,
        overflowY: 'auto'
    },
    listHeader: {
        padding: '15px 20px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        color: '#7f8c8d',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    personItem: {
        padding: '15px 20px',
        borderBottom: '1px solid #f9f9f9',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: '0.2s'
    },
    personInfo: { display: 'flex', flexDirection: 'column' },
    itemGrado: { fontSize: '0.7rem', color: '#1b3a57', fontWeight: 'bold' },
    itemNombre: { fontSize: '0.9rem', color: '#2c3e50', fontWeight: '500' },
    noResult: { padding: '20px', textAlign: 'center', color: '#bdc3c7', fontSize: '0.9rem' },
    mainView: {
        flex: 1,
        padding: '30px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
    },
    emptyState: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#bdc3c7'
    },
    legajoCard: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column'
    },
    legajoHeader: {
        padding: '25px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
    },
    avatar: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#1b3a57',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    legajoTitle: { margin: 0, color: '#1b3a57', fontSize: '1.4rem' },
    legajoSubtitle: { color: '#7f8c8d', fontSize: '0.9rem' },
    legajoBody: { padding: '30px', flex: 1 },
    placeholderContent: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#dcdde1',
        gap: '15px'
    }
};

export default Tripulantes;