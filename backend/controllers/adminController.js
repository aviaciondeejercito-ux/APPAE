const User = require('../models/User');

/**
 * CONTROLADOR DE ADMINISTRACIÓN AE
 * Seguridad Crítica: Gestión de personal y acceso.
 * ESTÁNDAR: SINCRO JOKER - Normalización de 10 roles operativos.
 */

// @desc    Obtener todos los usuarios (Lista de Personal)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ elemento: 1 });
        
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('❌ Error Crítico en getAllUsers:', error);
        res.status(500).json({ success: false, message: 'Error de servidor' });
    }
};

// @desc    Actualizar rango o permisos (FIX 400 - ROLES ACTUALIZADOS)
exports.updateRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        // 1. NORMALIZACIÓN SINCRO JOKER
        let finalRole = (role || 'user').trim();
        if (['admin', 'user'].includes(finalRole.toLowerCase())) {
            finalRole = finalRole.toLowerCase();
        } else {
            // Convierte "Oficina Tecnica" a "OFICINA_TECNICA"
            finalRole = finalRole.toUpperCase().replace(/[\s-]+/g, '_');
        }
        
        // 2. JERARQUÍA OFICIAL AE (Sincronizada con User.js)
        const rolesValidos = [
            'admin', 'BOSS', 'OTO', 'DIRECTOR', 'user', 
            'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'
        ];
        
        if (!rolesValidos.includes(finalRole)) {
            return res.status(400).json({ 
                success: false,
                message: `El rol "${finalRole}" no está reconocido en el escalafón AE.` 
            });
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            { role: finalRole }, 
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });
        
        res.status(200).json({ 
            success: true,
            message: `Jerarquía actualizada: ${user.username} ahora es ${finalRole}`,
            data: user 
        });
    } catch (error) {
        console.error('Error en updateRole:', error);
        res.status(500).json({ success: false, message: 'Fallo interno al actualizar permisos' });
    }
};

// @desc    Reseteo forzado de credenciales
exports.resetPassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const { password, newPassword, newPass } = req.body;
        const passwordToSet = password || newPassword || newPass;
        
        if (!passwordToSet || passwordToSet.length < 6) {
            return res.status(400).json({ message: 'La clave debe tener mínimo 6 caracteres' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });

        user.password = passwordToSet;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Credenciales de ${user.username} actualizadas` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fallo al resetear credenciales' });
    }
};

// @desc    Baja definitiva de personal
exports.deleteUser = async (req, res) => {
    try {
        const requesterId = req.user ? req.user._id.toString() : null;

        if (requesterId && req.params.id === requesterId) {
            return res.status(400).json({ 
                message: 'No puede darse de baja a sí mismo.' 
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });
        
        res.status(200).json({ 
            success: true, 
            message: `Baja procesada para GDE: ${user.username}` 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al procesar la baja' });
    }
};

// @desc    Obtener estadísticas rápidas
exports.getAdminStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'OFICINA_TECNICA' }),
            User.countDocuments({ role: 'OPERACIONES' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers: stats[0],
                admins: stats[1],
                oficinaTecnica: stats[2],
                operaciones: stats[3]
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en estadísticas' });
    }
};