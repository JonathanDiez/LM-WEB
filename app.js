// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, set, onValue, push, get, child, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// ===== 1) Configuración Firebase =====
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===== Admin UIDs (manualmente) =====
const adminUIDs = [
  "lnlHZ4p803dvfcOtkFs5VrVDFxK2",
  "nosRJNV7dhOA12cHnYWYjwvKJbB2",
  "q21ijVQNOvdqhdKoRldMK6JgxPf2"
];

// ===== DOM =====
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-button");
const loginError = document.getElementById("login-error");

const loginCodeForm = document.getElementById("login-code-form");
const loginCodeBtn = document.getElementById("login-code-button");
const loginCodeInput = document.getElementById("user-code");
const loginCodeError = document.getElementById("login-code-error");

const logoutBtn = document.getElementById("logout-button");
const userInfo = document.getElementById("user-info");
const userEmailSpan = document.getElementById("user-email");

const loginPrompt = document.getElementById("login-prompt");
const addSection = document.getElementById("add-participant-section");
const addForm = document.getElementById("add-participant-form");
const listaPersonas = document.getElementById("lista-personas");
const top5Lista = document.getElementById("top-5-lista");

const tiendaSection = document.getElementById("tienda-section");
const tiendaItems = document.getElementById("tienda-items");
const miPuntosValor = document.getElementById("mi-puntos-valor");
const misCanjes = document.getElementById("mis-canjes");

// ===== Tienda =====
const tiendaData = [
  { id: "item1", nombre: "100.000 $ In-Game", costo: 10 },
  { id: "item2", nombre: "20% Descuento Tienda", costo: 25 }
];

function renderTienda() {
  tiendaItems.innerHTML = "";
  tiendaData.forEach(item => {
    const div = document.createElement("div");
    div.className = "tienda-item";
    div.innerHTML = `
      <h4>${item.nombre}</h4>
      <p>${item.costo} puntos</p>
      <button data-id="${item.id}">Canjear</button>
    `;
    tiendaItems.appendChild(div);
  });
}
renderTienda();

// ===== Auth =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userInfo.classList.remove("hidden");
    loginForm.classList.add("hidden");
    loginCodeForm.classList.add("hidden");
    loginPrompt.classList.add("hidden");
    userEmailSpan.textContent = user.email || "Usuario";

    const isAdmin = adminUIDs.includes(user.uid);
    if (isAdmin) addSection.classList.remove("hidden");
    else addSection.classList.add("hidden");

    tiendaSection.classList.remove("hidden");

    loadData(user.uid, isAdmin);
  } else {
    userInfo.classList.add("hidden");
    loginForm.classList.remove("hidden");
    loginCodeForm.classList.remove("hidden");
    loginPrompt.classList.remove("hidden");
    addSection.classList.add("hidden");
    tiendaSection.classList.add("hidden");
    listaPersonas.innerHTML = "<li>Cargando miembros...</li>";
  }
});

// ===== Login Admin =====
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginError.textContent = "";
  } catch (err) {
    loginError.textContent = "Error: " + err.message;
  }
});

// ===== Login Usuario con Código =====
loginCodeBtn.addEventListener("click", async () => {
  const code = loginCodeInput.value.trim();
  if (!code) return loginCodeError.textContent = "Introduce un código válido.";

  const dbRef = ref(db, "personas");
  const snapshot = await get(dbRef);
  const data = snapshot.val() || {};
  const foundKey = Object.keys(data).find(k => data[k].codigo === code);

  if (!foundKey) {
    loginCodeError.textContent = "Código no válido.";
    return;
  }

  // Loguear como usuario "temporal"
  const userObj = data[foundKey];
  userObj.uid = foundKey; // usamos el key como uid temporal
  window.currentUser = userObj; // persistencia simple
  userEmailSpan.textContent = userObj.nombre + " (Usuario)";
  loginCodeForm.classList.add("hidden");
  loginForm.classList.add("hidden");
  userInfo.classList.remove("hidden");
  loginPrompt.classList.add("hidden");
  tiendaSection.classList.remove("hidden");

  loadData(foundKey, false);
});

// ===== Logout =====
logoutBtn.addEventListener("click", () => {
  if (auth.currentUser) signOut(auth);
  else window.location.reload();
});

