// --- CONFIG: pega aquí tu webhook (base64 para ocultar mínimamente) ---
/* 
   En la consola del navegador: btoa('https://discord.com/api/webhooks/ID/TOKEN')
   y pega el string resultante entre comillas.
*/
const WEBHOOK_B64 = 'TU_WEBHOOK_EN_BASE64_AQUI'; // ej: "aHR0cHM6Ly9kaXNjb3Jk..."
const DISCORD_WEBHOOK = (typeof atob === 'function') ? atob(WEBHOOK_B64) : (window && window.atob ? window.atob(WEBHOOK_B64) : null);

// --- Función de canje que resta puntos con transaction desde el cliente y avisa a Discord ---
async function intentarCanjear(item) {
  if (!currentUser) { alert('Debes iniciar sesión para canjear'); return; }

  // Determinar persona asociada (recomiendo guardar uid/email en personas al crear)
  const personaId = userPersonId || currentUser.uid; // userPersonId lo estableces al iniciar sesión
  if (!personaId) {
    if (!confirm('No se ha podido mapear tu cuenta a un participante. ¿Continuar usando tu UID?')) {
      return;
    }
  }

  const puntosRef = firebase.database().ref(`personas/${personaId}/puntos`);
  try {
    // 1) Transaction atómica: resta solo si hay fondos
    const txResult = await puntosRef.transaction(current => {
      if (current === null || typeof current !== 'number') {
        // usuario no existe o puntos inválidos -> abort
        return;
      }
      if (current < item.cost) {
        // insuficiente -> abortar transacción
        return;
      }
      return current - item.cost;
    }, { applyLocally: false });

    if (!txResult.committed) {
      alert('No tienes suficientes puntos para canjear esa recompensa.');
      return;
    }

    const newPoints = txResult.snapshot.val();
    const oldPoints = newPoints + item.cost;

    // 2) Registrar el canje en /claims (ya procesado)
    const claimRef = claimsRef.push();
    const claimObj = {
      userId: personaId,
      userUid: currentUser.uid,
      userName: currentUser.email || currentUser.displayName || 'Usuario',
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

    // 3) Enviar notificación a Discord (webhook)
    if (!DISCORD_WEBHOOK) {
      console.warn('Webhook de Discord no configurado.');
    } else {
      const message = `🎉 **Recompensa canjeada**\nUsuario: **${claimObj.userName}**\nRecompensa: **${claimObj.rewardName}**\nCoste: **${claimObj.cost}** puntos\nPuntos: **${oldPoints} → ${newPoints}**\n(ID claim: ${claimRef.key})`;
      // hacer POST al webhook
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message })
        });
      } catch (err) {
        console.error('Error enviando webhook a Discord:', err);
        // opcional: escribir un campo en claim indicando que la notificación falló
        await claimRef.child('discordNotifyError').set(String(err));
      }
    }

    // 4) Notificar UI
    alert('Canje procesado correctamente.');
    updateMiPuntos(); // refrescar UI local
  } catch (err) {
    console.error('Error en intentoCanjear:', err);
    alert('Ha ocurrido un error al procesar el canje. Revisa la consola.');
  }
}
