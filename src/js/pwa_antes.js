// Captura TEMPRANA de beforeinstallprompt: en visitas repetidas (service worker ya activo)
// Chrome puede avisar ANTES de que galeno-app cree el servicio, y ese evento se pierde.
// Aqui se guarda en window apenas llega (evitando el mini-aviso del navegador) y
// Pwa.iniciar() (control/pwa.js) lo adopta y dispara "galeno-instalable".
window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    window.galenoEventoInstalacion = e;
});
