import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRole, resetPassword, register } from '../services/api';

/**
 * PANEL DE ADMINISTRACIÓN CENTRALIZADO - AVIACIÓN DE EJÉRCITO
 * Seguridad: Alta, Baja, Cambio de Roles y Reset de Claves.
 */
const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
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
            
            // CORRECCIÓN CRÍTICA: Accedemos a response.data.data 
            // porque el backend envuelve el array en un objeto 'data'
            if (response.data && response.data.data) {
                setUsers(response.data.data);
            } else {
                setUsers([]);
            }
            setError('');
        } catch (err) {
            console.error('Error al cargar personal:', err);
            setError('Error de conexión: No se pudo acceder al registro de personal.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await register(newUser);
            alert(`Personal ${newUser.username} registrado correctamente.`);
            setNewUser({ username: '', email: '', password: '', role: 'user' });
            fetchUsers(); 
        } catch (err) {
            alert('Error al registrar: El nombre de usuario o email ya están en uso.');
        }
    };

    const handleDelete = async (id, username) => {
        if (window.confirm(`⚠️ ADVERTENCIA: ¿Está seguro de dar de BAJA definitiva a ${username}?`)) {
            try {
                await deleteUser(id);
                fetchUsers();
            } catch (err) {
                alert('No se pudo procesar la baja. Verifique sus permisos.');
            }
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await updateUserRole(id, newRole);
            fetchUsers();
        } catch (err) {
            alert('Error al actualizar jerarquía.');
        }
    };

    const handleResetPass = async (id, username) => {
        const newPass = prompt(`Establecer nueva clave para ${username}:`);
        if (newPass && newPass.length >= 6) {
            try {
                await resetPassword(id, newPass);
                alert('Clave de acceso actualizada.');
            } catch (err) {
                alert('Error al resetear la clave.');
            }
        } else if (newPass) {
            alert('Seguridad insuficiente: La clave debe tener 6 caracteres o más.');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontWeight: 'bold' }}>Accediendo al Registro de Personal AE...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* SECCIÓN 1: ALTA DE PERSONAL */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Incorporación de Personal</h3>
                <form onSubmit={handleCreateUser} style={styles.formInline}>
                    <input 
                        type="text" placeholder="Nombre de Usuario" required 
                        value={newUser.username} 
                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                        style={styles.input}
                    />
                    <input 
                        type="email" placeholder="Correo Oficial" required 
                        value={newUser.email} 
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                        style={styles.input}
                    />
                    <input 
                        type="password" placeholder="Clave de Acceso" required 
                        value={newUser.password} 
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        style={styles.input}
                    />
                    <select 
                        value={newUser.role} 
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                        style={styles.select}
                    >
                        <option value="user">Usuario (Operador)</option>
                        <option value="boss">Boss (Supervisor)</option>
                        <option value="admin">Administrador (Mando)</option>
                    </select>
                    <button type="submit" style={styles.btnRegister}>Registrar</button>
                </form>
            </div>

            {/* SECCIÓN 2: LISTADO Y CONTROL */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Escalafón y Gestión de Permisos</h3>
                {error && <p style={{ color: '#d9534f', fontWeight: 'bold' }}>{error}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Rango / Rol</th>
                                <th style={styles.th}>Acciones Operativas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user._id} style={styles.tbodyRow}>
                                        <td style={styles.td}><strong>{user.username}</strong></td>
                                        <td style={styles.td}>{user.email}</td>
                                        <td style={styles.td}>
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                style={styles.roleSelect}
                                            >
                                                <option value="user">Usuario</option>
                                                <option value="boss">Boss</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}>
                                            <button 
                                                onClick={() => handleResetPass(user._id, user.username)}
                                                style={{ ...styles.actionBtn, backgroundColor: '#f0ad4e' }}
                                            >
                                                🔑 Reset Clave
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user._id, user.username)}
                                                style={{ ...styles.actionBtn, backgroundColor: '#d9534f' }}
                                            >
                                                🗑️ Baja
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No hay personal registrado en el sistema.</td>
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
    card: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    },
    cardTitle: {
        color: '#1b3a57',
        marginTop: 0,
        marginBottom: '20px',
        borderBottom: '2px solid #1b3a57',
        paddingBottom: '10px',
        fontSize: '1.2rem'
    },
    formInline: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px'
    },
    input: {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ced4da',
        flex: '1',
        minWidth: '180px'
    },
    select: {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ced4da',
        backgroundColor: '#fff'
    },
    btnRegister: {
        backgroundColor: '#1b3a57',
        color: 'white',
        border: 'none',
        padding: '10px 25px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    theadRow: {
        backgroundColor: '#f1f4f7',
        borderBottom: '2px solid #1b3a57'
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        color: '#1b3a57',
        fontSize: '0.9rem',
        textTransform: 'uppercase'
    },
    tbodyRow: {
        borderBottom: '1px solid #eee'
    },
    td: {
        padding: '12px',
        fontSize: '0.9rem'
    },
    roleSelect: {
        padding: '6px',
        borderRadius: '4px',
        border: '1px solid #ced4da'
    },
    actionBtn: {
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
    }
};

export default AdminPanel;