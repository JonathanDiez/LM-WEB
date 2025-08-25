import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  get,
  update,
  query,
  orderByChild,
  equalTo,
  remove
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

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

const adminUIDs = ["lnlHZ4p803dvfcOtkFs5VrVDFxK2","nosRJNV7dhOA12cHnYWYjwvKJbB2","q21ijVQNOvdqhdKoRldMK6JgxPf2"];

let currentUserData = null;
let currentAuthUid = null;
let isCurrentAdmin = false;
let discordWebhookUrl = null;

const ADMIN_REMEMBER_KEY = 'lm_admin_remember';

const tiendaData = [
  { id: "item1", nombre: "💰 100.000 $", costo: 10 },
  { id: "item2", nombre: "🏷️ 20%- en Tienda Interna", costo: 25 }
];

function generateCode(){ return Math.random().toString(36).substring(2,8).toUpperCase(); }

async function loadWebhookConfig(){
  try{
    const snap = await get(ref(db,"config/webhooks/discord/url"));
    if(snap.exists()){ discordWebhookUrl = snap.val(); console.log("Webhook URL cargada"); }
  }catch(err){ console.warn("No se pudo leer webhook:", err); }
}

function renderTienda(){
  const tiendaItems=document.getElementById("tienda-items");
  tiendaItems.innerHTML="";
  tiendaData.forEach(item=>{
    const div=document.createElement("div");
    div.className="tienda-item";
    div.innerHTML=`<h4>${item.nombre}</h4><p>💎 ${item.costo} puntos</p><button class="primary" data-item="${item.id}">🛒 Canjear</button>`;
    tiendaItems.appendChild(div);
  });
  tiendaItems.querySelectorAll('button[data-item]').forEach(b=>b.addEventListener('click',e=>handleCanje_request_andNotify(e.currentTarget.dataset.item)));
}

async function handleCanje_request_andNotify(itemId){
  if(!currentUserData || !currentAuthUid){ alert("Error: datos de usuario no disponibles."); return; }
  const item = tiendaData.find(i=>i.id===itemId);
  if(!item){ alert("Producto no encontrado"); return; }
  const puntosActuales = currentUserData.puntos||0;
  if(puntosActuales < item.costo){ alert(`No tienes suficientes puntos. Necesitas ${item.costo} y tienes ${puntosActuales}.`); return; }
  if(!confirm(`¿Solicitar canje de "${item.nombre}" por ${item.costo} puntos? (Pendiente de aprobación)`)) return;

  let canjeId = null;
  try{
    const canjeRef = push(ref(db,"canjes"));
    const canjeData = {
      usuarioId: currentAuthUid,
      personaId: currentUserData.id,
      usuarioNombre: currentUserData.nombre,
      itemId: item.id,
      itemNombre: item.nombre,
      costo: item.costo,
      puntosAntes: puntosActuales,
      puntosDespues: puntosActuales - item.costo,
      timestamp: Date.now(),
      fecha: new Date().toISOString(),
      status: "pending",
      notified: false
    };
    await set(canjeRef, canjeData);
    canjeId = canjeRef.key;
  }catch(err){
    console.error("Error creando solicitud de canje (no se creó):", err);
    alert("Error al crear la solicitud de canje. Intenta de nuevo.");
    return;
  }

  try{
    let webhookUrl = discordWebhookUrl || null;
    if(!webhookUrl){
      try{
        const snap = await get(ref(db,"config/webhooks/discord/url"));
        if(snap.exists()) webhookUrl = snap.val();
      }catch(e){ console.warn("No se pudo leer webhook desde DB:", e); }
    }

    if(webhookUrl){
      const mensaje = `🛎️ **NUEVA SOLICITUD DE CANJE**\n👤 **${currentUserData.nombre}**\n🎁 **${item.nombre}**\n💰 **Costo:** ${item.costo} pts\n🆔 **ID:** ${canjeId}\n📅 ${new Date().toLocaleString('es-ES')}\n\nRevisa el panel de administración para aprobar/rechazar.`;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: mensaje })
      });
      if(!res.ok){
        const text = await res.text().catch(()=>"");
        console.warn("Webhook returned non-ok:", res.status, text);
        try { await update(ref(db, `canjes/${canjeId}`), { notified: false, notifyError: `http_${res.status}` }); } catch(e){ console.warn("No se pudo escribir notifyError (reglas):", e); }
      }else{
        try { await update(ref(db, `canjes/${canjeId}`), { notified: true, notifiedAt: Date.now() }); } catch(e){ console.warn("No se pudo marcar notificado (reglas). OK:", e); }
      }
    }else{
      try { await update(ref(db, `canjes/${canjeId}`), { notified: false, notifyError: "no_webhook_configured" }); } catch(e){ console.warn("No se pudo escribir notifyError (reglas):", e); }
    }
  }catch(err){
    console.warn("Error durante intento de notificación (no crítico):", err);
  }

  alert("Solicitud enviada correctamente. Un administrador la revisará.");
}

