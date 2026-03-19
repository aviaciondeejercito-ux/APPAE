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
        
        // ACTUALIZACIÓN: Inclusión de S4_UNIDAD en la jerarquía reconocida por el sistema
        const rolesValidos = ['user', 'boss', 'admin', 'S4_UNIDAD'];
        if (!rolesValidos.includes(role)) {
            return res.status(400).json({ 
                success: false,
                message: 'Rango o rol no reconocido por el estándar de seguridad AE' 
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { role }, 
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) return res.status(404).json({ message: 'Usuario no localizado en la base de datos' });
        
        res.status(200).json({ 
            success: true,
            message: `Jerarquía actualizada: ${user.username} ahora tiene nivel ${role.toUpperCase()}`,
            data: user 
        });
    } catch (error) {
        console.error('Error en updateRole:', error);
        res.status(500).json({ success: false, message: 'Fallo interno al actualizar permisos' });
    }
};

// @desc    Reseteo forzado de credenciales
// @route   PUT /api/admin/users/:id/password
exports.resetPassword = async (req, res) => {
    try {
        // AJUSTE: Compatibilidad total con las claves del frontend
        const { password, newPassword, newPass } = req.body;
        const passwordToSet = password || newPassword || newPass;
        
        if (!passwordToSet || passwordToSet.length < 6) {
            return res.status(400).json({ message: 'La nueva clave debe tener mínimo 6 caracteres' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });

        // Activamos middleware de bcrypt mediante .save()
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
        console.error('Error en deleteUser:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la baja' });
    }
};