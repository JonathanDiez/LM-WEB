/* script.js v7 - integra tu firebaseConfig y funciones de tienda/canje */
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
const claimsRef = database.ref('claims');

// --- DOM ---
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
const addErrorP = document.getElementById('add-error');

const tiendaSection = document.getElementById('tienda-section');
const tiendaItemsDiv = document.getElementById('tienda-items');
const miPuntosValor = document.getElementById('mi-puntos-valor');
const misCanjesUL = document.getElementById('mis-canjes');

const listaPersonasContainer = document.getElementById('lista-personas');

let personas = {};
let currentUser = null;
let userPersonId = null; // si quieres mapear email->persona ID, o usa auth.uid

/* --- CONFIG TIENDA: items (puedes ampliar) --- */
const TIENDA_ITEMS = [
  { id: 'cash-100k', name: '100.000 $ (cash interno)', cost: 10, description: 'Canjea 10 puntos por 100.000 $ en el sistema interno.' },
  { id: 'tienda-15pct', name: '15% Descuento tienda', cost: 20, description: '15% de descuento en tienda interna.' }
];

/* --- RENDER LISTAS (tu código adaptado) --- */
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

        // Mantengo controles anteriores si el usuario es admin (currentUser)
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
            btnRestar.textContent = '−';
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

/* --- AUTH (tu código adaptado) --- */
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
        default: return 'Error al iniciar sesión. Inténtalo de nuevo.';
    }
}

/* --- Añadir participante --- */
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

/* --- Eliminar participante --- */
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