function loadData(uid,isAdminFlag){
  const personasRef = ref(db,"personas");
  onValue(personasRef,snapshot=>{
    const data = snapshot.val()||{};
    const arr = Object.entries(data).map(([id,obj])=>({id,...obj}));
    const listaPersonas=document.getElementById("lista-personas");
    listaPersonas.innerHTML="";
    arr.forEach(p=>{
      const li=document.createElement("li");
      const infoDiv=document.createElement("div"); infoDiv.className="participant-info";
      const nameSpan=document.createElement("span"); nameSpan.className="participant-name"; nameSpan.textContent=p.nombre;
      const pointsSpan=document.createElement("span"); pointsSpan.className="participant-points"; pointsSpan.textContent=`💎 ${p.puntos||0} puntos`;
      infoDiv.appendChild(nameSpan); infoDiv.appendChild(pointsSpan);
      li.appendChild(infoDiv);

      if(isAdminFlag){
        const controlsDiv=document.createElement("div"); controlsDiv.className="controls";
        const pointsInput=document.createElement("input"); pointsInput.type="number"; pointsInput.value="1"; pointsInput.min="1"; pointsInput.style.width="70px";
        const addBtn=document.createElement("button"); addBtn.textContent="+"; addBtn.classList.add('increment');
        addBtn.addEventListener('click', ()=> updateUserPoints(p.id,(p.puntos||0)+parseInt(pointsInput.value||1)));
        const subBtn=document.createElement("button"); subBtn.textContent="−"; subBtn.classList.add('decrement');
        subBtn.addEventListener('click', ()=> updateUserPoints(p.id,Math.max(0,(p.puntos||0)-parseInt(pointsInput.value||1))));
        const removeBtn=document.createElement("button"); removeBtn.innerHTML="🗑"; removeBtn.classList.add('remove-participant-btn');
        removeBtn.title = "Eliminar participante";
        removeBtn.addEventListener('click', ()=> removeParticipant(p.id, p.nombre));
        controlsDiv.appendChild(pointsInput); controlsDiv.appendChild(addBtn); controlsDiv.appendChild(subBtn); controlsDiv.appendChild(removeBtn);
        li.appendChild(controlsDiv);
      }

      listaPersonas.appendChild(li);
    });

    const top5Lista=document.getElementById("top-5-lista");
    top5Lista.innerHTML="";
    arr.sort((a,b)=> (b.puntos||0)-(a.puntos||0)).slice(0,5).forEach(p=>{
      const li=document.createElement("li"); li.textContent=`${p.nombre} - ${p.puntos||0} pts`; top5Lista.appendChild(li);
    });

    if(currentUserData && currentUserData.id){
      const personaActual = arr.find(x=>x.id === currentUserData.id);
      if(personaActual){
        currentUserData = personaActual;
        const miP = document.getElementById("mi-puntos-valor"); if(miP) miP.textContent = personaActual.puntos || 0;
      }
    }
  });
}

async function removeParticipant(personaId, nombre){
  if(!isCurrentAdmin) return;
  if(!confirm(`¿Eliminar a "${nombre}"? Esta acción es irreversible.`)) return;
  try{
    await remove(ref(db, `personas/${personaId}`));
    alert("Participante eliminado.");
  }catch(err){
    console.error("Error eliminando participante:", err);
    alert("Error al eliminar participante.");
  }
}

async function updateUserPoints(userId,newPoints){
  if(!isCurrentAdmin) return;
  try{ await update(ref(db,`personas/${userId}`),{puntos:newPoints}); }
  catch(err){ console.error("Error actualizando puntos:",err); alert("Error al actualizar puntos"); }
}

