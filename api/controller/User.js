const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateSign } = require('../../utils/jwt');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Función auxiliar con reintentos y exponencial backoff para manejar caídas/saturación de la API de Gemini 2.5 Flash
const generarContenidoConFallback = async (prompt) => {
    let lastError;
    const maxRetries = 3;
    let delay = 1000; // 1 segundo inicial

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 Llamando a Gemini 2.5 Flash (Intento ${attempt}/${maxRetries})...`);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash", 
                generationConfig: { responseMimeType: "application/json" } 
            });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.warn(`⚠️ Intento ${attempt} fallido para gemini-2.5-flash:`, error.message || error);
            lastError = error;
            if (attempt < maxRetries) {
                console.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Backoff exponencial
            }
        }
    }
    
    console.error("❌ Fallaron todos los intentos de Gemini 2.5 Flash.");
    throw lastError;
};

//registro del usuario
const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email })
        if (user){
            return res.status(400).json({ error: 'Ese email ya está registrado ❌' });
        }
        // El salt es añadir "ruido aleatorio" a la contraseña. El '10' es la complejidad.
        // ¿Para qué sirve? Para que si dos usuarios tienen la misma contraseña ("1234"), 
        // su código encriptado en la base de datos sea totalmente distinto gracias al salt.
        const salt = await bcrypt.genSalt(10);
        
        // Paso B: Hashear (Encriptar). 
        // Mezclamos la contraseña plana del usuario con el salt aleatorio generado.
        const hashedPassword = await bcrypt.hash(password, salt);

        // CREAR EL NUEVO USUARIO
        // Usamos nuestro modelo 'User' para crear un objeto nuevo.
        // Le pasamos el email que recibimos, pero OJO, no le pasamos la contraseña plana,
        // le pasamos la versión encriptada (hashedPassword).
        user = new User({
            email: email,
            password: hashedPassword
        });

        // GUARDAR EN LA BASE DE DATOS
        await user.save();
        res.status(201).json({ mensaje: '¡Usuario registrado con éxito! ✅' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Usuario o contraseña incorrecto." });
        }

        // Usamos await bcrypt.compare (asíncrono) para no bloquear el servidor
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        
        if (isPasswordCorrect) {
            const token = generateSign(user._id);
            // devolvemos los datos limpios
            return res.status(200).json({ 
                mensaje: "Login exitoso",
                token: token, 
                user: { email: user.email, perfilFisico: user.perfilFisico } // Evitamos mandar la password
            });
        } else {
            return res.status(400).json({ error: "Usuario o contraseña incorrecto." });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error en el servidor al hacer login" });
    }
};

// ia generar el plan del usuario
const generarPlan = async (req, res) => {
    try {
        const { edad, peso, altura, actividad, objetivo, preferencias, peticionesExtra, grasa, musculo, lugarEntreno, horaEntreno, alimentosDisponibles } = req.body;

        const prompt = `
            Eres un Entrenador Personal y Nutricionista Deportivo de Élite. 
            DATOS CLIENTE: ${peso}kg, ${altura}cm, ${edad}años, %Grasa: ${grasa || 'N/A'}, Músculo: ${musculo || 'N/A'}.
            CONTEXTO: Entrena en ${lugarEntreno} por la ${horaEntreno}.
            OBJETIVO: ${objetivo}. 
            RESTRICCIONES: ${preferencias}.
            ALIMENTOS EN NEVERA / DESEADOS: ${alimentosDisponibles || 'Ninguno especificado'}.
            PETICIÓN ESPECIAL: ${peticionesExtra}.

            INSTRUCCIÓN DE ALIMENTOS: El usuario tiene los siguientes alimentos disponibles en su cocina o le gustaría consumirlos: ${alimentosDisponibles || 'Ninguno especificado'}. Es obligatorio que diseñes la 'tabla_dieta' priorizando el uso de estos alimentos para evitar el desperdicio. Como es una dieta semanal y es probable que falten ingredientes para cubrir todos los días, tienes total libertad para rellenar los huecos restantes con los alimentos saludables que consideres más adecuados para cumplir con sus objetivos de calorías y macronutrientes.

            TAREA: Diseña un plan de 7 días exactos. Ajusta la dieta según la hora de entreno (pre y post entreno).
            
            DEVUELVE ESTE JSON EXACTO:
            {
                "analisis": "Texto breve",
                "macros": { "proteinas": 150, "carbos": 200, "grasas": 70, "calorias": 2100 },
                "tabla_dieta": [
                    { "dia": "Lunes", "desayuno": "...", "comida": "...", "cena": "...", "snacks": "..." },
                    ... (así hasta Domingo)
                ],
                "tabla_entreno": [
                    { "dia": "Lunes", "musculo": "...", "ejercicios": "Ej1 (4x10), Ej2 (3x12)..." },
                    ... (así hasta Domingo)
                ]
            }
        `;

        const responseText = await generarContenidoConFallback(prompt);
        console.log("🤖 Texto crudo de Gemini:", responseText);
        // 🛡️ LIMPIEZA DEL JSON (Súper importante para que no explote)
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const planGenerado = JSON.parse(cleanJson);
        console.log("✅ JSON parseado con éxito");

        // --- DATOS FALSOS PARA PODER TRABAJAR EN EL DISEÑO ---
        // const planGenerado = {
        //     "analisis": "Análisis de prueba: Tu metabolismo basal es de aprox. 1800 kcal. Al buscar perder grasa, aplicaremos un déficit calórico del 15%.",
        //     "macros": { "proteinas": 160, "carbos": 150, "grasas": 60, "calorias": 1780 },
        //     "tabla_dieta": [
        //         { "dia": "Lunes", "desayuno": "Huevos revueltos", "comida": "Pollo a la plancha", "cena": "Salmón al horno", "snacks": "Yogur griego" },
        //         { "dia": "Martes", "desayuno": "Avena con leche", "comida": "Ternera con patatas", "cena": "Ensalada de atún", "snacks": "Fruta" },
        //         { "dia": "Miercoles", "desayuno": "Huevos revueltos", "comida": "Pollo a la plancha", "cena": "Salmón al horno", "snacks": "Yogur griego" },
        //         { "dia": "Jueves", "desayuno": "Avena con leche", "comida": "Ternera con patatas", "cena": "Ensalada de atún", "snacks": "Fruta" },
        //         { "dia": "Viernes", "desayuno": "Huevos revueltos", "comida": "Pollo a la plancha", "cena": "Salmón al horno", "snacks": "Yogur griego" },
        //         { "dia": "Sabado", "desayuno": "Avena con leche", "comida": "Ternera con patatas", "cena": "Ensalada de atún", "snacks": "Fruta" },
        //         { "dia": "Domingo", "desayuno": "Avena con leche", "comida": "Ternera con patatas", "cena": "Ensalada de atún", "snacks": "Fruta" }
        //         // (El frontend pintará esto perfectamente aunque sean solo 2 días)
        //     ],
        //     "tabla_entreno": [
        //         { "dia": "Lunes", "enfoque": "Pecho y Tríceps", "ejercicios": "Press Banca (4x10), Flexiones (3xFallo)" },
        //         { "dia": "Martes", "enfoque": "Espalda y Bíceps", "ejercicios": "Dominadas (4x8), Remo (3x12)" },
        //         { "dia": "Lunes", "enfoque": "Pecho y Tríceps", "ejercicios": "Press Banca (4x10), Flexiones (3xFallo)" },
        //         { "dia": "Martes", "enfoque": "Espalda y Bíceps", "ejercicios": "Dominadas (4x8), Remo (3x12)" },
        //         { "dia": "Lunes", "enfoque": "Pecho y Tríceps", "ejercicios": "Press Banca (4x10), Flexiones (3xFallo)" },
        //         { "dia": "Martes", "enfoque": "Espalda y Bíceps", "ejercicios": "Dominadas (4x8), Remo (3x12)" },
        //         { "dia": "Martes", "enfoque": "Espalda y Bíceps", "ejercicios": "Dominadas (4x8), Remo (3x12)" }
        //     ]
        // };

        // Guardar en DB (guardamos tanto el perfil físico como el plan generado)
        await User.findByIdAndUpdate(req.user._id, { perfilFisico: req.body, planActual: planGenerado }, { new: true });
        console.log("💾 Guardado en MongoDB con éxito");
        return res.status(200).json(planGenerado);

    } catch (error) {
        console.error("❌ ERROR FATAL EN EL BACKEND:", error);
        res.status(500).json({ error: "El servicio de Inteligencia Artificial está temporalmente saturado o no disponible. Por favor, inténtalo de nuevo en unos instantes." });
    }
};

// Obtener el plan actual del usuario
const obtenerPlanActual = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        return res.status(200).json({ 
            planActual: user.planActual || null,
            perfilFisico: user.perfilFisico || null
        });
    } catch (error) {
        console.error("❌ Error al obtener el plan actual:", error);
        return res.status(500).json({ error: "Error al recuperar el plan de la base de datos." });
    }
};

// Modificar plan actual interactivo
const modificarPlan = async (req, res) => {
    try {
        const { peticionModificacion } = req.body;
        if (!peticionModificacion || peticionModificacion.trim() === "") {
            return res.status(400).json({ error: "Debes escribir qué cambios deseas realizar." });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        if (!user.planActual) {
            return res.status(400).json({ error: "No tienes un plan activo que se pueda modificar. Primero genera uno." });
        }

        // Si el usuario especifica un cambio de peso en la petición libre, lo detectamos con regex y lo actualizamos en la BD
        console.log(`⚖️ Analizando petición para detectar cambio de peso: "${peticionModificacion}"`);
        const pesoMatch = peticionModificacion.match(/(?:peso\s+(?:a|de|es|actual)\s+|subido\s+(?:de\s+peso\s+)?a\s+|bajado\s+(?:de\s+peso\s+)?a\s+|tengo\s+|ahora\s+peso\s+|sub[ií]\s+a\s+)(\d+(?:\.\d+)?)\s*(?:kg|kilos)/i);
        if (pesoMatch) {
            const nuevoPeso = parseFloat(pesoMatch[1]);
            if (!isNaN(nuevoPeso) && user.perfilFisico) {
                user.perfilFisico.peso = nuevoPeso;
                user.markModified('perfilFisico');
                await user.save();
                console.log(`⚖️ Peso del usuario actualizado automáticamente en base de datos a ${nuevoPeso}kg`);
            }
        } else {
            console.log("⚖️ No se detectó cambio de peso explícito en el texto.");
        }

        const prompt = `
            Eres un Entrenador Personal y Nutricionista Deportivo de Élite. 
            El cliente ya tiene un plan activo y ha solicitado realizar modificaciones o registrar un progreso.
            
            DATOS DE PERFIL FÍSICO ACTUALIZADOS DEL CLIENTE:
            ${JSON.stringify(user.perfilFisico, null, 2)}

            PLAN ACTUAL ACTIVO:
            ${JSON.stringify(user.planActual, null, 2)}

            SOLICITUD DE MODIFICACIÓN / REGISTRO DE PROGRESO DEL USUARIO:
            "${peticionModificacion}"

            TAREA:
            Modifica el plan actual aplicando ESTRICTAMENTE la solicitud del cliente.
            - Si la solicitud implica reajuste por peso, recalcula las calorías y macros basándote en su perfil físico y actualiza tanto el análisis como los macros y el plan semanal (dieta y entreno).
            - Si la solicitud pide cambiar platos, alimentos, modificar ejercicios o ajustar por lesiones/molestias físicas, realiza los cambios precisos manteniendo el resto del plan coherente y equilibrado.
            - Respeta la estructura exacta original del JSON.

            DEVUELVE ESTE JSON EXACTO (sin texto adicional, solo el JSON):
            {
                "analisis": "Texto breve explicando las modificaciones realizadas y el nuevo enfoque",
                "macros": { "proteinas": 150, "carbos": 200, "grasas": 70, "calorias": 2100 },
                "tabla_dieta": [
                    { "dia": "Lunes", "desayuno": "...", "comida": "...", "cena": "...", "snacks": "..." },
                    ... (así hasta Domingo)
                ],
                "tabla_entreno": [
                    { "dia": "Lunes", "musculo": "...", "ejercicios": "Ej1 (4x10), Ej2 (3x12)..." },
                    ... (así hasta Domingo)
                ]
            }
        `;

        const responseText = await generarContenidoConFallback(prompt);
        console.log("🤖 Texto crudo de modificación de Gemini:", responseText);

        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const planModificado = JSON.parse(cleanJson);

        // Guardamos el nuevo plan en la base de datos
        user.planActual = planModificado;
        user.markModified('planActual');
        await user.save();

        console.log("💾 Plan modificado guardado en MongoDB con éxito");
        return res.status(200).json(planModificado);

    } catch (error) {
        console.error("❌ ERROR AL MODIFICAR PLAN EN EL BACKEND:", error);
        return res.status(500).json({ error: "El servicio de Inteligencia Artificial está temporalmente saturado o no disponible. Por favor, inténtalo de nuevo en unos instantes." });
    }
};

module.exports = { register, login, generarPlan, obtenerPlanActual, modificarPlan };