/* --- Manejo clics (edición puntos) --- */
function manejarClicControles(event) {
    const target = event.target;
    if (!currentUser) return;

    const listItem = target.closest('#lista-personas li');
    if (!listItem) return;

    const button = target.closest('button');
    if (!button) return;

    if (button.classList.contains('remove-participant-btn')) {
        const id = button.dataset.id;
        const nombre = button.dataset.name;
        if (id && nombre) {
            removeParticipant(id, nombre);
        }
        return;
    }

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

/* --- ACTUALIZACIÓN UI según Auth --- */
function updateUIBasedOnAuth() {
    if (currentUser) {
        loginForm.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');
        userEmailSpan.textContent = currentUser.email;
        loginPromptDiv.classList.add('hidden');
        addParticipantSection.classList.remove('hidden');
        tiendaSection.classList.remove('hidden');
        renderListaCompleta();
        renderTop5();
        setupTiendaUI();
        subscribeToMyClaims(); // escucha de mis claims
    } else {
        loginForm.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        userEmailSpan.textContent = '';
        loginPromptDiv.classList.remove('hidden');
        addParticipantSection.classList.add('hidden');
        tiendaSection.classList.add('hidden');
        loginErrorP.textContent = '';
        addErrorP.textContent = '';
        renderListaCompleta();
        renderTop5();
        clearTiendaUI();
    }
}

/* --- Firebase listeners --- */
personasRef.on('value', (snapshot) => {
    personas = snapshot.exists() ? snapshot.val() : {};
    renderListaCompleta();
    renderTop5();
    // actualizar puntos del usuario si hay persona vinculada por email o similar
    updateMiPuntos();
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

/* --- TIENDA: renderizar items, botones --- */
function setupTiendaUI() {
  tiendaItemsDiv.innerHTML = '';
  TIENDA_ITEMS.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('tienda-item');
    div.innerHTML = `
      <h4>${item.name}</h4>
      <p class="desc">${item.description}</p>
      <div>Coste: <span class="cost">${item.cost} pts</span></div>
      <button data-item-id="${item.id}">Canjear</button>
    `;
    const btn = div.querySelector('button');
    btn.addEventListener('click', () => {
      intentarCanjear(item);
    });
    tiendaItemsDiv.appendChild(div);
  });
  updateMiPuntos();
}

function clearTiendaUI(){
  tiendaItemsDiv.innerHTML = '';
  miPuntosValor.textContent = '0';
  misCanjesUL.innerHTML = '<li>No hay canjes</li>';
}

/* --- Obtener puntos "mi jugador" desde personas.
   Aquí hay dos posibilidades: si tu mapping usuario-auth -> persona está por email, lo buscamos por email.
   Si usas uid como key en personas, ajusta esto. */
function findPersonaIdByEmail(email) {
  if (!personas) return null;
  for (const [id, p] of Object.entries(personas)) {
    if (p.email && p.email === email) return id; // si guardas email en persona
    if (p.nombre && email && p.nombre.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
      // heurística: nombre contiene parte del email - opcional
      // NO es segura, mejor guardar el uid/email en personas al crear participante.
    }
  }
  return null;
}

function updateMiPuntos() {
  if (!currentUser) { miPuntosValor.textContent = '0'; return; }
  // Intento encontrar persona por email (recomiendo guardar email o uid en persona)
  const pid = findPersonaIdByEmail(currentUser.email);
  if (pid && personas[pid]) {
    miPuntosValor.textContent = personas[pid].puntos;
    userPersonId = pid;
  } else {
    // si no encuentras, intentamos buscar por uid
    if (personas[currentUser.uid]) {
      miPuntosValor.textContent = personas[currentUser.uid].puntos;
      userPersonId = currentUser.uid;
    } else {
      miPuntosValor.textContent = '0';
      userPersonId = null;
    }
  }

  // actualizar botones (activar/desactivar)
  document.querySelectorAll('.tienda-item').forEach(div => {
    const btn = div.querySelector('button');
    const cost = parseInt(div.querySelector('.cost').textContent) || 0;
    const puntos = parseInt(miPuntosValor.textContent) || 0;
    btn.disabled = puntos < cost;
  });
}

/* --- CREAR CLAIM (cuando usuario canjea desde frontend) --- */
function intentarCanjear(item) {
  if (!currentUser) { alert('Debes iniciar sesión para canjear'); return; }
  // obtener persona id y puntos actuales
  const pid = userPersonId;
  // Si no hay mapeo persona -> uid/email, pedimos confirmación y procedemos de todos modos:
  if (!pid) {
    if (!confirm('No hemos podido asociar automáticamente tu cuenta a un participante en la lista. ¿Quieres continuar y usar tu UID de autenticación?')) {
      return;
    }
  }

  // Crear claim
  const newClaimRef = claimsRef.push();
  const claimObj = {
    userId: pid || currentUser.uid,
    userUid: currentUser.uid,
    userName: currentUser.email || currentUser.displayName || 'Usuario',
    rewardId: item.id,
    rewardName: item.name,
    cost: item.cost,
    status: 'pending',
    ts: Date.now()
  };

  newClaimRef.set(claimObj)
    .then(() => {
      alert('Canje solicitado. En breve se procesará. Revisa "Mis canjes" para su estado.');
    })
    .catch(err => {
      console.error('Error creando claim:', err);
      alert('Error al enviar la solicitud de canje.');
    });
}

/* --- ESCUCHAR MIS CANJES: claims donde userUid == currentUser.uid --- */
let myClaimsListener = null;
function subscribeToMyClaims() {
  if (!currentUser) return;
  if (myClaimsListener) myClaimsListener.off(); // limpiar si había
  myClaimsListener = database.ref('claims').orderByChild('userUid').equalTo(currentUser.uid);
  myClaimsListener.on('value', snapshot => {
    const data = snapshot.exists() ? snapshot.val() : {};
    renderMyClaims(data);
  });
}

function renderMyClaims(data) {
  misCanjesUL.innerHTML = '';
  const entries = Object.entries(data || {});
  if (entries.length === 0) {
    misCanjesUL.innerHTML = '<li>No hay canjes</li>';
    return;
  }
  // ordenar por fecha descendente
  entries.sort((a,b) => (b[1].ts || 0) - (a[1].ts || 0));
  for (const [id, c] of entries) {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${c.rewardName}</strong> <div style="font-size:0.9em;color:var(--text-color-secondary)">${new Date(c.ts).toLocaleString()}</div>`;
    const right = document.createElement('div');
    const statusSpan = document.createElement('span');
    statusSpan.classList.add('claim-status');
    statusSpan.textContent = (c.status || 'pending').toUpperCase();
    if (c.status === 'processed') statusSpan.style.color = 'var(--success-color)';
    else if (c.status === 'failed') statusSpan.style.color = 'var(--danger-color)';
    else statusSpan.style.color = 'var(--warning-color)';
    right.appendChild(statusSpan);

    // Si está processed, mostramos old/new
    if (c.status === 'processed') {
      const sub = document.createElement('div');
      sub.style.fontSize = '0.9em';
      sub.style.color = 'var(--text-color-secondary)';
      sub.textContent = `Puntos: ${c.oldPoints} → ${c.newPoints}`;
      right.appendChild(sub);
    } else if (c.status === 'failed') {
      const sub = document.createElement('div');
      sub.style.fontSize = '0.9em';
      sub.style.color = 'var(--text-color-secondary)';
      sub.textContent = `Razón: ${c.reason || 'fondo insuficiente'}`;
      right.appendChild(sub);
    }

    li.appendChild(left);
    li.appendChild(right);
    misCanjesUL.appendChild(li);
  }
}

/* --- LIMPIEZA al logout --- */
function cleanupAfterLogout() {
  if (myClaimsListener) {
    myClaimsListener.off();
    myClaimsListener = null;
  }
}

/* --- Event Listeners --- */
loginButton.addEventListener('click', handleLogin);
logoutButton.addEventListener('click', handleLogout);
addParticipantForm.addEventListener('submit', handleAddParticipant);
listaPersonasUL.addEventListener('click', manejarClicControles);

// impresión inicial
console.log("App DATOS | LA MESA inicializada.");