function subscribeUserCanjes(){
  if(!currentAuthUid) return;
  const q = query(ref(db,"canjes"), orderByChild("usuarioId"), equalTo(currentAuthUid));
  onValue(q, snapshot=>{
    const data = snapshot.val() || {};
    const arr = Object.entries(data).map(([id,obj])=>({ id, ...obj })).sort((a,b)=>b.timestamp - a.timestamp);
    const listEl = document.getElementById("mis-solicitudes-list");
    if(!listEl) return;
    listEl.innerHTML = "";
    if(arr.length === 0){ listEl.innerHTML = "<li>No tienes solicitudes</li>"; return; }
    arr.forEach(c=>{
      const li = document.createElement("li");
      const statusLabel = c.status === "pending" ? "Pendiente" : (c.status === "completed" ? "Aprobado" : "Rechazado");
      const extra = c.notifyError ? ` — (error webhook)` : (c.notified ? " — (notificado)" : "");
      li.innerHTML = `<strong>${c.itemNombre}</strong> — ${c.costo} pts<br><small>${new Date(c.timestamp).toLocaleString()} — Estado: ${statusLabel}${extra}</small>`;
      listEl.appendChild(li);
    });
  });
}

function subscribeAllPendingCanjes(){
  const canjesRef = ref(db, "canjes");
  onValue(canjesRef, snapshot=>{
    const data = snapshot.val() || {};
    const arr = Object.entries(data).map(([id,obj])=>({ id, ...obj }));
    const pending = arr.filter(c => c.status === "pending").sort((a,b)=>b.timestamp - a.timestamp);
    const listEl = document.getElementById("pending-canje-list");
    if(!listEl) return;
    listEl.innerHTML = "";
    if(pending.length === 0){ listEl.innerHTML = "<li>No hay solicitudes pendientes</li>"; return; }
    pending.forEach(c=>{
      const li = document.createElement("li");
      li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center"; li.style.gap = "12px";
      const left = document.createElement("div");
      left.innerHTML = `<strong>${c.usuarioNombre}</strong><div style="color:var(--muted)">${c.itemNombre} — ${c.costo} pts<br><small>Solicitado: ${new Date(c.timestamp).toLocaleString()}</small></div>`;
      const controls = document.createElement("div");
      const approveBtn = document.createElement("button"); approveBtn.textContent = "Aprobar"; approveBtn.className = "primary";
      const rejectBtn = document.createElement("button"); rejectBtn.textContent = "Rechazar"; rejectBtn.className = "ghost";
      approveBtn.addEventListener('click', ()=> adminApproveCanje(c.id));
      rejectBtn.addEventListener('click', ()=> adminRejectCanje(c.id));
      controls.appendChild(approveBtn); controls.appendChild(rejectBtn);
      li.appendChild(left); li.appendChild(controls);
      listEl.appendChild(li);
    });
  });
}

async function adminApproveCanje(canjeId){
  if(!isCurrentAdmin){ alert("Solo administradores pueden aprobar."); return; }
  try{
    const canjeSnap = await get(ref(db, `canjes/${canjeId}`));
    if(!canjeSnap.exists()){ alert("Solicitud no encontrada"); return; }
    const canje = canjeSnap.val();
    if(canje.status !== "pending"){ alert("Solicitud ya procesada"); return; }

    const personaSnap = await get(ref(db, `personas/${canje.personaId}`));
    if(!personaSnap.exists()){
      await update(ref(db, `canjes/${canjeId}`), { status: "rejected", rejectReason: "persona_not_found" });
      alert("Persona no encontrada"); return;
    }
    const persona = personaSnap.val();
    const puntosActuales = Number(persona.puntos || 0);
    const costo = Number(canje.costo || 0);
    if(puntosActuales < costo){
      await update(ref(db, `canjes/${canjeId}`), { status: "rejected", rejectReason: "insufficient_points", dbPuntos: puntosActuales });
      alert("No hay puntos suficientes en la cuenta del usuario."); return;
    }

    const nuevosPuntos = puntosActuales - costo;
    const updates = {};
    updates[`personas/${canje.personaId}/puntos`] = nuevosPuntos;
    updates[`canjes/${canjeId}/status`] = "completed";
    updates[`canjes/${canjeId}/aprobadoPor`] = currentAuthUid || (auth.currentUser && auth.currentUser.uid);
    updates[`canjes/${canjeId}/aprobadoEn`] = Date.now();
    updates[`canjes/${canjeId}/puntosDespuesReal`] = nuevosPuntos;
    await update(ref(db), updates);

    try{
      const snap = await get(ref(db,"config/webhooks/discord/url"));
      if(snap.exists()){
        const webhookUrl = snap.val();
        const mensaje = `✅ CANJE APROBADO\nUsuario: ${canje.usuarioNombre}\nProducto: ${canje.itemNombre}\nCosto: ${costo} pts\nAntes: ${puntosActuales}\nAhora: ${nuevosPuntos}\nFecha: ${new Date().toLocaleString('es-ES')}`;
        await fetch(webhookUrl, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ content: mensaje }) });
      }
    }catch(err){ console.warn("No se pudo enviar webhook de aprobación:", err); }

    alert("Canje aprobado y puntos actualizados.");
  }catch(err){
    console.error("Error aprobando canje:", err);
    alert("Error al aprobar el canje.");
  }
}

