const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    perfilFisico:{
edad: { type: Number },
    peso: { type: Number },
    altura: { type: Number },
    actividad: { type: String },
    objetivo: { type: String },
    preferencias: { type: String },
    grasa: { type: Number },
    musculo: { type: Number },
    lugarEntreno: { type: String },
    horaEntreno: { type: String }
    },
    planActual: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    // Esta opción añade automáticamente dos campos:
    // createdAt (cuándo se registró) y updatedAt (cuándo cambió sus datos)
    timestamps: true
});
// El primer parámetro 'User' es el nombre que tendrá la colección en MongoDB (se creará como 'users')
const User = mongoose.model('User', userSchema)
module.exports = User;
