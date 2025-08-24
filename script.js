/* script.js - integración completa */

// --- Config Firebase (tu config existente) ---
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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Refs
const personasRef = database.ref('personas');
const claimsRef = database.ref('claims');
const adminsRef = database.ref('admins');
const accessCodesRef = database.ref('accessCodes'); // mapping code -> personaId

// --- DOM ---
const listaPersonasUL = document.getElementById('lista-personas');
const top5ListUL = document.getElementById('top-5-lista');
const loginPromptDiv = document.getElementById('login-prompt');

const addParticipantSection = document.getElementById('add-participant-section');
const addParticipantForm = document.getElementById('add-participant-form');
const newParticipantNameInput = document.getElementById('new-participant-name');
const newParticipantPointsInput = document.getElementById('new-participant-points');
const newParticipantCodeInput = document.getElementById('new-participant-code');
const addErrorP = document.getElementById('add-error');

const codeLoginInput = document.getElementById('access-code-input');
const codeLoginButton = document.getElementById('code-login-button');
const codeLoginError = document.getElementById('code-login-error');

const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');

const tiendaSection = document.getElementById('tienda-section');
const tiendaItemsDiv = document.getElementById('tienda-items');
const miPuntosValor = document.getElementById('mi-puntos-valor');
const misCanjesUL = document.getElementById('mis-canjes');

let personas = {};
let currentUser = null;
let isAdmin = false;
let myPersonaId = null; // personaId asociada a este auth.uid (si existe)

// ----------------- TIENDA ITEMS -----------------
const TIENDA_ITEMS = [
  { id: 'cash-100k', name: '100.000 $ (cash interno)', cost: 10, description: 'Canjea 10 puntos por 100.000 $.' },
  { id: 'tienda-15pct', name: '15% Descuento tienda', cost: 20, description: '15% de descuento en tienda interna.' }
];

// ----------------- WEBHOOK (BASE64) -----------------
// Sustituye TU_WEBHOOK_BASE64_AQUI por tu webhook en base64.
// Para obtener el base64: en la consola del navegador -> btoa('https://discord.com/api/webhooks/ID/TOKEN')
const WEBHOOK_B64 = 'TU_WEBHOOK_BASE64_AQUI'; // <-- pegalo aquí (obligatorio para notificaciones)
const DISCORD_WEBHOOK = (typeof atob === 'function' && WEBHOOK_B64) ? atob(WEBHOOK_B64) : null;

// ----------------- RENDER / UI -----------------
function renderListaCompleta() {
  listaPersonasUL.innerHTML = '';
  if (!personas || Object.keys(personas).length === 0) {
    listaPersonasUL.innerHTML = '<li>No hay participantes registrados.</li>';
    return;
  }
  const personasOrdenadas = Object.entries(personas).sort(([,a],[,b]) => a.nombre.localeCompare(b.nombre));
  for (const [id, p] of personasOrdenadas) {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.classList.add('participant-info');
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('participant-name');
    nameSpan.textContent = p.nombre;
    const pointsSpan = document.createElement('span');
    pointsSpan.classList.add('participant-points');
    pointsSpan.textContent = `Puntos: ${p.puntos || 0}`;
    info.appendChild(nameSpan);
    info.appendChild(pointsSpan);
    li.appendChild(info);

    // admin controls
    if (isAdmin) {
      const adminDiv = document.createElement('div');
      adminDiv.style.display = 'flex';
      adminDiv.style.gap = '8px';
      adminDiv.style.alignItems = 'center';

      const btnRemove = document.createElement('button');
      btnRemove.textContent = '🗑️';
      btnRemove.title = `Eliminar ${p.nombre}`;
      btnRemove.dataset.id = id;
      btnRemove.classList.add('remove-participant-btn');
      adminDiv.appendChild(btnRemove);

      const btnPlus = document.createElement('button');
      btnPlus.textContent = '+';
      btnPlus.dataset.id = id;
      btnPlus.classList.add('increment');
      adminDiv.appendChild(btnPlus);

      const btnMinus = document.createElement('button');
      btnMinus.textContent = '−';
      btnMinus.dataset.id = id;
      btnMinus.classList.add('decrement');
      adminDiv.appendChild(btnMinus);

      // Mostrar code (si existe) solo a admin
      if (p.accessCode) {
        const codeDiv = document.createElement('div');
        codeDiv.classList.add('code-view');
        codeDiv.textContent = `Código: ${p.accessCode}`;
        adminDiv.appendChild(codeDiv);
      }

      li.appendChild(adminDiv);
    }

    listaPersonasUL.appendChild(li);
  }
}