async function adminRejectCanje(canjeId){
  if(!isCurrentAdmin){ alert("Solo administradores pueden rechazar."); return; }
  const reason = prompt("Motivo del rechazo (opcional):", "No aprobado");
  try{
    await update(ref(db, `canjes/${canjeId}`), { status: "rejected", rejectReason: reason || "rechazado_por_admin", rechazadoPor: currentAuthUid || (auth.currentUser && auth.currentUser.uid), rechazadoEn: Date.now() });
    alert("Solicitud rechazada.");
  }catch(err){
    console.error("Error rechazando canje:", err);
    alert("Error al rechazar solicitud.");
  }
}

async function tryAutoLoginFromLocalStorage(){
  try{
    const storedCode = localStorage.getItem('lm_user_code');
    const rememberFlag = localStorage.getItem('lm_user_remember');
    if(storedCode && rememberFlag==='1'){
      if(!auth.currentUser) await signInAnonymously(auth);
      currentAuthUid = auth.currentUser?.uid;
      const snapshot = await get(ref(db,"personas"));
      const data = snapshot.val()||{};
      const foundKey = Object.keys(data).find(k=>data[k].codigo===storedCode);
      if(!foundKey){ localStorage.removeItem('lm_user_code'); localStorage.removeItem('lm_user_remember'); return; }
      currentUserData = { id: foundKey, ...data[foundKey] };
      showAsUser(currentUserData);
      loadData(foundKey,false);
      subscribeUserCanjes();
    }
  }catch(err){ console.error("Auto-login error:",err);}
}

function showAsUser(persona){
  currentUserData = persona;
  document.getElementById("user-email").textContent = persona.nombre || "Usuario";
  document.getElementById("user-role").textContent = "Usuario";
  document.getElementById("user-info").classList.remove("hidden");
  document.getElementById("login-prompt").classList.add("hidden");
  document.getElementById("login-choice")?.classList.add("hidden");
  document.getElementById("login-form")?.classList.add("hidden");
  document.getElementById("login-code-form")?.classList.add("hidden");
  document.getElementById("tienda-section").classList.remove("hidden");
  document.getElementById("mis-solicitudes-card").classList.remove("hidden");
  document.getElementById("mi-puntos-valor").textContent = persona.puntos || 0;
}

function showAsAdmin(email){
  document.getElementById("user-email").textContent = email || "Admin";
  document.getElementById("user-role").textContent = "Administrador";
  document.getElementById("user-info").classList.remove("hidden");
  document.getElementById("login-prompt").classList.add("hidden");
  document.getElementById("add-participant-section").classList.remove("hidden");
  document.getElementById("login-choice")?.classList.add("hidden");
  document.getElementById("login-form")?.classList.add("hidden");
  document.getElementById("login-code-form")?.classList.add("hidden");
  document.getElementById("pending-canje-section").classList.remove("hidden");
}

