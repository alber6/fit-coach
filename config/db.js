
const mongoose = require('mongoose')

const connectBD = async () => {
    try {
        await mongoose.connect(process.env.URL_DB);
        console.log("Conectado con éxito a la base de datos ✅")
    } catch (error) {
        console.log("Fallo en la conexión con la base de datos ❌")
    }
};
// para iniciar la app node index.js
module.exports = { connectBD }