import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight, UserPlus } from 'lucide-react';

const Tripulantes = () => {
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [personal, setPersonal] = useState([
        { id: 1, grado: 'Cap', apellido: 'GARCIA', nombre: 'Juan', unidad: 'B HELIC ASAL 601', antiguedad: 1 },
        { id: 2, grado: 'Ten', apellido: 'PEREZ', nombre: 'Matias', unidad: 'B AV APY COMB 601', antiguedad: 2 },
        { id: 3, grado: 'Subt', apellido: 'LOPEZ', nombre: 'Carlos', unidad: 'SEC AE', antiguedad: 3 },
    ]);

    // Lógica para ordenar por antigüedad (asumiendo que menor valor es más antiguo)
    const personalOrdenado = [...personal].sort((a, b) => a.antiguedad - b.antiguedad);

    const personalFiltrado = personalOrdenado.filter(p => 
        p.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div style={styles.dashboardContainer}>
            
            {/* COLUMNA IZQUIERDA: ALTA, BUSCADOR Y LISTA */}
            <div style={styles.sidebar}>
                
                {/* 1. FORMULARIO PARA DAR DE ALTA */}
                <div style={styles.altaBox}>
                    <button style={styles.btnAlta}>
                        <UserPlus size={18} />
                        <span>Dar de Alta Personal</span>
                    </button>
                </div>

                {/* 2. BUSCADOR */}
                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input 
                            type="text" 
                            placeholder="Buscar por apellido o nombre..." 
                            style={styles.input}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                {/* 3. LISTA DEL PERSONAL (ORDENADO POR ANTIGÜEDAD) */}
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

            {/* COLUMNA DERECHA: PANEL DEL LEGAJO DE VUELO */}
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
                                <p>Panel del legajo de vuelo</p>
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
    dashboardContainer: { display: 'flex', height: '100%', width: '100%', backgroundColor: '#f8f9fa', overflow: 'hidden' },
    sidebar: { width: '380px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' },
    
    // Estilos del nuevo bloque de Alta
    altaBox: { padding: '20px', borderBottom: '1px solid #f0f0f0' },
    btnAlta: { 
        width: '100%', backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', 
        borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        gap: '10px', fontWeight: 'bold', fontSize: '0.85rem' 
    },

    searchBox: { padding: '15px 20px', borderBottom: '1px solid #f0f0f0' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', padding: '8px 12px', borderRadius: '8px' },
    searchIcon: { color: '#5f6368', marginRight: '10px' },
    input: { border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' },
    
    listContainer: { flex: 1, overflowY: 'auto' },
    listHeader: { padding: '15px 20px', fontSize: '0.7rem', fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '1px' },
    personItem: { padding: '12px 20px', borderBottom: '1px solid #f9f9f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '0.2s' },
    personInfo: { display: 'flex', flexDirection: 'column' },
    itemGrado: { fontSize: '0.65rem', color: '#1b3a57', fontWeight: 'bold' },
    itemNombre: { fontSize: '0.85rem', color: '#2c3e50', fontWeight: '500' },
    noResult: { padding: '20px', textAlign: 'center', color: '#bdc3c7', fontSize: '0.85rem' },
    
    mainView: { flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7' },
    legajoCard: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: '500px', display: 'flex', flexDirection: 'column' },
    legajoHeader: { padding: '25px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '20px' },
    avatar: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#1b3a57', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    legajoTitle: { margin: 0, color: '#1b3a57', fontSize: '1.3rem' },
    legajoSubtitle: { color: '#7f8c8d', fontSize: '0.85rem' },
    legajoBody: { padding: '30px', flex: 1 },
    placeholderContent: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#dcdde1', gap: '15px' }
};

export default Tripulantes;