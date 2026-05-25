const { register, login, generarPlan, obtenerPlanActual, modificarPlan } = require('../controller/User');
const { isAuth } = require("../../middleware/isAuth")
const usersRouter = require("express").Router();

// RUTAS PÚBLICAS -> cualquiera puede verlo
usersRouter.post("/register", register);
usersRouter.post("/login", login);

// RUTAS DE USUARIO LOGUEADO
usersRouter.post('/generar-plan', isAuth(), generarPlan);
usersRouter.get('/plan', isAuth(), obtenerPlanActual);
usersRouter.post('/modificar-plan', isAuth(), modificarPlan);

module.exports = usersRouter;