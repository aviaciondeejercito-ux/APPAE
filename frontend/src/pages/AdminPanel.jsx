import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRole, resetPassword, register } from '../services/api';

/**
 * PANEL DE ADMINISTRACIÓN CENTRALIZADO - SISTEMA AE
 * Configuración: Usuario (Nombre y Apellido) es la credencial principal.
 * Columnas: Usuario, GDE, Elemento, Nivel de Acceso, Acciones.
 * Ordenamiento: Por Elemento (Unidad) de forma automática.
 */
const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [newUser, setNewUser] = useState({
        username: '',    // GDE (Identificador)
        nombreReal: '',  // Usuario (Credencial de acceso)
        elemento: '',    // Unidad/Elemento
        password: '',
        role: 'USER'     // Sincronizado con default del modelo
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getUsers();
            
            if (response.data && response.data.data) {
                // ORDENAMIENTO POR ELEMENTO (UNIDAD)
                const sortedUsers = response.data.data.sort((a, b) => {
                    if (a.elemento < b.elemento) return -1;
                    if (a.elemento > b.elemento) return 1;
                    return 0;
                });
                setUsers(sortedUsers);
            } else {
                setUsers([]);
            }
            setError('');
        } catch (err) {
            console.error('Error al cargar escalafón:', err);
            setError('Error de conexión: No se pudo acceder al registro de personal.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                nombreReal: newUser.nombreReal, 
                username: newUser.username,     
                elemento: newUser.elemento,
                email: `${newUser.username.toLowerCase()}@ae.mil.ar`, 
                password: newUser.password, 
                role: newUser.role 
            };
            
            await register(payload);
            alert(`Personal: ${newUser.nombreReal} (GDE: ${newUser.username}) incorporado correctamente.`);
            
            setNewUser({ username: '', nombreReal: '', elemento: '', password: '', role: 'USER' });
            fetchUsers(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Error al registrar: Verifique si el nombre o GDE ya existen.');
        }
    };

    const handleDelete = async (id, nombre) => {
        if (window.confirm(`⚠️ ADVERTENCIA DE SEGURIDAD: ¿Confirma la BAJA definitiva del usuario: ${nombre}?`)) {
            try {
                await deleteUser(id);
                fetchUsers();
            } catch (err) {
                alert('No se pudo procesar la baja.');
            }
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await updateUserRole(id, newRole);
            fetchUsers();
        } catch (err) {
            alert('Error al actualizar permisos de acceso.');
        }
    };

    const handleResetPass = async (id, nombre) => {
        const newPass = prompt(`Establecer nueva clave para: ${nombre}:`);
        if (newPass && newPass.length >= 6) {
            try {
                await resetPassword(id, newPass);
                alert('Clave de acceso actualizada exitosamente.');
            } catch (err) {
                alert('Error técnico al resetear la clave.');
            }
        } else if (newPass) {
            alert('Seguridad insuficiente: La clave debe tener al menos 6 caracteres.');
        }
    };

    if (loading) return <div style={styles.loader}>Accediendo al Registro de Personal AE...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* FORMULARIO DE ALTA ADAPTADO */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Incorporación de Personal (Alta de Usuario)</h3>
                <form onSubmit={handleCreateUser} style={styles.formInline}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre y Apellido (Usuario)</label>
                        <input 
                            type="text" placeholder="Ej: Juan Pérez" required 
                            value={newUser.nombreReal} 
                            onChange={e => setNewUser({...newUser, nombreReal: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Identificador GDE</label>
                        <input 
                            type="text" placeholder="JPEREZ_AE" required 
                            value={newUser.username} 
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Elemento</label>
                        <input 
                            type="text" placeholder="Ej: SEC AE M 6" required 
                            value={newUser.elemento} 
                            onChange={e => setNewUser({...newUser, elemento: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Clave</label>
                        <input 
                            type="password" placeholder="Min. 6" required 
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Rol</label>
                        <select 
                            value={newUser.role} 
                            onChange={e => setNewUser({...newUser, role: e.target.value})}
                            style={styles.select}
                        >
                            <option value="user">USER (Consulta)</option>
                            <option value="OFICINA_TECNICA">OFICINA TÉCNICA (S4 UNIDAD)</option>
                            <option value="OTO">OTO (Oficial Técnico)</option>
                            <option value="BOSS">BOSS (Comando)</option>
                            <option value="DIRECTOR">DIRECTOR (Dirección)</option>
                            <option value="admin">ADMIN (Total)</option>
                        </select>
                    </div>
                    <button type="submit" style={styles.btnRegister}>Dar de Alta</button>
                </form>
            </div>

            {/* TABLA DE ESCALAFÓN */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Escalafón de Usuarios y Control de Acceso (Ordenado por Elemento)</h3>
                {error && <p style={styles.errorText}>{error}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}>Usuario (Nombre)</th>
                                <th style={styles.th}>GDE</th>
                                <th style={styles.th}>Elemento</th>
                                <th style={styles.th}>Nivel de Acceso</th>
                                <th style={styles.th}>Acciones de Seguridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user._id} style={styles.tbodyRow}>
                                        <td style={{...styles.td, fontWeight: '500'}}>{user.nombreReal || 'No asignado'}</td>
                                        <td style={styles.td}>
                                            <span style={styles.gdeBadge}>{user.username}</span>
                                        </td>
                                        <td style={styles.td}>{user.elemento || 'S/D'}</td>
                                        <td style={styles.td}>
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                style={{
                                                    ...styles.roleSelect,
                                                    color: (user.role === 'admin' || user.role === 'DIRECTOR') ? '#d9534f' : 
                                                           (user.role === 'OTO' || user.role === 'OFICINA_TECNICA') ? '#2980b9' : '#333'
                                                }}
                                            >
                                                <option value="USER">USER</option>
                                                <option value="OFICINA_TECNICA">S4 UNIDAD</option>
                                                <option value="OTO">OTO</option>
                                                <option value="BOSS">BOSS</option>
                                                <option value="DIRECTOR">DIRECTOR</option>
                                                <option value="admin">ADMIN</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}>
                                            <button 
                                                onClick={() => handleResetPass(user._id, user.nombreReal)}
                                                style={{ ...styles.actionBtn, backgroundColor: '#f0ad4e' }}
                                                title="Resetear Clave"
                                            >
                                                🔑 Reset
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user._id, user.nombreReal)}
                                                style={{ ...styles.actionBtn, backgroundColor: '#d9534f' }}
                                                title="Eliminar Usuario"
                                            >
                                                🗑️ Baja
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={styles.emptyTable}>No hay personal registrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const styles = {
    loader: { textAlign: 'center', marginTop: '50px', fontWeight: 'bold', color: '#1b3a57' },
    card: { backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    cardTitle: { color: '#1b3a57', marginTop: 0, marginBottom: '20px', borderLeft: '5px solid #1b3a57', paddingLeft: '15px', fontSize: '1.1rem', fontWeight: 'bold' },
    formInline: { display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '140px' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.85rem' },
    select: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.85rem' },
    btnRegister: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '11px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    theadRow: { backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' },
    th: { padding: '12px', textAlign: 'left', color: '#444', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' },
    tbodyRow: { borderBottom: '1px solid #eee' },
    td: { padding: '12px', fontSize: '0.85rem', color: '#333' },
    gdeBadge: { backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', color: '#1b3a57', fontFamily: 'monospace' },
    roleSelect: { padding: '5px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.8rem', fontWeight: 'bold' },
    actionBtn: { color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.7rem', fontWeight: 'bold' },
    errorText: { color: '#d9534f', fontWeight: 'bold', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px' },
    emptyTable: { textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }
};

export default AdminPanel;