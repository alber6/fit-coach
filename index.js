
// dotenv su funcion es leer el archivo oculto .env y añadir la clave secreta en la memoria de node
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectBD } = require('./config/db')
const path = require('path');

// importar rutas
const usersRouter = require('./api/route/User')

connectBD()

// Inicializamos el servidor Express
const app = express();
app.use(cors());
app.use(express.json()); // Para poder leer JSON en las peticiones
app.use(express.static(path.join(__dirname, 'public'))); // Esto expone tu carpeta public al navegador

// ASIGNAR LAS RUTAS Todo el tráfico que empiece por /api/v1/users
app.use("/api/v1/users", usersRouter);


// Usamos el puerto que nos dé Render, o el 3000 si estamos en local
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor deportivo activo en http://localhost:${PUERTO}`);
});