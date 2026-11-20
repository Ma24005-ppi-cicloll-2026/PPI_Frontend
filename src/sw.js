importScripts("js/control/sw_estrategias.js");

// Cambia la versión una vez por entrega para renovar los archivos precargados.
const VERSION = "galeno-v20";

// Enumera los recursos necesarios para abrir la aplicación sin conexión.
const ARCHIVOS = [
    "./",
    "index.html",
    "js/boundary/app.js",
    "js/boundary/app_model.js",
    "js/boundary/citas_model.js",
    "js/boundary/componentes/autocomplete.js",
    "js/boundary/componentes/buscador_tipo_documentos.js",
    "js/boundary/componentes/campo.js",
    "js/boundary/componentes/estado_conexion.js",
    "js/boundary/componentes/estado_vista.js",
    "js/boundary/componentes/boton_instalar.js",
    "js/boundary/componentes/marca_acceso.js",
    "js/boundary/componentes/indicador_pasos.js",
    "js/boundary/componentes/invitacion_instalar.js",
    "js/boundary/componentes/guia_instalacion.js",
    "js/boundary/componentes/lista_examenes.js",
    "js/boundary/componentes/menu_navegacion.js",
    "js/boundary/componentes/notificacion_emergente.js",
    "js/boundary/componentes/opcion.js",
    "js/boundary/componentes/registro_paso.js",
    "js/boundary/componentes/segmentado.js",
    "js/boundary/componentes/selector.js",
    "js/boundary/componentes/tarjeta_agenda.js",
    "js/boundary/componentes/tarjeta_cita.js",
    "js/boundary/componentes/tema.js",
    "js/boundary/dashboard_model.js",
    "js/boundary/login_model.js",
    "js/boundary/pantallas.js",
    "js/boundary/seguimiento_model.js",
    "js/control/agenda.js",
    "js/control/api_cache.js",
    "js/control/clinica_service.js",
    "js/control/configuracion.js",
    "js/control/consulta_procedimiento_paso_service.js",
    "js/control/consulta_procedimiento_service.js",
    "js/control/consulta_service.js",
    "js/control/datos_clinica.js",
    "js/control/default_service.js",
    "js/control/documento_service.js",
    "js/control/documentos.js",
    "js/control/examen_resultado_service.js",
    "js/control/examen_service.js",
    "js/control/examen_tipo_examen_service.js",
    "js/control/expediente.js",
    "js/control/flujo_pasos.js",
    "js/control/gestor_fechas.js",
    "js/control/medio_contacto_service.js",
    "js/control/notas_paso.js",
    "js/control/orden_examen_service.js",
    "js/control/persona_rol_service.js",
    "js/control/persona_service.js",
    "js/control/procedimiento_paso_examen_service.js",
    "js/control/procedimiento_paso_secuencia_service.js",
    "js/control/procedimiento_paso_service.js",
    "js/control/procedimiento_service.js",
    "js/control/pwa.js",
    "js/control/rol_service.js",
    "js/control/sesion.js",
    "js/control/sw_estrategias.js",
    "js/control/tipo_documento_service.js",
    "js/control/tipo_examen_service.js",
    "js/control/tipo_medio_contacto_service.js",
    "js/pwa_antes.js",
    "js/entity/clinica.js",
    "js/entity/consulta.js",
    "js/entity/consultaProcedimiento.js",
    "js/entity/consultaProcedimientoPaso.js",
    "js/entity/default_error.js",
    "js/entity/default_response.js",
    "js/entity/documento.js",
    "js/entity/examen.js",
    "js/entity/examenResultado.js",
    "js/entity/examenTipoExamen.js",
    "js/entity/medioContacto.js",
    "js/entity/ordenExamen.js",
    "js/entity/persona.js",
    "js/entity/personaRol.js",
    "js/entity/procedimiento.js",
    "js/entity/procedimientoPaso.js",
    "js/entity/procedimientoPasoExamen.js",
    "js/entity/procedimientoPasoSecuencia.js",
    "js/entity/rol.js",
    "js/entity/tipoDocumento.js",
    "js/entity/tipoExamen.js",
    "js/entity/tipoMedioContacto.js",
    "js/tema_inicial.js",
    "manifest.webmanifest",
    "recursos/capturas/escritorio.png",
    "recursos/capturas/movil.png",
    "recursos/galeno.css",
    "recursos/iconos/icon-192.png",
    "recursos/iconos/icon-512.png",
    "recursos/iconos/icon-maskable-512.png",
    "recursos/principal.css"
];

const estrategias = new EstrategiasCache(VERSION, caches, peticion => fetch(peticion));

// Precarga los recursos antes de activar esta versión del service worker.
self.addEventListener("install", evento => {
    evento.waitUntil(estrategias.precargar(ARCHIVOS).then(() => self.skipWaiting()));
});

// Retira las versiones anteriores y toma control de la aplicación.
self.addEventListener("activate", evento => {
    evento.waitUntil(estrategias.limpiarViejos().then(() => self.clients.claim()));
});

// Decide qué solicitudes puede resolver el service worker.
self.addEventListener("fetch", evento => {
    if (evento.request.method !== "GET") return;
    evento.respondWith(estrategias.redPrimero(evento.request));
});