function renderTop5() {
  top5ListUL.innerHTML = '';
  if (!personas || Object.keys(personas).length === 0) {
    top5ListUL.innerHTML = '<li>N/A</li>'; return;
  }
  const top = Object.entries(personas).sort(([,a],[,b]) => b.puntos - a.puntos).slice(0,5);
  top.forEach(([id,p], idx) => {
    const li = document.createElement('li');
    const info = document.createElement('div'); info.classList.add('participant-info');
    const name = document.createElement('span'); name.classList.add('participant-name');
    const medal = idx === 0 ? '🥇 ' : idx ===1 ? '🥈 ' : idx===2 ? '🥉 ' : '';
    name.textContent = `${medal}${p.nombre}`;
    const pts = document.createElement('span'); pts.classList.add('participant-points'); pts.textContent = `Puntos: ${p.puntos || 0}`;
    info.appendChild(name); info.appendChild(pts); li.appendChild(info);
    top5ListUL.appendChild(li);
  });
}

// ----------------- AUTH / LOGIN POR CÓDIGO -----------------
codeLoginButton.addEventListener('click', async () => {
  const code = codeLoginInput.value.trim();
  codeLoginError.textContent = '';
  if (!code) { codeLoginError.textContent = 'Introduce un código.'; return; }

  try {
    // 1) sign in anonymously (genera auth.uid)
    await auth.signInAnonymously();

    // 2) buscar mapping accessCodes/{code}
    const snap = await accessCodesRef.child(code).once('value');
    if (!snap.exists()) {
      // limpiar sesión
      codeLoginError.textContent = 'Código no válido.';
      // opcional: signOut
      // await auth.signOut();
      return;
    }
    const personaId = snap.val();
    // 3) intentar asociar persona.uid = auth.uid si aún no está asociado
    const personaRef = personasRef.child(personaId);
    const personaSnap = await personaRef.once('value');
    const persona = personaSnap.val() || {};

    const uid = auth.currentUser.uid;
    if (!persona.uid) {
      // establecer uid (la regla permite esto solo si uid estaba vacío)
      await personaRef.update({ uid: uid });
    } else {
      // si ya existe y no coincide -> si coincide no pasa nada, si no coincide, se deniega
      if (persona.uid !== uid) {
        codeLoginError.textContent = 'Este código ya está en uso por otra cuenta.';
        await auth.signOut();
        return;
      }
    }

    // guardar mapping userProfiles opcional
    await database.ref(`userProfiles/${uid}`).set({ personaId: personaId, linkedAt: Date.now() });

    // todo ok -> UI se actualizará por onAuthStateChanged
    codeLoginInput.value = '';
  } catch (err) {
    console.error('Error login por código:', err);
    codeLoginError.textContent = 'Error al iniciar sesión. Revisa la consola.';
  }
});

logoutButton.addEventListener('click', async () => {
  await auth.signOut();
  location.reload(); // refrescar para limpiar listeners
});

// ----------------- ADMIN CHECK -----------------
async function checkIfAdmin(uid) {
  if (!uid) return false;
  const snap = await adminsRef.child(uid).once('value');
  return snap.exists() && snap.val() === true;
}

// ----------------- Añadir participante (admin) -----------------
addParticipantForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addErrorP.textContent = '';
  if (!isAdmin) { addErrorP.textContent = 'Solo administradores pueden crear participantes.'; return; }
  const nombre = newParticipantNameInput.value.trim();
  const puntos = parseInt(newParticipantPointsInput.value,10) || 0;
  const code = newParticipantCodeInput.value.trim() || null;

  if (!nombre) { addErrorP.textContent = 'Nombre obligatorio'; return; }

  try {
    const newRef = await personasRef.push({ nombre, puntos, uid: null, email: null, accessCode: code || null });
    const pid = newRef.key;
    // si hay code, creamos mapping accessCodes/{code} = pid
    if (code) {
      await accessCodesRef.child(code).set(pid);
      // también guardamos accessCode dentro del persona (ya lo hicimos en push)
    }
    newParticipantNameInput.value = '';
    newParticipantPointsInput.value = '0';
    newParticipantCodeInput.value = '';
  } catch (err) {
    console.error('Error añadiendo participante:', err);
    addErrorP.textContent = 'Error al guardar participante';
  }
});

// ----------------- LISTENERS DB -----------------
personasRef.on('value', snap => {
  personas = snap.exists() ? snap.val() : {};
  renderListaCompleta();
  renderTop5();
  updateMyPoints();
});

