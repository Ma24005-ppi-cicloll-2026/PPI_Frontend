// Conserva el evento para que la aplicación pueda ofrecer la instalación.
window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    window.galenoEventoInstalacion = e;
});
