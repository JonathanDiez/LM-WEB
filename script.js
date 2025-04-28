const firebaseConfig = {
    apiKey: "AIzaSyDXDotyDcrJ8o1U_PNXm1RgzoMx0uAU3f8",
    authDomain: "datos-lm.firebaseapp.com",
    databaseURL: "https://datos-lm-default-rtdb.firebaseio.com",
    projectId: "datos-lm",
    storageBucket: "datos-lm.firebasestorage.app",
    messagingSenderId: "552540792054",
    appId: "1:552540792054:web:770291d30460f2c05778d7",
    measurementId: "G-FFV2G059J4"
};
  
// --- Inicializar Firebase ---
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

const personasRef = database.ref('personas');

// --- Seleccionar Elementos del DOM ---
const listaPersonasUL = document.getElementById('lista-personas');
const top5ListUL = document.getElementById('top-5-lista');
const loginForm = document.getElementById('login-form');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginErrorP = document.getElementById('login-error');
const loginPromptDiv = document.getElementById('login-prompt');
const addParticipantSection = document.getElementById('add-participant-section');
const addParticipantForm = document.getElementById('add-participant-form');
const newParticipantNameInput = document.getElementById('new-participant-name');
const newParticipantPointsInput = document.getElementById('new-participant-points');
const addParticipantButton = document.getElementById('add-participant-button');
const addErrorP = document.getElementById('add-error');


// --- Variables Globales ---
let personas = {};
let currentUser = null;

function renderListaCompleta() {
    listaPersonasUL.innerHTML = '';

    if (!personas || Object.keys(personas).length === 0) {
        listaPersonasUL.innerHTML = '<li>No hay participantes registrados.</li>';
        return;
    }

    const personasOrdenadas = Object.entries(personas)
        .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre));

    for (const [id, persona] of personasOrdenadas) {
        const li = document.createElement('li');

        // Contenedor para Nombre y Puntos
        const infoDiv = document.createElement('div');
        infoDiv.classList.add('participant-info');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('participant-name');
        nameSpan.textContent = persona.nombre;
        infoDiv.appendChild(nameSpan);

        const pointsSpan = document.createElement('span');
        pointsSpan.classList.add('participant-points');
        pointsSpan.textContent = `Puntos: ${persona.puntos}`;
        infoDiv.appendChild(pointsSpan);

        li.appendChild(infoDiv); 

        if (currentUser) {

            const btnRemove = document.createElement('button');
            btnRemove.innerHTML = '🗑️';
            btnRemove.title = `Eliminar a ${persona.nombre}`;
            btnRemove.classList.add('remove-participant-btn');
            btnRemove.dataset.id = id;
            btnRemove.dataset.name = persona.nombre;
            li.appendChild(btnRemove);

            const controlsDiv = document.createElement('div');
            controlsDiv.classList.add('controls');

            const btnRestar = document.createElement('button');
            btnRestar.textContent = '−'; // Caracter menos
            btnRestar.title = "Restar 1 punto";
            btnRestar.classList.add('decrement');
            btnRestar.dataset.id = id;
            controlsDiv.appendChild(btnRestar);

            const btnSumar = document.createElement('button');
            btnSumar.textContent = '+';
            btnSumar.title = "Sumar 1 punto";
            btnSumar.classList.add('increment');
            btnSumar.dataset.id = id;
            controlsDiv.appendChild(btnSumar);

            const inputPuntos = document.createElement('input');
            inputPuntos.type = 'number';
            inputPuntos.placeholder = 'Pts';
            inputPuntos.classList.add('points-input');
            inputPuntos.setAttribute('aria-label', `Cantidad puntos para ${persona.nombre}`);
            controlsDiv.appendChild(inputPuntos);

            const btnUpdate = document.createElement('button');
            btnUpdate.textContent = '+/−';
            btnUpdate.title = "Sumar o restar la cantidad indicada";
            btnUpdate.classList.add('update-points');
            btnUpdate.dataset.id = id;
            controlsDiv.appendChild(btnUpdate);

            li.appendChild(controlsDiv);
        }

        listaPersonasUL.appendChild(li); 
    }
}

function renderTop5() {
    top5ListUL.innerHTML = '';

    if (!personas || Object.keys(personas).length === 0) {
        top5ListUL.innerHTML = '<li>N/A</li>';
        return;
    }

    const topPersonas = Object.entries(personas)
        .sort(([, a], [, b]) => b.puntos - a.puntos) 
        .slice(0, 5);

    if (topPersonas.length === 0) {
        top5ListUL.innerHTML = '<li>N/A</li>';
        return;
    }

    topPersonas.forEach(([id, persona], index) => {
        const li = document.createElement('li');

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('participant-info');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('participant-name');
        let medal = '';
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';
        nameSpan.textContent = `${medal}${persona.nombre}`;
        infoDiv.appendChild(nameSpan);

        const pointsSpan = document.createElement('span');
        pointsSpan.classList.add('participant-points');
        pointsSpan.textContent = `Puntos: ${persona.puntos}`; 
        infoDiv.appendChild(pointsSpan);

        li.appendChild(infoDiv);
        top5ListUL.appendChild(li);
    });
}


// --- Funciones de Autenticación (Sin cambios) ---
function handleLogin(event) {
    event.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    loginErrorP.textContent = '';
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => { console.log("Usuario logueado:", userCredential.user.email); })
        .catch((error) => {
            console.error("Error de inicio de sesión:", error);
            loginErrorP.textContent = getFirebaseErrorMessage(error);
        });
}

function handleLogout() {
    auth.signOut().then(() => { console.log("Usuario deslogueado"); })
    .catch((error) => { console.error("Error al cerrar sesión:", error); });
}

