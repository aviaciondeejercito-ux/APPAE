const User = require('../models/User');

/**
 * CONTROLADOR DE ADMINISTRACIÓN AE
 * Seguridad Crítica: Gestión de personal y acceso.
 * Basado en el Estándar de Seguridad para asegurar la integridad de los datos.
 */

// @desc    Obtener todos los usuarios (Lista de Personal)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        // SEGURIDAD: Nunca enviar el hash del password al cliente. 
        // Filtramos GDE (username), email y role.
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('❌ Error Crítico en getAllUsers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error de servidor al obtener lista de personal' 
        });
    }
};

// @desc    Actualizar rango o permisos
// @route   PUT /api/admin/users/:id/role
exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        
        // Validación estricta de jerarquía AE
        const rolesValidos = ['user', 'boss', 'admin'];
        if (!rolesValidos.includes(role)) {
            return res.status(400).json({ message: 'Rango o rol no reconocido por el sistema' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { role }, 
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });
        
        res.status(200).json({ 
            success: true,
            message: `Jerarquía actualizada: ${user.username} ahora tiene nivel ${role.toUpperCase()}`,
            data: user 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar permisos' });
    }
};

// @desc    Reseteo forzado de credenciales
// @route   PUT /api/admin/users/:id/password
exports.resetPassword = async (req, res) => {
    try {
        // AJUSTE: Aceptamos 'password' para coincidir con el llamado del frontend
        const { password, newPassword } = req.body;
        const passwordToSet = password || newPassword;
        
        if (!passwordToSet || passwordToSet.length < 6) {
            return res.status(400).json({ message: 'La nueva clave debe tener mínimo 6 caracteres' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });

        // Al asignar y usar .save(), activamos el middleware de encriptación (bcrypt) definido en el Modelo
        user.password = passwordToSet;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Credenciales de ${user.username} actualizadas con éxito` 
        });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ success: false, message: 'Fallo al resetear credenciales' });
    }
};

// @desc    Baja definitiva de personal
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        // SEGURIDAD: Bloqueo de auto-eliminación
        // Verificamos si el ID a borrar es el mismo que el del usuario que hace la petición
        if (req.user && req.params.id === req.user._id.toString()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Operación denegada: Un administrador no puede darse de baja a sí mismo.' 
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });
        
        res.status(200).json({ 
            success: true, 
            message: `El usuario GDE: ${user.username} ha sido dado de baja del sistema` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al procesar la baja' });
    }
};