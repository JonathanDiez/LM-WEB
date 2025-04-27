// --- Seleccionar Elementos del DOM ---
const listaPersonasUL = document.getElementById('lista-personas');

// --- Datos de Ejemplo (Esto vendrá de Firebase luego) ---
// Usaremos un objeto donde la clave es el ID único (el código que mencionaste)
let personas = {
   "juan123": { nombre: "Juan Pérez", puntos: 5 },
   "ana456": { nombre: "Ana López", puntos: 10 },
   "carlos789": { nombre: "Carlos García", puntos: 2 }
};

// --- Funciones ---

// Función para mostrar/actualizar la lista en el HTML
function renderLista() {
    // Limpiar la lista actual antes de volver a dibujarla
    listaPersonasUL.innerHTML = '';

    // Si no hay personas, mostrar mensaje
    if (Object.keys(personas).length === 0) {
        listaPersonasUL.innerHTML = '<li>No hay participantes registrados.</li>';
        return;
    }


    // Recorrer el objeto de personas
    for (const id in personas) {
        const persona = personas[id];

        // Crear elemento de lista (li)
        const li = document.createElement('li');

        // Crear el span para nombre y puntos
        const span = document.createElement('span');
        span.textContent = `${persona.nombre} (${persona.puntos} puntos)`;

        // Crear botón de sumar (+)
        const btnSumar = document.createElement('button');
        btnSumar.textContent = '+';
        btnSumar.classList.add('add'); // Añadir clase para CSS
        btnSumar.dataset.id = id; // Guardar el ID de la persona en el botón

        // Crear botón de restar (-)
        const btnRestar = document.createElement('button');
        btnRestar.textContent = '-';
        btnRestar.classList.add('subtract'); // Añadir clase para CSS
        btnRestar.dataset.id = id; // Guardar el ID de la persona en el botón

        // Añadir elementos al li
        li.appendChild(span);
        li.appendChild(btnSumar);
        li.appendChild(btnRestar);

        // Añadir el li a la lista ul
        listaPersonasUL.appendChild(li);
    }
}

// Función para manejar clics en los botones (usando delegación de eventos)
function manejarClicBotones(event) {
    const target = event.target; // Elemento donde se hizo clic
    const id = target.dataset.id; // Obtener el ID guardado en data-id

    // Verificar si se hizo clic en un botón y tiene un ID
    if (target.tagName === 'BUTTON' && id) {
        if (target.classList.contains('add')) {
            // Acción de sumar puntos (aquí llamaremos a Firebase luego)
            console.log(`Sumar 1 punto a: ${id}`);
            // Simulación local (temporal):
             if (personas[id]) {
                 personas[id].puntos++;
                 renderLista(); // Volver a dibujar la lista actualizada
             }
             // TODO: Reemplazar con llamada a función de Firebase para actualizar
             // incrementarPuntosFirebase(id);
        } else if (target.classList.contains('subtract')) {
            // Acción de restar puntos (aquí llamaremos a Firebase luego)
            console.log(`Restar 1 punto a: ${id}`);
            // Simulación local (temporal):
             if (personas[id]) {
                 personas[id].puntos--;
                 renderLista(); // Volver a dibujar la lista actualizada
             }
            // TODO: Reemplazar con llamada a función de Firebase para actualizar
            // decrementarPuntosFirebase(id);
        }
    }
}


// --- Inicialización y Event Listeners ---

// Dibujar la lista inicial (vacía o con datos de ejemplo si descomentas arriba)
renderLista();

// Añadir un solo event listener a la lista UL para manejar clics en botones
// Esto es más eficiente que añadir un listener a cada botón (delegación)
listaPersonasUL.addEventListener('click', manejarClicBotones);

// --- AQUI EMPEZARÁ LA LÓGICA DE FIREBASE (en el siguiente paso) ---
console.log("Frontend básico cargado. Listo para conectar Firebase.");

// Ejemplo de cómo se añadirían personas (esto vendrá de Firebase)
// personas["pedro01"] = { nombre: "Pedro Gómez", puntos: 7 };
// renderLista(); // Habría que llamar a render cada vez que cambien los datos de Firebase
