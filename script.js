// --- Configuración de Firebase (PEGADA DIRECTAMENTE AQUÍ) ---
const firebaseConfig = {
    apiKey: "AIzaSyDXDotyDcrJ8o1U_PNXm1RgzoMx0uAU3f8", // ¡Tu API Key real!
    authDomain: "datos-lm.firebaseapp.com",
    databaseURL: "https://datos-lm-default-rtdb.firebaseio.com", // ¡Tu Database URL real!
    projectId: "datos-lm",
    storageBucket: "datos-lm.firebasestorage.app", // Probablemente no lo uses, pero está bien dejarlo
    messagingSenderId: "552540792054",
    appId: "1:552540792054:web:770291d30460f2c05778d7",
    measurementId: "G-FFV2G059J4" // Analytics, no estrictamente necesario para DB
  };
  
  // --- Inicializar Firebase ---
  // Usamos los scripts globales cargados en index.html (firebase. ... .compat)
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database(); // Obtenemos la referencia al servicio de Realtime Database
  
  // --- Referencia a la ubicación 'personas' en la base de datos ---
  const personasRef = database.ref('personas');
  
  // --- Seleccionar Elementos del DOM ---
  const listaPersonasUL = document.getElementById('lista-personas');
  
  // --- Variable para guardar los datos locales (se sincronizará con Firebase) ---
  let personas = {}; // Empezamos con un objeto vacío
  
  // --- Funciones ---
  
  // Función para mostrar/actualizar la lista en el HTML (MISMA QUE ANTES)
  function renderLista() {
      listaPersonasUL.innerHTML = ''; // Limpiar lista actual
  
      if (!personas || Object.keys(personas).length === 0) {
          listaPersonasUL.innerHTML = '<li>No hay participantes registrados o cargando...</li>';
          return;
      }
  
      // Ordenar personas por puntos (opcional, de mayor a menor)
      const personasOrdenadas = Object.entries(personas) // [ [id1, data1], [id2, data2] ]
        .sort(([, a], [, b]) => b.puntos - a.puntos); // Ordena por puntos descendente
  
      // Recorrer las personas ordenadas
      for (const [id, persona] of personasOrdenadas) {
          const li = document.createElement('li');
          const span = document.createElement('span');
          span.textContent = `${persona.nombre} (${persona.puntos} puntos)`;
  
          const btnSumar = document.createElement('button');
          btnSumar.textContent = '+';
          btnSumar.classList.add('add');
          btnSumar.dataset.id = id; // Guardar ID
  
          const btnRestar = document.createElement('button');
          btnRestar.textContent = '-';
          btnRestar.classList.add('subtract');
          btnRestar.dataset.id = id; // Guardar ID
  
          li.appendChild(span);
          li.appendChild(btnSumar);
          li.appendChild(btnRestar);
          listaPersonasUL.appendChild(li);
      }
  }
  
  // Función para manejar clics en los botones (MODIFICADA PARA FIREBASE)
  function manejarClicBotones(event) {
      const target = event.target;
      const id = target.dataset.id;
  
      if (target.tagName === 'BUTTON' && id && personas[id]) {
          let puntosActuales = personas[id].puntos; // Obtener puntos actuales del objeto local (sincronizado)
          let nuevosPuntos;
  
          if (target.classList.contains('add')) {
              nuevosPuntos = puntosActuales + 1;
              console.log(`Intentando sumar 1 punto a: ${id}`);
          } else if (target.classList.contains('subtract')) {
              nuevosPuntos = puntosActuales - 1;
              console.log(`Intentando restar 1 punto a: ${id}`);
          } else {
              return; // No es un botón de sumar/restar conocido
          }
  
          // --- ACTUALIZAR EN FIREBASE ---
          // Creamos una referencia específica al campo 'puntos' de esa persona
          const puntosPersonaRef = database.ref(`personas/${id}/puntos`);
  
          // Usamos 'set' para escribir el nuevo valor directamente en esa ubicación
          puntosPersonaRef.set(nuevosPuntos)
              .then(() => {
                  console.log(`Puntos actualizados para ${id} a ${nuevosPuntos} en Firebase.`);
                  // ¡NO necesitamos llamar a renderLista() aquí!
                  // El listener 'onValue' detectará el cambio en Firebase y actualizará la UI.
              })
              .catch((error) => {
                  console.error(`Error al actualizar puntos para ${id}:`, error);
                  // Podrías mostrar un mensaje de error al usuario aquí
              });
      }
  }
  
  // --- Escuchar Cambios en Tiempo Real desde Firebase ---
  personasRef.on('value', (snapshot) => {
      console.log("Datos recibidos/actualizados desde Firebase!");
      if (snapshot.exists()) {
          personas = snapshot.val(); // Actualizar nuestro objeto local con los datos de Firebase
      } else {
          personas = {}; // Si no hay nada en 'personas' en Firebase, vaciamos el objeto local
          console.log("No hay datos en /personas en Firebase.");
      }
      renderLista(); // Volver a dibujar la lista con los datos actualizados
  }, (error) => {
      // Manejo de errores al escuchar
      console.error("Error al leer datos de Firebase:", error);
      listaPersonasUL.innerHTML = '<li>Error al cargar datos. Revisa la consola (F12).</li>';
  });
  
  
  // --- Inicialización y Event Listeners ---
  
  // YA NO llamamos a renderLista() aquí, se llama cuando llegan los datos de Firebase por primera vez.
  // Añadir el event listener para los botones
  listaPersonasUL.addEventListener('click', manejarClicBotones);
  
  console.log("Firebase inicializado y escuchando cambios en /personas.");
