// sync.js
// =======================================
// 1) IMPORTS Y LOGGER
// =======================================
const fs = require("fs");

// Logger simple con timestamp
function log(mensaje) {
  const ahora = new Date().toISOString();
  console.log(`[${ahora}] ${mensaje}`);
}

// =======================================
// 2) FETCH CON TIMEOUT
// =======================================

// Usa AbortController para cortar la petición si se demora demasiado
async function fetchConTimeout(url, tiempoMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), tiempoMs);

  try {
    const respuesta = await fetch(url, { signal: controller.signal });
    return respuesta;
  } finally {
    clearTimeout(id);
  }
}

// =======================================
// 3) DESCARGA CON REINTENTOS + TIMEOUT + LOGGING
// =======================================

async function descargarConReintentos(url, opciones = {}) {
  const {
    maxIntentos = 3,
    tiempoMs = 5000,
    esperaEntreIntentos = 1000,
  } = opciones;

  let intento = 1;

  while (intento <= maxIntentos) {
    try {
      log(`Intento ${intento}/${maxIntentos} para ${url}`);

      const respuesta = await fetchConTimeout(url, tiempoMs);

      if (!respuesta.ok) {
        throw new Error("HTTP " + respuesta.status);
      }

      const datos = await respuesta.json();
      log(`✅ Descarga exitosa desde ${url}`);
      return datos;

    } catch (error) {
      log(`⚠️ Error en intento ${intento}: ${error.message}`);

      if (intento === maxIntentos) {
        log(`❌ Se acabaron los intentos para ${url}`);
        throw error;
      }

      log(`⏳ Esperando ${esperaEntreIntentos}ms antes de reintentar...`);
      await new Promise(res => setTimeout(res, esperaEntreIntentos));
      intento++;
    }
  }
}

// =======================================
// 4) PROCESAMIENTO DE DATOS SEGÚN LA API
// =======================================

function procesarDatos(nombreApi, datosCrudos) {
  log(`🔧 Procesando datos de ${nombreApi}...`);

  if (nombreApi === "users") {
    return datosCrudos.map(u => ({
      id: u.id,
      nombre: u.name,
      email: u.email,
    }));
  }

  if (nombreApi === "posts") {
    return datosCrudos.map(p => ({
      id: p.id,
      titulo: p.title,
      resumen: p.body.slice(0, 40) + "...",
    }));
  }

  // Por si agregas otras APIs después
  return datosCrudos;
}

// =======================================
// 5) GUARDAR EN ARCHIVO LOCAL (PROMISE)
// =======================================

function guardarEnArchivo(nombreArchivo, datos) {
  return new Promise((resolve, reject) => {
    const contenido = JSON.stringify(datos, null, 2);

    fs.writeFile(nombreArchivo, contenido, "utf8", (err) => {
      if (err) {
        log(`❌ Error al guardar ${nombreArchivo}: ${err.message}`);
        return reject(err);
      }
      log(`💾 Archivo guardado: ${nombreArchivo}`);
      resolve();
    });
  });
}

// =======================================
// 6) LISTA DE MÚLTIPLES APIS A SINCRONIZAR
// =======================================

const apis = [
  {
    nombre: "users",
    url: "https://jsonplaceholder.typicode.com/users",
    archivo: "usuarios_sync.json",
  },
  {
    nombre: "posts",
    url: "https://jsonplaceholder.typicode.com/posts",
    archivo: "posts_sync.json",
  },
];

// =======================================
// 7) SISTEMA DE SINCRONIZACIÓN CON ASYNC/AWAIT
// =======================================

async function sincronizarAsyncAwait() {
  log("🚀 Iniciando sincronización con async/await");

  for (const api of apis) {
    try {
      log(`--- Sincronizando API: ${api.nombre} ---`);

      // 1) Descargar con reintentos + timeout
      const datosCrudos = await descargarConReintentos(api.url, {
        maxIntentos: 3,
        tiempoMs: 4000,
        esperaEntreIntentos: 1500,
      });

      // 2) Procesar datos
      const procesados = procesarDatos(api.nombre, datosCrudos);

      // 3) Guardar en archivo
      await guardarEnArchivo(api.archivo, procesados);

      log(`✅ API ${api.nombre} sincronizada correctamente`);

    } catch (error) {
      log(`💥 Error al sincronizar ${api.nombre}: ${error.message}`);
    }
  }

  log("🏁 Sincronización completa (async/await)");
}

// =======================================
// 8) MINI EJEMPLOS PARA LA COMPARACIÓN TEÓRICA
//    (callbacks vs Promises vs async/await)
// =======================================

// 8.1. CALLBACKS
function obtenerUsuariosCallback(callback) {
  fetch("https://jsonplaceholder.typicode.com/users")
    .then(res => res.json())
    .then(datos => {
      callback(null, datos); // primer parámetro: error (null si no hay)
    })
    .catch(err => {
      callback(err);
    });
}

// 8.2. PROMISES
function obtenerUsuariosPromise() {
  return fetch("https://jsonplaceholder.typicode.com/users")
    .then(res => res.json());
}

// 8.3. ASYNC/AWAIT
async function obtenerUsuariosAsync() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users");
  const datos = await res.json();
  return datos;
}

// =======================================
// 9) EJECUCIÓN DE PRUEBA
// =======================================

async function main() {
  // A) Ejecutar la sincronización completa
  await sincronizarAsyncAwait();

  // B) Demostración de los tres estilos para la comparación

  // Callbacks
  log("👾 Probando versión con CALLBACKS");
  obtenerUsuariosCallback((err, usuarios) => {
    if (err) {
      log("Error (callback): " + err.message);
    } else {
      log("Usuarios descargados con callback: " + usuarios.length);
    }
  });

  // Promises
  log("👾 Probando versión con PROMISES");
  obtenerUsuariosPromise()
    .then(usuarios => {
      log("Usuarios descargados con Promises: " + usuarios.length);
    })
    .catch(err => {
      log("Error (Promises): " + err.message);
    });

  // Async/await
  log("👾 Probando versión con ASYNC/AWAIT");
  try {
    const usuarios = await obtenerUsuariosAsync();
    log("Usuarios descargados con async/await: " + usuarios.length);
  } catch (err) {
    log("Error (async/await): " + err.message);
  }
}

// Llamar a main
main();
