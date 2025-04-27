// --- Configuración de Firebase (SIN CAMBIOS) ---
const firebaseConfig = {
  apiKey: "AIzaSyDXDotyDcrJ8o1U_PNXm1RgzoMx0uAU3f8", // ¡Tu API Key real!
  authDomain: "datos-lm.firebaseapp.com",
  databaseURL: "https://datos-lm-default-rtdb.firebaseio.com", // ¡Tu Database URL real!
  projectId: "datos-lm",
  storageBucket: "datos-lm.firebasestorage.app",
  messagingSenderId: "552540792054",
  appId: "1:552540792054:web:770291d30460f2c05778d7",
  measurementId: "G-FFV2G059J4"
};

// --- Inicializar Firebase ---
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth(); // Inicializar servicio de Auth

// --- Referencia a la ubicación 'personas' en la base de datos ---
const personasRef = database.ref('personas');

// --- Seleccionar Elementos del DOM ---
const listaPersonasUL = document.getElementById('lista-personas');
const top5ListUL = document.getElementById('top-5-lista'); // Lista para el Top 5
const loginForm = document.getElementById('login-form');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginErrorP = document.getElementById('login-error');
const mainContent = document.getElementById('main-content');
const loginPromptDiv = document.getElementById('login-prompt');

// --- Variable para guardar los datos locales ---
let personas = {};
let currentUser = null; // Para saber si hay alguien logueado

// --- Funciones de Renderizado ---

// Función para mostrar/actualizar la LISTA COMPLETA en el HTML
function renderListaCompleta() {
    listaPersonasUL.innerHTML = ''; // Limpiar lista actual

    if (!personas || Object.keys(personas).length === 0) {
        listaPersonasUL.innerHTML = '<li>No hay participantes registrados.</li>';
        return;
    }

    // Convertir a array y ordenar (p.ej., alfabéticamente por nombre para la lista completa)
    const personasOrdenadas = Object.entries(personas)
        .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre));

    for (const [id, persona] of personasOrdenadas) {
        const li = document.createElement('li');

        // Span con nombre y puntos
        const span = document.createElement('span');
        span.textContent = `${persona.nombre} (${persona.puntos} puntos)`;
        li.appendChild(span);

        // Si el usuario está logueado, añadir controles de modificación
        if (currentUser) {
            const controlsDiv = document.createElement('div');
            controlsDiv.classList.add('controls');

            // Botón Restar 1 (-)
            const btnRestar = document.createElement('button');
            btnRestar.textContent = '-';
            btnRestar.title = "Restar 1 punto";
            btnRestar.classList.add('decrement');
            btnRestar.dataset.id = id;
            controlsDiv.appendChild(btnRestar);

             // Botón Sumar 1 (+)
             const btnSumar = document.createElement('button');
             btnSumar.textContent = '+';
             btnSumar.title = "Sumar 1 punto";
             btnSumar.classList.add('increment');
             btnSumar.dataset.id = id;
             controlsDiv.appendChild(btnSumar);

            // Input para cantidad
            const inputPuntos = document.createElement('input');
            inputPuntos.type = 'number';
            inputPuntos.placeholder = 'Pts';
            inputPuntos.classList.add('points-input');
            inputPuntos.setAttribute('aria-label', `Cantidad de puntos para ${persona.nombre}`); // Accesibilidad
            controlsDiv.appendChild(inputPuntos);

            // Botón para Añadir/Restar cantidad del input
            const btnUpdate = document.createElement('button');
            btnUpdate.textContent = '+/-';
            btnUpdate.title = "Sumar o restar la cantidad indicada";
            btnUpdate.classList.add('update-points');
            btnUpdate.dataset.id = id;
            controlsDiv.appendChild(btnUpdate);

            li.appendChild(controlsDiv);
        }

        listaPersonasUL.appendChild(li);
    }
}

// Función para mostrar/actualizar el TOP 5 en el HTML
function renderTop5() {
    top5ListUL.innerHTML = ''; // Limpiar lista

    if (!personas || Object.keys(personas).length === 0) {
        top5ListUL.innerHTML = '<li>N/A</li>';
        return;
    }

    // Convertir a array, ordenar por PUNTOS (descendente) y tomar los 5 primeros
    const topPersonas = Object.entries(personas)
        .sort(([, a], [, b]) => b.puntos - a.puntos) // Ordena por puntos descendente
        .slice(0, 5); // Tomar solo los 5 primeros

    if (topPersonas.length === 0) {
         top5ListUL.innerHTML = '<li>N/A</li>';
         return;
    }

    topPersonas.forEach(([id, persona], index) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        // Añadir emoji de medalla según posición
        let medal = '';
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';

        span.textContent = `${medal}${persona.nombre} (${persona.puntos} puntos)`;
        li.appendChild(span);
        top5ListUL.appendChild(li);
    });
}


// --- Funciones de Autenticación ---

function handleLogin(event) {
    event.preventDefault(); // Evitar recarga de página por formulario
    const email = emailInput.value;
    const password = passwordInput.value;
    loginErrorP.textContent = ''; // Limpiar errores previos

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Inicio de sesión exitoso
            console.log("Usuario logueado:", userCredential.user.email);
            // El listener onAuthStateChanged se encargará de actualizar la UI
        })
        .catch((error) => {
            console.error("Error de inicio de sesión:", error);
            loginErrorP.textContent = getFirebaseErrorMessage(error); // Mostrar error amigable
        });
}

function handleLogout() {
    auth.signOut().then(() => {
        console.log("Usuario deslogueado");
        // El listener onAuthStateChanged actualizará la UI
    }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
    });
}