// ===== Cargar Datos =====
async function loadData(uid, isAdmin) {
  const personasRef = ref(db, "personas");
  onValue(personasRef, (snapshot) => {
    const data = snapshot.val() || {};
    const arr = Object.entries(data).map(([id, obj]) => ({ id, ...obj }));

    // Lista completa
    listaPersonas.innerHTML = "";
    arr.forEach(p => {
      const li = document.createElement("li");

      // Info básica
      li.innerHTML = `
        <div class="participant-info">
          <span class="participant-name">${p.nombre}</span>
          <span class="participant-points">${p.puntos || 0} pts</span>
        </div>
      `;

      if (isAdmin) {
        const controls = document.createElement("div");
        controls.className = "controls";

        // Botones + / - puntos
        const incBtn = document.createElement("button");
        incBtn.textContent = "+";
        incBtn.className = "increment";
        incBtn.onclick = async () => {
          const newPts = (p.puntos || 0) + 1;
          await update(ref(db, "personas/" + p.id), { puntos: newPts });
        };

        const decBtn = document.createElement("button");
        decBtn.textContent = "-";
        decBtn.className = "decrement";
        decBtn.onclick = async () => {
          const newPts = Math.max(0, (p.puntos || 0) - 1);
          await update(ref(db, "personas/" + p.id), { puntos: newPts });
        };

        // Botón eliminar
        const delBtn = document.createElement("button");
        delBtn.textContent = "X";
        delBtn.className = "remove-participant-btn";
        delBtn.onclick = async () => {
          if (confirm(`Eliminar usuario ${p.nombre}?`)) {
            await set(ref(db, "personas/" + p.id), null);
          }
        };

        controls.appendChild(incBtn);
        controls.appendChild(decBtn);
        li.appendChild(controls);
        li.appendChild(delBtn);
      }

      listaPersonas.appendChild(li);
    });

    // Top 5
    const top5 = arr.sort((a,b)=> (b.puntos||0)-(a.puntos||0)).slice(0,5);
    top5Lista.innerHTML = top5.map(p => `<li>${p.nombre} (${p.puntos || 0})</li>`).join("");

    // Puntos del usuario
    if (!auth.currentUser) { // login con código
      const userObj = window.currentUser;
      if (userObj) miPuntosValor.textContent = userObj.puntos || 0;
    } else {
      const currentUserId = auth.currentUser.uid;
      const u = arr.find(x => x.uid === currentUserId);
      if (u) miPuntosValor.textContent = u.puntos || 0;
    }
  });
}

// ===== Añadir participante =====
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("new-participant-name").value.trim();
  const puntos = parseInt(document.getElementById("new-participant-points").value) || 0;
  if (!nombre) return;

  // Generar código único
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newRef = push(ref(db, "personas"));
  await set(newRef, { nombre, puntos, codigo });

  addForm.reset();
});

// ===== Canje tienda =====
tiendaItems.addEventListener("click", async (e) => {
  if (e.target.tagName !== "BUTTON") return;
  const itemId = e.target.dataset.id;
  const item = tiendaData.find(i=>i.id===itemId);
  if (!item) return;

  const userObj = auth.currentUser ? (await get(ref(db,"personas/"+auth.currentUser.uid))).val() : window.currentUser;
  if ((userObj.puntos||0) < item.costo) return alert("No tienes puntos suficientes");

  // Confirmación con estilo
  if (!confirm(`¿Seguro que deseas canjear "${item.nombre}" por ${item.costo} puntos?`)) return;

  // Restar puntos
  const newPts = (userObj.puntos||0) - item.costo;
  if (auth.currentUser) await update(ref(db, "personas/"+auth.currentUser.uid), { puntos: newPts });
  else await update(ref(db, "personas/"+window.currentUser.uid), { puntos: newPts });

  // Mostrar canje
  const li = document.createElement("li");
  li.textContent = `${item.nombre} (${item.costo} pts)`;
  if (misCanjes.children[0] && misCanjes.children[0].textContent==="No hay canjes") misCanjes.innerHTML="";
  misCanjes.appendChild(li);

  miPuntosValor.textContent = newPts;
});
