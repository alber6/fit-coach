const jwt = require('jsonwebtoken');

// Generar el token (Firma)
const generateSign = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' }); // Caduca en 30 días
};

// Comprobar si el token es válido
const verifyJwt = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateSign, verifyJwt };