// claims listener for my claims
let myClaimsListener = null;
function subscribeToMyClaims() {
  if (!currentUser) return;
  if (myClaimsListener) myClaimsListener.off();
  myClaimsListener = claimsRef.orderByChild('userUid').equalTo(currentUser.uid);
  myClaimsListener.on('value', s => {
    renderMyClaims(s.exists() ? s.val() : {});
  });
}
function unsubscribeMyClaims() { if (myClaimsListener) { myClaimsListener.off(); myClaimsListener = null; } }

function renderMyClaims(data) {
  misCanjesUL.innerHTML = '';
  const entries = Object.entries(data || {});
  if (entries.length === 0) { misCanjesUL.innerHTML = '<li>No hay canjes</li>'; return; }
  entries.sort((a,b) => (b[1].ts||0) - (a[1].ts||0));
  for (const [id,c] of entries) {
    const li = document.createElement('li');
    const left = document.createElement('div'); left.innerHTML = `<strong>${c.rewardName}</strong><div style="font-size:0.9em;color:var(--text-color-secondary)">${new Date(c.ts).toLocaleString()}</div>`;
    const right = document.createElement('div');
    const status = document.createElement('span'); status.classList.add('claim-status'); status.textContent = (c.status||'pending').toUpperCase();
    if (c.status === 'processed') status.style.color = 'var(--success-color)';
    else if (c.status === 'failed') status.style.color = 'var(--danger-color)';
    else status.style.color = 'var(--warning-color)';
    right.appendChild(status);
    if (c.status === 'processed') {
      const sub = document.createElement('div'); sub.style.fontSize='0.9em'; sub.style.color='var(--text-color-secondary)'; sub.textContent = `Puntos: ${c.oldPoints} → ${c.newPoints}`;
      right.appendChild(sub);
    } else if (c.status === 'failed') {
      const sub = document.createElement('div'); sub.style.fontSize='0.9em'; sub.style.color='var(--text-color-secondary)'; sub.textContent = `Razón: ${c.reason || 'fondo insuficiente'}`;
      right.appendChild(sub);
    }
    li.appendChild(left); li.appendChild(right); misCanjesUL.appendChild(li);
  }
}

// ----------------- AUTH STATE -----------------
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  if (!user) {
    // show code login, hide user info
    document.getElementById('code-login').classList.remove('hidden');
    userInfoDiv.classList.add('hidden');
    addParticipantSection.classList.add('hidden');
    tiendaSection.classList.add('hidden');
    loginPromptDiv.classList.remove('hidden');
    userEmailSpan.textContent = '';
    unsubscribeMyClaims();
    isAdmin = false;
    myPersonaId = null;
    return;
  }

  // user exists (anonymous uid)
  document.getElementById('code-login').classList.add('hidden');
  userInfoDiv.classList.remove('hidden');
  loginPromptDiv.classList.add('hidden');
  userEmailSpan.textContent = `Usuario: ${user.uid}`;
  // check admin
  isAdmin = await checkIfAdmin(user.uid);
  if (isAdmin) {
    addParticipantSection.classList.remove('hidden');
    // admin sees tienda too (optional)
    tiendaSection.classList.remove('hidden');
  } else {
    addParticipantSection.classList.add('hidden');
    tiendaSection.classList.remove('hidden'); // normal users see tienda
  }

  // try to find personaId associated with this uid (userProfiles mapping or personas.uid)
  const upSnap = await database.ref(`userProfiles/${user.uid}`).once('value');
  if (upSnap.exists()) {
    myPersonaId = upSnap.val().personaId;
  } else {
    // fallback: scan personas for uid === user.uid
    const found = Object.entries(personas || {}).find(([id,p]) => p && p.uid === user.uid);
    myPersonaId = found ? found[0] : null;
    if (myPersonaId) await database.ref(`userProfiles/${user.uid}`).set({ personaId: myPersonaId, linkedAt: Date.now() });
  }

  updateMyPoints();
  subscribeToMyClaims();
});

// ----------------- Update my points UI -----------------
function updateMyPoints() {
  if (!currentUser) { miPuntosValor.textContent = '0'; return; }
  if (myPersonaId && personas[myPersonaId]) {
    miPuntosValor.textContent = personas[myPersonaId].puntos || 0;
  } else {
    miPuntosValor.textContent = '0';
  }
  // enable/disable tienda buttons
  document.querySelectorAll('.tienda-item').forEach(div => {
    const btn = div.querySelector('button');
    const cost = parseInt(div.dataset.cost,10) || 0;
    const pts = parseInt(miPuntosValor.textContent,10) || 0;
    btn.disabled = pts < cost;
  });
}

