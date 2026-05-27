// ==========================================
// 1. NAVEGACIÓN ENTRE LOGIN Y REGISTRO
// ==========================================
document.getElementById('linkToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'block';
});

document.getElementById('linkToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerBox').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
});

// ==========================================
// 2. LÓGICA DE REGISTRO
// ==========================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('/api/v1/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.status === 201 || response.ok) {
            alert('¡Registro exitoso! ✅ Ya puedes iniciar sesión con tu cuenta.');
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('registerBox').style.display = 'none';
            document.getElementById('loginBox').style.display = 'block';
        } else {
            alert(data.error || 'Error al registrar tu cuenta ❌');
        }
    } catch (error) {
        console.error("Error en el registro:", error);
        alert("Hubo un error de conexión.");
    }
});

// ==========================================
// 3. LÓGICA DE LOGIN (¡La que faltaba!)
// ==========================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/v1/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardamos el token en el navegador
            localStorage.setItem('fitCoachToken', data.token);
            alert('¡Login exitoso! ✅');
            
            // Ocultamos el área de Auth y mostramos la App de IA
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('appSection').style.display = 'block';
            await cargarPlanActual();
        } else {
            alert(data.error || 'Error al iniciar sesión ❌');
        }
    } catch (error) {
        console.error("Error en el login:", error);
        alert("Hubo un error de conexión.");
    }
});

// ==========================================
// 4. LÓGICA DE LA IA (GENERAR PLAN)
// ==========================================
let macrosChart = null; // Variable global para el gráfico

// FUNCIÓN PARA RENDERIZAR TODO EL PLAN (TABLAS, GRÁFICOS Y ANÁLISIS)
function renderizarPlan(data) {
    // 1. Pintar Análisis
    document.getElementById('res-analisis').innerText = data.analisis;

    // 2. Pintar Gráfico de Macros (Chart.js)
    dibujarGrafico(data.macros);

    // 3. Generar Tabla Dieta
    generarTablaHTML('tabla-dieta', ["Día", "Desayuno", "Comida", "Cena", "Snacks/Post"], data.tabla_dieta);

    // 4. Generar Tabla Entreno
    generarTablaHTML('tabla-entreno', ["Día", "Enfoque", "Ejercicios y Series"], data.tabla_entreno);

    // Ocultar formulario, mostrar resultados
    document.getElementById('fitForm').classList.add('hidden');
    document.getElementById('resultados').classList.remove('hidden');
}

// FUNCIÓN PARA RECUPERAR EL PLAN GUARDADO
async function cargarPlanActual() {
    const token = localStorage.getItem('fitCoachToken');
    if (!token) return;

    try {
        const response = await fetch('/api/v1/users/plan', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            if (data.perfilFisico) {
                precargarFormulario(data.perfilFisico);
            }
            if (data.planActual) {
                renderizarPlan(data.planActual);
            } else {
                document.getElementById('fitForm').classList.remove('hidden');
                document.getElementById('resultados').classList.add('hidden');
            }
        }
    } catch (error) {
        console.error("❌ Error al cargar plan actual:", error);
    }
}

document.getElementById('fitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ Generando Plan Maestro...";

    // Recogemos todos los campos nuevos
    const body = {
        edad: document.getElementById('edad').value,
        peso: document.getElementById('peso').value,
        altura: document.getElementById('altura').value,
        grasa: document.getElementById('grasa').value,
        musculo: document.getElementById('musculo').value,
        actividad: document.getElementById('actividad').value,
        objetivo: document.getElementById('objetivo').value,
        lugarEntreno: document.getElementById('lugarEntreno').value,
        horaEntreno: document.getElementById('horaEntreno').value,
        preferencias: document.getElementById('preferencias').value,
        peticionesExtra: document.getElementById('peticionesExtra').value,
        alimentosDisponibles: document.getElementById('alimentosDisponibles').value
    };

    try {
        const response = await fetch('/api/v1/users/generar-plan', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fitCoachToken')}` 
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        // 🛡️ EL ESCUDO: Si el backend falla, paramos antes de dibujar las tablas
        if (!response.ok) {
            throw new Error(data.error || "Fallo en el servidor (500)");
        }

        renderizarPlan(data);

    } catch (err) { 
        console.error("❌ Error en el Frontend:", err);
        alert("Fallo al generar: " + err.message); 
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "🚀 Generar Plan Maestro";
    }
});

