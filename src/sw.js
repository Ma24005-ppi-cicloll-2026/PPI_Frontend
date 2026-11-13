// Service Worker de GalenoSV: hace que la app sea instalable y que abra sin conexion.
// Cuando agregue un archivo nuevo a la app: agreguelo a ARCHIVOS y suba el numero de VERSION
// (el numero nuevo hace que los usuarios descarguen la version actualizada).
importScripts("js/control/sw_estrategias.js");

const VERSION = "galeno-v7";

const ARCHIVOS = [
    "./",
    "index.html",
    "js/boundary/app_model.js",
    "js/boundary/citas_model.js",
    "js/boundary/componentes/autocomplete.js",
    "js/boundary/componentes/buscador_tipo_documentos.js",
    "js/boundary/componentes/campo.js",
    "js/boundary/componentes/estado_conexion.js",
    "js/boundary/componentes/estado_vista.js",
    "js/boundary/componentes/indicador_pasos.js",
    "js/boundary/componentes/instalar_app.js",
    "js/boundary/componentes/lista_examenes.js",
    "js/boundary/componentes/menu_navegacion.js",
    "js/boundary/componentes/notificacion_emergente.js",
    "js/boundary/componentes/opcion.js",
    "js/boundary/componentes/registro_paso.js",
    "js/boundary/componentes/segmentado.js",
    "js/boundary/componentes/selector.js",
    "js/boundary/componentes/tarjeta_agenda.js",
    "js/boundary/componentes/tarjeta_cita.js",
    "js/boundary/dashboard_model.js",
    "js/boundary/login_model.js",
    "js/boundary/seguimiento_model.js",
    "js/control/agenda.js",
    "js/control/clinica_service.js",
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
    "manifest.webmanifest",
    "recursos/galeno.css",
    "recursos/iconos/icon-192.png",
    "recursos/iconos/icon-512.png",
    "recursos/iconos/icon-maskable-512.png",
    "recursos/principal.css"
];

const estrategias = new EstrategiasCache(VERSION, caches, peticion => fetch(peticion));

self.addEventListener("install", evento => {
    evento.waitUntil(estrategias.precargar(ARCHIVOS).then(() => self.skipWaiting()));
});

self.addEventListener("activate", evento => {
    evento.waitUntil(estrategias.limpiarViejos().then(() => self.clients.claim()));
});

// Solo se interceptan las lecturas (GET). Crear/editar/eliminar siempre van directo al backend.
self.addEventListener("fetch", evento => {
    if (evento.request.method !== "GET") return;
    evento.respondWith(estrategias.redPrimero(evento.request));
});