// Función para traducir errores comunes de Firebase Auth
function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'El formato del correo es inválido.';
        case 'auth/user-disabled':
            return 'Este usuario ha sido deshabilitado.';
        case 'auth/user-not-found':
            return 'No se encontró un usuario con ese correo.';
        case 'auth/wrong-password':
            return 'La contraseña es incorrecta.';
        case 'auth/invalid-credential':
             return 'Credenciales inválidas (correo o contraseña incorrecta).';
        default:
            return 'Error al iniciar sesión. Inténtalo de nuevo.';
    }
}


// --- Función para manejar Clics en Botones de Puntos (Actualizada) ---
function manejarClicControles(event) {
    const target = event.target;
    // Solo actuar si el usuario está logueado
    if (!currentUser) return;

    // Verificar si se hizo clic en un botón dentro de la lista principal
    if (target.tagName === 'BUTTON' && listaPersonasUL.contains(target)) {
        const id = target.dataset.id;
        if (!id || !personas[id]) return; // Salir si no hay ID o persona

        let puntosActuales = personas[id].puntos;
        let nuevosPuntos;
        let cantidadModificar = 0; // Cantidad a sumar/restar

        if (target.classList.contains('increment')) {
            cantidadModificar = 1;
            console.log(`Intentando sumar 1 punto a: ${id}`);
        } else if (target.classList.contains('decrement')) {
            cantidadModificar = -1;
             console.log(`Intentando restar 1 punto a: ${id}`);
        } else if (target.classList.contains('update-points')) {
            // Encontrar el input asociado a este botón
            const inputElement = target.closest('.controls').querySelector('.points-input');
            if (inputElement) {
                cantidadModificar = parseInt(inputElement.value, 10) || 0; // Tomar valor del input, 0 si está vacío/inválido
                console.log(`Intentando modificar ${cantidadModificar} puntos a: ${id}`);
                inputElement.value = ''; // Limpiar input después de usar
            }
        } else {
            return; // No es un botón conocido
        }

        if (cantidadModificar !== 0) {
            nuevosPuntos = puntosActuales + cantidadModificar;

             // --- ACTUALIZAR EN FIREBASE ---
             const puntosPersonaRef = database.ref(`personas/${id}/puntos`);
             puntosPersonaRef.set(nuevosPuntos)
                 .then(() => {
                     console.log(`Puntos actualizados para ${id} a ${nuevosPuntos} en Firebase.`);
                     // La UI se actualiza por el listener 'onValue'
                 })
                 .catch((error) => {
                     console.error(`Error al actualizar puntos para ${id}:`, error);
                     alert(`Error al actualizar puntos para ${personas[id]?.nombre || id}. Revisa las reglas de seguridad o la conexión.`);
                 });
        }
    }
}

// --- Función para Actualizar la UI basada en el estado de Auth ---
function updateUIBasedOnAuth() {
    if (currentUser) {
        // Usuario LOGUEADO
        loginForm.classList.add('hidden'); // Ocultar form de login
        userInfoDiv.classList.remove('hidden'); // Mostrar info de usuario y botón logout
        userEmailSpan.textContent = currentUser.email;
        mainContent.classList.remove('hidden'); // Mostrar contenido principal
        loginPromptDiv.classList.add('hidden'); // Ocultar mensaje "inicia sesión"
        renderListaCompleta(); // Re-renderizar lista CON controles
        renderTop5(); // Renderizar Top 5
    } else {
        // Usuario NO LOGUEADO
        loginForm.classList.remove('hidden'); // Mostrar form de login
        userInfoDiv.classList.add('hidden'); // Ocultar info de usuario
        userEmailSpan.textContent = '';
        // mainContent.classList.add('hidden'); // Opcional: Ocultar todo si no está logueado
        mainContent.classList.remove('hidden'); // DEJAR VISIBLE para ver puntuaciones
        loginPromptDiv.classList.remove('hidden'); // Mostrar mensaje "inicia sesión"
        loginErrorP.textContent = ''; // Limpiar errores
        renderListaCompleta(); // Re-renderizar lista SIN controles
        renderTop5(); // Renderizar Top 5
    }
}


// --- Listener Principal de Firebase (Datos y Auth) ---

// 1. Listener para cambios en la base de datos ('personas')
personasRef.on('value', (snapshot) => {
    console.log("Datos recibidos/actualizados desde Firebase!");
    if (snapshot.exists()) {
        personas = snapshot.val();
    } else {
        personas = {};
        console.log("No hay datos en /personas en Firebase.");
    }
    // Siempre renderizar ambas listas cuando los datos cambian
    // La función renderListaCompleta decidirá si poner controles o no basado en currentUser
    renderListaCompleta();
    renderTop5();
}, (error) => {
    console.error("Error al leer datos de Firebase:", error);
    listaPersonasUL.innerHTML = '<li>Error al cargar datos. Revisa la consola (F12) y las reglas de seguridad.</li>';
    top5ListUL.innerHTML = '<li>Error</li>';
});

// 2. Listener para cambios en el estado de autenticación
auth.onAuthStateChanged((user) => {
    console.log("Cambio de estado de Auth detectado");
    if (user) {
        // Usuario está logueado
        currentUser = user;
    } else {
        // Usuario no está logueado
        currentUser = null;
    }
    // Actualizar la interfaz gráfica completa basada en si hay usuario o no
    updateUIBasedOnAuth();
});


// --- Añadir Event Listeners Iniciales ---
loginButton.addEventListener('click', handleLogin);
logoutButton.addEventListener('click', handleLogout);
// Usar delegación de eventos para los botones de puntos en la lista completa
listaPersonasUL.addEventListener('click', manejarClicControles);

console.log("App inicializada. Esperando estado de autenticación y datos...");