// FUNCIÓN PARA CREAR TABLAS
function generarTablaHTML(idId, cabeceras, filas) {
    const tabla = document.getElementById(idId);
    let html = `<thead><tr>${cabeceras.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    
    filas.forEach(fila => {
        html += `<tr>${Object.values(fila).map(v => `<td>${v}</td>`).join('')}</tr>`;
    });
    
    tabla.innerHTML = html + `</tbody>`;
}

// FUNCIÓN PARA CHART.JS
function dibujarGrafico(macros) {
    const ctx = document.getElementById('macrosChart').getContext('2d');
    if (macrosChart) macrosChart.destroy(); // Borrar si ya existía uno
    
    macrosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Proteínas', 'Carbos', 'Grasas'],
            datasets: [{
                data: [macros.proteinas, macros.carbos, macros.grasas],
                backgroundColor: ['#4facfe', '#00f2fe', '#f093fb']
            }]
        },
        options: { plugins: { title: { display: true, text: `Total: ${macros.calorias} kcal` } } }
    });
}

// FUNCIÓN PARA DESCARGAR PDF
document.getElementById('btnPDF').addEventListener('click', async () => {
    const elemento = document.getElementById('contenido-a-exportar');
    const btn = document.getElementById('btnPDF');
    
    // Cambiamos el texto del botón para que el usuario sepa que está cargando
    btn.innerText = "⏳ Generando PDF...";
    btn.disabled = true;

    // 1. Aplicamos la clase para el formato papel
    elemento.classList.add('modo-pdf');

    // 2. 🛑 EL TRUCO MAGISTRAL: Esperamos 300ms para que el navegador redibuje la pantalla
    await new Promise(resolve => setTimeout(resolve, 300));

    const opt = {
        margin: [15, 10, 15, 10], // Un poco más de margen arriba y abajo
        filename: 'Mi_Plan_FitCoach.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            scrollY: 0 // Evita fallos si el usuario ha hecho scroll hacia abajo
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        // 3. Hacemos la foto ahora que todo está en su sitio
        await html2pdf().set(opt).from(elemento).save();
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Hubo un problema al crear el PDF.");
    } finally {
        // 4. Restauramos el diseño web y el botón
        elemento.classList.remove('modo-pdf');
        btn.innerText = "📥 Descargar PDF para Móvil";
        btn.disabled = false;
    }
});

// ==========================================
// 5. AUTO-LOGIN AL RECARGAR LA PÁGINA
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const tokenGuardado = localStorage.getItem('fitCoachToken');
    if (tokenGuardado) {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('appSection').style.display = 'block';
        await cargarPlanActual();
    }
});

// ==========================================
// 6. LÓGICA DE MODIFICACIÓN INTERACTIVA
// ==========================================
const btnAbrirMod = document.getElementById('btnAbrirModificacion');
const btnCancelarMod = document.getElementById('btnCancelarModificacion');
const btnEnviarMod = document.getElementById('btnEnviarModificacion');
const seccionMod = document.getElementById('seccionModificacion');
const txtMod = document.getElementById('txtModificacion');

btnAbrirMod.addEventListener('click', () => {
    seccionMod.classList.remove('hidden');
    btnAbrirMod.classList.add('hidden');
    txtMod.focus();
});

btnCancelarMod.addEventListener('click', () => {
    seccionMod.classList.add('hidden');
    btnAbrirMod.classList.remove('hidden');
    txtMod.value = '';
});

btnEnviarMod.addEventListener('click', async () => {
    const peticion = txtMod.value.trim();
    if (!peticion) {
        alert("Por favor, escribe los cambios que deseas realizar.");
        return;
    }

    // Cambiar a estado cargando
    btnEnviarMod.disabled = true;
    btnEnviarMod.innerText = "⏳ Modificando Plan...";
    btnCancelarMod.disabled = true;

    try {
        const response = await fetch('/api/v1/users/modificar-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fitCoachToken')}`
            },
            body: JSON.stringify({ peticionModificacion: peticion })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Fallo en el servidor (500)");
        }

        // Renderizar el nuevo plan modificado
        renderizarPlan(data);
        alert("¡Plan modificado con éxito! ✅");

        // Limpiar y ocultar panel
        txtMod.value = '';
        seccionMod.classList.add('hidden');
        btnAbrirMod.classList.remove('hidden');

    } catch (err) {
        console.error("❌ Error al modificar plan:", err);
        alert("Fallo al modificar plan: " + err.message);
    } finally {
        btnEnviarMod.disabled = false;
        btnEnviarMod.innerText = "Enviar Petición a la IA 🚀";
        btnCancelarMod.disabled = false;
    }
});

// ==========================================
// 7. LÓGICA DE CREAR NUEVO PLAN
// ==========================================
function precargarFormulario(perfil) {
    if (!perfil) return;
    if (perfil.edad) document.getElementById('edad').value = perfil.edad;
    if (perfil.peso) document.getElementById('peso').value = perfil.peso;
    if (perfil.altura) document.getElementById('altura').value = perfil.altura;
    if (perfil.grasa) document.getElementById('grasa').value = perfil.grasa;
    if (perfil.musculo) document.getElementById('musculo').value = perfil.musculo;
    if (perfil.actividad) document.getElementById('actividad').value = perfil.actividad;
    if (perfil.objetivo) document.getElementById('objetivo').value = perfil.objetivo;
    if (perfil.lugarEntreno) document.getElementById('lugarEntreno').value = perfil.lugarEntreno;
    if (perfil.horaEntreno) document.getElementById('horaEntreno').value = perfil.horaEntreno;
    if (perfil.preferencias) document.getElementById('preferencias').value = perfil.preferencias;
    if (perfil.peticionesExtra) document.getElementById('peticionesExtra').value = perfil.peticionesExtra;
    if (perfil.alimentosDisponibles) document.getElementById('alimentosDisponibles').value = perfil.alimentosDisponibles;
}

document.getElementById('btnNuevoPlan').addEventListener('click', () => {
    document.getElementById('fitForm').classList.remove('hidden');
    document.getElementById('resultados').classList.add('hidden');
});