function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'El formato del correo es inválido.';
        case 'auth/user-disabled': return 'Este usuario ha sido deshabilitado.';
        case 'auth/user-not-found': return 'No se encontró un usuario con ese correo.';
        case 'auth/wrong-password': return 'La contraseña es incorrecta.';
        case 'auth/invalid-credential': return 'Credenciales inválidas.'; // Más genérico
        default: return 'Error al iniciar sesión. Inténtalo de nuevo.';
    }
}

// AÑADIR PARTICIPANTE
function handleAddParticipant(event) {
    event.preventDefault();
    addErrorP.textContent = '';

    const nombre = newParticipantNameInput.value.trim();
    const puntos = parseInt(newParticipantPointsInput.value, 10);

    if (!nombre) {
        addErrorP.textContent = 'El nombre no puede estar vacío.';
        return;
    }
    if (isNaN(puntos)) {
        addErrorP.textContent = 'Los puntos iniciales deben ser un número.';
        return;
    }

    const nuevoParticipante = { nombre: nombre, puntos: puntos };

    personasRef.push(nuevoParticipante)
        .then(() => {
            console.log("Participante añadido:", nombre);
            newParticipantNameInput.value = '';
            newParticipantPointsInput.value = '0';
            addErrorP.textContent = '';
        })
        .catch((error) => {
            console.error("Error al añadir participante:", error);
            addErrorP.textContent = 'Error al guardar en la base de datos.';
        });
}

// ELIMINAR PARTICIPANTE
function removeParticipant(id, nombre) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
        database.ref(`personas/${id}`).remove()
            .then(() => { console.log(`Participante ${nombre} (ID: ${id}) eliminado.`); })
            .catch((error) => {
                console.error(`Error al eliminar participante ${id}:`, error);
                alert(`Error al eliminar a ${nombre}.`);
            });
    }
}

// --- Función para manejar Clics en Botones/Controles (Adaptada a la nueva estructura DOM) ---
function manejarClicControles(event) {
    const target = event.target;
    if (!currentUser) return;

    // Encontrar el LI padre del elemento clickeado, si existe dentro de la lista principal
    const listItem = target.closest('#lista-personas li');
    if (!listItem) return;

    // Encontrar el botón específico que fue clickeado dentro del LI
    const button = target.closest('button');
    if (!button) return; // No se hizo clic en un botón

    // --- Manejo de ELIMINAR (botón con clase específica) ---
    if (button.classList.contains('remove-participant-btn')) {
        const id = button.dataset.id;
        const nombre = button.dataset.name;
        if (id && nombre) {
            removeParticipant(id, nombre);
        }
        return; // Terminar aquí para eliminar
    }

    // --- Manejo de PUNTOS (botones dentro del div .controls) ---
    const controlsContainer = button.closest('.controls');
    if (controlsContainer) {
        const id = button.dataset.id;
        if (!id || !personas[id]) return;

        let puntosActuales = personas[id].puntos;
        let nuevosPuntos;
        let cantidadModificar = 0;

        if (button.classList.contains('increment')) {
            cantidadModificar = 1;
        } else if (button.classList.contains('decrement')) {
            cantidadModificar = -1;
        } else if (button.classList.contains('update-points')) {
            const inputElement = controlsContainer.querySelector('.points-input');
            if (inputElement) {
                cantidadModificar = parseInt(inputElement.value, 10) || 0;
                inputElement.value = '';
            }
        } else {
            return;
        }

        if (cantidadModificar !== 0) {
            nuevosPuntos = puntosActuales + cantidadModificar;
            const puntosPersonaRef = database.ref(`personas/${id}/puntos`);
            puntosPersonaRef.set(nuevosPuntos)
                .then(() => { console.log(`Puntos actualizados para ${id} a ${nuevosPuntos}.`); })
                .catch((error) => {
                    console.error(`Error al actualizar puntos para ${id}:`, error);
                    alert(`Error al actualizar puntos para ${personas[id]?.nombre || id}.`);
                });
        }
    }
}


// --- Función para Actualizar la UI basada en el estado de Auth (Sin cambios) ---
function updateUIBasedOnAuth() {
    if (currentUser) {
        // LOGUEADO
        loginForm.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');
        userEmailSpan.textContent = currentUser.email;
        loginPromptDiv.classList.add('hidden');
        addParticipantSection.classList.remove('hidden');
        renderListaCompleta();
        renderTop5();
    } else {
        // NO LOGUEADO
        loginForm.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        userEmailSpan.textContent = '';
        loginPromptDiv.classList.remove('hidden');
        addParticipantSection.classList.add('hidden');
        loginErrorP.textContent = '';
        addErrorP.textContent = '';
        renderListaCompleta();
        renderTop5();
    }
}


// --- Listener Principal de Firebase (Datos y Auth - Sin cambios) ---
personasRef.on('value', (snapshot) => {
    console.log("Datos DB actualizados!");
    personas = snapshot.exists() ? snapshot.val() : {};
    renderListaCompleta();
    renderTop5();
}, (error) => {
    console.error("Error al leer datos de Firebase:", error);
    listaPersonasUL.innerHTML = '<li>Error al cargar datos.</li>';
    top5ListUL.innerHTML = '<li>Error</li>';
});

auth.onAuthStateChanged((user) => {
    console.log("Estado Auth cambiado:", user ? user.email : 'No logueado');
    currentUser = user;
    updateUIBasedOnAuth();
});


// --- Añadir Event Listeners Iniciales (Sin cambios) ---
loginButton.addEventListener('click', handleLogin);
logoutButton.addEventListener('click', handleLogout);
addParticipantForm.addEventListener('submit', handleAddParticipant);
listaPersonasUL.addEventListener('click', manejarClicControles); // Un solo listener para todos los botones

console.log("App DATOS | LA MESA inicializada.");
