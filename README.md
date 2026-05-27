# 💪 Trainer Coach AI - Entrenador Personal Digital Interactivo

**Fit Coach** es una aplicación Web Full-Stack de vanguardia diseñada para transformar la experiencia de entrenamiento y nutrición. Ha evolucionado de ser un generador de planes PDF estático a convertirse en un auténtico **Entrenador Personal Digital** interactivo con memoria persistente y reajuste en tiempo real potenciado por Inteligencia Artificial (Gemini).

---

## 🌟 Características Principales

### 💾 1. Persistencia de Datos Completa (Mongoose + MongoDB)
- **Registro y Autenticación**: Sistema seguro mediante contraseñas cifradas con `bcrypt` y JSON Web Tokens (`JWT`) para sesiones de usuario seguras.
- **Memoria Persistente**: Almacena el perfil físico actual y el último plan de entrenamiento/nutrición generado en la colección de usuarios de MongoDB (`planActual`).

### ⚡ 2. Lógica de Inicio Automático (Autocarga)
- Al iniciar sesión o refrescar la página, el frontend realiza una petición automática a la base de datos para comprobar si el usuario ya posee un plan.
- Si existe un plan activo, se oculta el formulario inicial y se muestra inmediatamente el dashboard con las tablas del plan y el gráfico de macros interactivo.
- Si no posee plan, se muestra el formulario vacío listo para su creación.

### ✍️ 3. Modificaciones Interactivas y Reajuste Biométrico
- **Instrucciones en Texto Libre**: El usuario dispone de un panel interactivo para solicitar modificaciones de forma libre (ej: *"Cámbiame la cena del miércoles por salmón"*, *"Tengo una lesión en el hombro, quita el press de banca"*).
- **Detección Inteligente de Peso**: Si el usuario introduce cambios en su biometría en el cuadro de texto (ej: *"He subido de peso a 83kg y quiero reajustar mi plan"*), un motor regex en el backend detecta el nuevo peso, actualiza su perfil en la base de datos y recalcula automáticamente los macros, calorías y el plan completo con el nuevo peso de partida.

### 🛡️ 4. Resiliencia de la IA (Mecanismo Fallback)
- Para evitar interrupciones debido a caídas o límites de saturación en las API públicas, el backend integra un sistema de fallback dinámico:
  1. Realiza la petición inicial usando el modelo de última generación `gemini-2.5-flash`.
  2. Si este modelo reporta saturación (`503 Service Unavailable`), conmuta de forma automática y transparente al modelo `gemini-1.5-flash`.
  3. Si ambos fallan, retorna una respuesta de error `500` elegante con un mensaje amigable para el usuario sin bloquear la aplicación.

### 📥 5. Exportación Premium en PDF
- Renderiza y genera hojas de estilo exclusivas (`modo-pdf`) para adaptar el dashboard dinámico a un formato de impresión móvil/A4 limpio y ordenado utilizando `html2pdf.js`.

---

## 📁 Estructura del Proyecto

```markdown
├── api/
│   ├── controller/
│   │   └── User.js          # Controladores (Registro, Login, Generar Plan, Modificar Plan, Obtener Plan)
│   ├── models/
│   │   └── User.js          # Esquema de Mongoose (Email, Contraseña, Perfil Físico y Plan Actual)
│   └── route/
│       └── User.js          # Definición de rutas públicas y rutas protegidas con JWT
├── config/
│   └── db.js                # Configuración y conexión a MongoDB Atlas
├── middleware/
│   └── isAuth.js            # Middleware de validación de Token JWT
├── public/
│   ├── app.js               # Lógica del frontend (Fetch de API, renderizado del plan y gráficos)
│   ├── index.html           # Interfaz de usuario (Formularios, Tablas de resultados y Modificaciones)
│   └── style.css            # Estilos CSS premium (variables CSS, gradientes, animaciones y reglas PDF)
├── utils/
│   └── jwt.js               # Funciones de firma y verificación de JWT
├── index.js                 # Punto de entrada principal del servidor Express
├── package.json             # Dependencias del proyecto
└── .env                     # Variables de entorno (Claves de API y URLs de base de datos)
```

---

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio e Instalar dependencias
Navega a la carpeta raíz del proyecto e instala los módulos necesarios:
```bash
npm install
```

### 2. Configurar Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto y añade las siguientes claves:
```env
GEMINI_API_KEY = TuClaveDeAPIDeGoogleGemini
URL_DB = mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<nombre-db>?retryWrites=true&w=majority
JWT_SECRET = TuPalabraSecretaSuperSeguraParaFirmarLosTokens
```

### 3. Ejecutar el Servidor
Puedes levantar el servidor en el puerto 3000 ejecutando:
```bash
node index.js
```
El servidor confirmará en la consola:
```bash
🚀 Servidor deportivo activo en el puerto http://localhost:3000
Conectado con éxito a la base de datos ✅
```

---

## 🤖 Formato de Estructura de Datos (JSON)

Gemini garantiza retornar obligatoriamente un JSON estricto con la siguiente estructura, la cual es parseada tanto en la generación inicial como tras las modificaciones de progreso:

```json
{
  "analisis": "Texto breve de análisis de composición corporal y nuevo enfoque de dieta/entrenamiento.",
  "macros": {
    "proteinas": 170,
    "carbos": 476,
    "grasas": 77,
    "calorias": 3275
  },
  "tabla_dieta": [
    {
      "dia": "Lunes",
      "desayuno": "Descripción...",
      "comida": "Descripción...",
      "cena": "Descripción...",
      "snacks": "Descripción..."
    }
    // ... así hasta Domingo
  ],
  "tabla_entreno": [
    {
      "dia": "Lunes",
      "musculo": "Grupo muscular y enfoque",
      "ejercicios": "Ejercicio 1 (4x10), Ejercicio 2 (3x12)..."
    }
    // ... así hasta Domingo
  ]
}
```

---

## 🧪 Pruebas de Integración Automatizadas

El proyecto incluye un script de validación en la carpeta scratch para realizar pruebas automáticas del ciclo completo de usuario. Puedes lanzarlo usando:
```bash
node .system_generated/scratch/test_api.js
```
Este script comprueba secuencialmente:
1. Registro de usuario único.
2. Login y validación de Token JWT.
3. Comprobación de que no existe plan previo (`null`).
4. Generación inicial de un plan de volumen (peso: `80kg`).
5. Recuperación del plan activo desde MongoDB (`GET /plan`).
6. Solicitud de reajuste por peso a `85kg` y exclusión de pollo.
7. Verificación del incremento proporcional de calorías en macros y cambio de dieta.