document.addEventListener('DOMContentLoaded', async ()=>{
  renderTienda();
  await loadWebhookConfig();
  await tryAutoLoginFromLocalStorage();

  const chooseAdminBtn=document.getElementById("choose-admin");
  const chooseUserBtn=document.getElementById("choose-user");
  const backFromAdmin=document.getElementById("back-from-admin");
  const backFromUser=document.getElementById("back-from-user");
  const loginBtn=document.getElementById("login-button");
  const loginCodeBtn=document.getElementById("login-code-button");
  const logoutBtn=document.getElementById("logout-button");
  const addParticipantForm = document.getElementById("add-participant-form");

  chooseAdminBtn?.addEventListener('click', ()=>{document.getElementById("login-choice").classList.add("hidden"); document.getElementById("login-form").classList.remove("hidden");});
  chooseUserBtn?.addEventListener('click', ()=>{document.getElementById("login-choice").classList.add("hidden"); document.getElementById("login-code-form").classList.remove("hidden");});
  backFromAdmin?.addEventListener('click', ()=>{document.getElementById("login-form").classList.add("hidden"); document.getElementById("login-choice").classList.remove("hidden");});
  backFromUser?.addEventListener('click', ()=>{document.getElementById("login-code-form").classList.add("hidden"); document.getElementById("login-choice").classList.remove("hidden");});

  loginBtn?.addEventListener('click', async () => {
    const email=document.getElementById("email").value.trim();
    const password=document.getElementById("password").value;
    const remember = document.getElementById("admin-remember")?.checked;
    if(!email||!password){ alert("Introduce correo y contraseña"); return; }
    try{
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth,email,password);
      if(remember) localStorage.setItem(ADMIN_REMEMBER_KEY,'1');
      else localStorage.removeItem(ADMIN_REMEMBER_KEY);
    }catch(err){
      console.error("Login admin error:",err);
      alert("Error login admin: " + (err.message || err));
    }
  });

  loginCodeBtn?.addEventListener('click', async ()=> {
    try{
      const code=document.getElementById("user-code").value.trim().toUpperCase();
      if(!code){ alert("Introduce un código"); return; }
      if(!auth.currentUser) await signInAnonymously(auth);
      currentAuthUid = auth.currentUser?.uid;
      const snapshot = await get(ref(db,"personas"));
      const data = snapshot.val()||{};
      const foundKey=Object.keys(data).find(k=>data[k].codigo===code);
      if(!foundKey){ alert("Código no válido"); await signOut(auth); return; }
      const persona = { id:foundKey, ...data[foundKey] };
      const remember = document.getElementById("user-remember")?.checked;
      if(remember){ localStorage.setItem('lm_user_code', code); localStorage.setItem('lm_user_remember','1'); }
      else { localStorage.removeItem('lm_user_code'); localStorage.removeItem('lm_user_remember'); }
      showAsUser(persona);
      loadData(foundKey,false);
      subscribeUserCanjes();
    }catch(err){
      console.error("Error login por código:",err);
      alert("Error al iniciar sesión por código.");
    }
  });

  logoutBtn?.addEventListener('click', async ()=>{
    try{
      await signOut(auth);
      currentUserData = null; currentAuthUid = null; isCurrentAdmin = false;
      localStorage.removeItem('lm_user_code'); localStorage.removeItem('lm_user_remember');
      localStorage.removeItem(ADMIN_REMEMBER_KEY);
      document.getElementById("user-info").classList.add("hidden");
      document.getElementById("tienda-section").classList.add("hidden");
      document.getElementById("add-participant-section").classList.add("hidden");
      document.getElementById("pending-canje-section").classList.add("hidden");
      document.getElementById("mis-solicitudes-card").classList.add("hidden");
      document.getElementById("login-choice").classList.remove("hidden");
      document.getElementById("login-prompt").classList.remove("hidden");
    }catch(err){ console.error("Error al cerrar sesión:",err); }
  });

  addParticipantForm?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    if(!isCurrentAdmin){ alert("Solo admins pueden crear participantes"); return; }
    const nombre = document.getElementById("new-participant-name").value.trim();
    const puntos = parseInt(document.getElementById("new-participant-points").value || "0", 10);
    if(!nombre){ document.getElementById("add-error").textContent = "Nombre vacío"; document.getElementById("add-error").classList.add('show'); return; }
    try{
      const newRef = push(ref(db,"personas"));
      const codigo = generateCode();
      await set(newRef, { nombre, puntos: isNaN(puntos)?0:puntos, codigo, fechaCreacion: new Date().toISOString() });
      document.getElementById("new-participant-name").value = "";
      document.getElementById("new-participant-points").value = "0";
      document.getElementById("add-error").classList.remove('show');
      alert("Participante creado: " + nombre + " (código: " + codigo + ")");
    }catch(err){
      console.error("Error creando participante:", err);
      document.getElementById("add-error").textContent = "Error creando participante"; document.getElementById("add-error").classList.add('show');
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if(user){
      currentAuthUid = user.uid;
      if(adminUIDs.includes(user.uid)){
        const adminRemember = localStorage.getItem(ADMIN_REMEMBER_KEY);
        if(adminRemember !== '1'){
          console.log("Admin no marcado como 'recordar' -> cerrando sesión para no persistir.");
          try { await signOut(auth); } catch(e){ console.warn("Error al signOut forzado:", e); }
          return;
        }
        isCurrentAdmin = true;
        await loadWebhookConfig();
        showAsAdmin(user.email || "Admin");
        loadData(null, true);
        subscribeAllPendingCanjes();
      }else{
        isCurrentAdmin = false;
      }
    }else{
      currentAuthUid = null; isCurrentAdmin = false;
    }
  });

});