// ----------------- Render tienda -----------------
function setupTiendaUI() {
  tiendaItemsDiv.innerHTML = '';
  TIENDA_ITEMS.forEach(it => {
    const d = document.createElement('div'); d.classList.add('tienda-item');
    d.dataset.id = it.id; d.dataset.cost = it.cost;
    d.innerHTML = `<h4>${it.name}</h4><p class="desc">${it.description}</p><div>Coste: <span class="cost">${it.cost} pts</span></div>`;
    const btn = document.createElement('button'); btn.textContent = 'Canjear'; btn.addEventListener('click', () => intentarCanjear(it));
    d.appendChild(btn);
    tiendaItemsDiv.appendChild(d);
  });
  updateMyPoints();
}
setupTiendaUI();

// ----------------- CANJEAR (transacción cliente) -----------------
async function intentarCanjear(item) {
  if (!currentUser) { alert('Debes iniciar sesión (introduce tu código).'); return; }
  if (!myPersonaId) { alert('No se ha asociado una persona a esta cuenta. Contacta a un admin.'); return; }

  const personaPtsRef = personasRef.child(`${myPersonaId}/puntos`);
  try {
    const result = await personaPtsRef.transaction(current => {
      if (current === null || typeof current !== 'number') return;
      if (current < item.cost) return;
      return current - item.cost;
    }, { applyLocally: false });

    if (!result.committed) { alert('No tienes suficientes puntos para este canje.'); return; }
    const newPoints = result.snapshot.val();
    const oldPoints = newPoints + item.cost;

    // registrar claim procesado
    const claimRef = claimsRef.push();
    const claimObj = {
      userId: myPersonaId,
      userUid: currentUser.uid,
      userName: personas[myPersonaId].nombre || currentUser.uid,
      rewardId: item.id,
      rewardName: item.name,
      cost: item.cost,
      status: 'processed',
      oldPoints,
      newPoints,
      ts: Date.now(),
      processedAt: Date.now()
    };
    await claimRef.set(claimObj);

    // enviar webhook a Discord (desde cliente)
    if (DISCORD_WEBHOOK) {
      const message = `🎉 **Recompensa canjeada**\nUsuario: **${claimObj.userName}**\nRecompensa: **${claimObj.rewardName}**\nCoste: **${claimObj.cost}** puntos\nPuntos: **${oldPoints} → ${newPoints}**\n(ID claim: ${claimRef.key})`;
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ content: message })
        });
      } catch (err) {
        console.error('Error enviando webhook:', err);
        await claimRef.child('discordNotifyError').set(String(err));
      }
    } else {
      console.warn('Webhook no configurado (DISCORD_WEBHOOK null).');
    }

    alert('Canje procesado correctamente.');
    updateMyPoints();
  } catch (err) {
    console.error('Error en canje:', err);
    alert('Error al procesar el canje. Revisa la consola.');
  }
}

// ----------------- Manejo clicks en lista (admin controls + edición pts) -----------------
listaPersonasUL.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn || !isAdmin) return;
  const id = btn.dataset.id;
  if (!id) return;

  if (btn.classList.contains('remove-participant-btn')) {
    if (!confirm('Eliminar participante?')) return;
    await personasRef.child(id).remove();
    // eliminar mappings accessCodes asociados (si existen)
    // buscamos en accessCodes
    const snaps = await accessCodesRef.orderByValue().equalTo(id).once('value');
    snaps.forEach(s => s.ref.remove());
    return;
  }

  if (btn.classList.contains('increment')) {
    const puntosRef = personasRef.child(`${id}/puntos`);
    const pSnap = await puntosRef.once('value'); const curr = pSnap.val() || 0;
    await puntosRef.set(curr + 1);
    return;
  }
  if (btn.classList.contains('decrement')) {
    const puntosRef = personasRef.child(`${id}/puntos`);
    const pSnap = await puntosRef.once('value'); const curr = pSnap.val() || 0;
    await puntosRef.set(Math.max(0, curr - 1));
    return;
  }
});

// ----------------- Boot / init -----------------
personasRef.on('value', snap => { personas = snap.exists()? snap.val() : {}; renderListaCompleta(); renderTop5(); updateMyPoints(); });

// export function to console for convenience (debug)
window.appDebug = { personasRef, claimsRef, accessCodesRef };

// ----------------- fin script.js -----------------
console.log('Script DATOS | LA MESA cargado.');
