import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRole, resetPassword, register } from '../services/api';

/**
 * PANEL DE ADMINISTRACIÓN CENTRALIZADO - SISTEMA AE
 * Maneja: Alta/Baja, Roles (Jerarquía) y Reset de Claves GDE.
 */
const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [newUser, setNewUser] = useState({
        username: '', // Este será el Usuario GDE
        password: '',
        role: 'user'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getUsers();
            
            // Estándar de seguridad: validación de respuesta envuelta
            if (response.data && response.data.data) {
                setUsers(response.data.data);
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
            // Adaptamos para enviar 'email' como el mismo username para no romper el backend
            // o simplemente enviamos la estructura que el backend espera.
            const payload = { 
                username: newUser.username, 
                email: `${newUser.username}@ae.mil.ar`, // Email técnico generado internamente
                password: newUser.password, 
                role: newUser.role 
            };
            
            await register(payload);
            alert(`Personal GDE: ${newUser.username} incorporado correctamente.`);
            setNewUser({ username: '', password: '', role: 'user' });
            fetchUsers(); 
        } catch (err) {
            alert('Error al registrar: El usuario GDE ya existe en la base de datos.');
        }
    };

    const handleDelete = async (id, username) => {
        if (window.confirm(`⚠️ ADVERTENCIA DE SEGURIDAD: ¿Confirma la BAJA definitiva del usuario GDE: ${username}?`)) {
            try {
                await deleteUser(id);
                fetchUsers();
            } catch (err) {
                alert('No se pudo procesar la baja. Verifique privilegios de administrador.');
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

    const handleResetPass = async (id, username) => {
        const newPass = prompt(`Establecer nueva clave para GDE: ${username}:`);
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
            
            {/* PANEL DE ALTA DE PERSONAL GDE */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Incorporación de Personal (Alta GDE)</h3>
                <form onSubmit={handleCreateUser} style={styles.formInline}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Usuario GDE</label>
                        <input 
                            type="text" placeholder="Ej: JPEREZ_AE" required 
                            value={newUser.username} 
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Clave Inicial</label>
                        <input 
                            type="password" placeholder="Min. 6 caracteres" required 
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Permisos</label>
                        <select 
                            value={newUser.role} 
                            onChange={e => setNewUser({...newUser, role: e.target.value})}
                            style={styles.select}
                        >
                            <option value="user">Usuario (Operador - Crea/Edita)</option>
                            <option value="boss">Boss (Supervisor - Solo Ver)</option>
                            <option value="admin">Admin (Mando - Control Total)</option>
                        </select>
                    </div>
                    <button type="submit" style={styles.btnRegister}>Dar de Alta</button>
                </form>
            </div>

            {/* LISTADO Y GESTIÓN DE PERMISOS */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Escalafón de Usuarios y Control de Acceso</h3>
                {error && <p style={styles.errorText}>{error}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}>Identificador GDE</th>
                                <th style={styles.th}>Nivel de Acceso</th>
                                <th style={styles.th}>Acciones de Seguridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user._id} style={styles.tbodyRow}>
                                        <td style={styles.td}>
                                            <span style={styles.gdeBadge}>{user.username}</span>
                                        </td>
                                        <td style={styles.td}>
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                style={styles.roleSelect}
                                            >
                                                <option value="user">USER</option>
                                                <option value="boss">BOSS</option>
                                                <option value="admin">ADMIN</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}>
                                            <button 
                                                onClick={() => handleResetPass(user._id, user.username)}
                                                style={{ ...styles.actionBtn, backgroundColor: '#f0ad4e' }}
                                                title="Resetear Clave"
                                            >
                                                🔑 Reset
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user._id, user.username)}
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
                                    <td colSpan="3" style={styles.emptyTable}>No hay personal registrado en el sistema.</td>
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
    card: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    },
    cardTitle: {
        color: '#1b3a57',
        marginTop: 0,
        marginBottom: '20px',
        borderLeft: '5px solid #1b3a57',
        paddingLeft: '15px',
        fontSize: '1.1rem',
        fontWeight: 'bold'
    },
    formInline: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '150px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.9rem' },
    select: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' },
    btnRegister: {
        backgroundColor: '#1b3a57',
        color: 'white',
        border: 'none',
        padding: '11px 25px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.9rem'
    },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    theadRow: { backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' },
    th: { padding: '12px', textAlign: 'left', color: '#444', fontSize: '0.8rem', fontWeight: 'bold' },
    tbodyRow: { borderBottom: '1px solid #eee', transition: 'background 0.2s' },
    td: { padding: '12px', fontSize: '0.9rem' },
    gdeBadge: { backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', color: '#1b3a57' },
    roleSelect: { padding: '5px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: 'bold' },
    actionBtn: { color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.75rem', fontWeight: 'bold' },
    errorText: { color: '#d9534f', fontWeight: 'bold', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px' },
    emptyTable: { textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }
};

export default AdminPanel;