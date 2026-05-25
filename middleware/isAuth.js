const User = require("../api/models/User"); 
const { verifyJwt } = require("../utils/jwt"); 

const isAuth = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            // Comprobamos que la cabecera exista antes de romperla
            if (!req.headers.authorization) {
                return res.status(401).json({ error: "No estás autorizado. Falta el token." });
            }

            // Extraemos el token limpio
            const [, token] = req.headers.authorization.split(" ");
            
            // Verificamos la firma (si el token es inventado o caducó, salta al catch)
            const { id } = verifyJwt(token);
            
            // Buscamos al usuario en la base de datos
            const user = await User.findById(id);
            if (!user) {
                return res.status(401).json({ error: "El usuario ya no existe." });
            }
            
            // Limpiamos datos sensibles antes de adjuntarlo a la request
            user.password = null; 
            req.user = user;

            // Sistema de Roles (Lo dejamos preparado aunque de momento no tengamos roles en el modelo)
            if (allowedRoles.length > 0 && (!user.roles || !allowedRoles.includes(user.roles))) {
                return res.status(403).json({ error: "Acceso denegado: permisos insuficientes" });
            }

            // ¡Todo correcto! Abrimos la puerta al siguiente paso
            next();
            
        } catch (error) {
            // Si el verifyJwt falla, el error cae aquí directamente
            return res.status(401).json({ error: "Token inválido o expirado." });
        }
    };
};

module.exports = { isAuth };