// Modelo principal: une el menu, el encabezado (sesion) y la zona de pantallas (#pantalla).
// Lo que ve cada quien sale de Sesion.puede() (control/sesion.js). Se arranca desde el index.html:
//     new AppModel().iniciar();
class AppModel {

    constructor() {
        this.menu = document.querySelector("#menu");
        this.zona = document.querySelector("#pantalla");
        this.textoSesion = document.querySelector("#sesion");
        // Para agregar una pantalla: una entrada aqui (y su regla en PERMISOS si hace falta).
        this.pantallas = {
            inicio:    { texto: "Inicio", crear: c => new InicioModel(c, d => this.irA(d), this.modulos()).iniciar() },
            login:     { texto: "Iniciar sesión", crear: c => new LoginModel(c).iniciar() },
            consulta:  { texto: "Consultas", descripcion: "Buscar pacientes y ver sus consultas",
                         crear: c => new BusquedaConsultaModel(c).iniciar() },
            historial: { texto: "Mi historial", descripcion: "Sus consultas, pasos y resultados",
                         crear: c => new HistorialModel(c).iniciar() }
        };
        // las pantallas de administracion (listados) salen de entidades.js
        Object.entries(ENTIDADES).forEach(([destino, e]) => {
            this.pantallas[destino] = { texto: e.titulo, descripcion: e.descripcion,
                                        crear: c => new ListadoModel(c, e).iniciar() };
        });
        this.alCambiarSesion = () => this.reiniciar();
    }

    iniciar() {
        this.menu.addEventListener("galeno-navegar", e =>
            e.detail.destino === "salir" ? Sesion.cerrar() : this.irA(e.detail.destino));
        window.addEventListener("galeno-sesion", this.alCambiarSesion);
        this.reiniciar();
    }

    destruir() { window.removeEventListener("galeno-sesion", this.alCambiarSesion); }

    permitidas() { return Object.keys(this.pantallas).filter(d => Sesion.puede(d)); }

    // las tarjetas del Inicio: las pantallas permitidas, menos Inicio y Login
    modulos() {
        return this.permitidas()
            .filter(d => d !== "inicio" && d !== "login")
            .map(d => ({ destino: d, titulo: this.pantallas[d].texto, descripcion: this.pantallas[d].descripcion }));
    }

    construirMenu() {
        const items = this.permitidas().map(d => ({ texto: this.pantallas[d].texto, destino: d }));
        if (Sesion.obtener()) items.push({ texto: "Cerrar sesión", destino: "salir" });
        return items;
    }

    // se llama al arrancar y cada vez que alguien inicia o cierra sesion
    reiniciar() {
        const sesion = Sesion.obtener();
        this.textoSesion.textContent = sesion
            ? [sesion.nombre, sesion.rol, sesion.clinica].filter(Boolean).join(" · ")
            : "Sin sesión iniciada";
        this.menu.items = this.construirMenu();
        this.irA(sesion ? "inicio" : "login");
    }

    irA(destino) {
        if (!Sesion.puede(destino)) destino = Sesion.obtener() ? "inicio" : "login";   // sin permiso: no entra
        this.zona.replaceChildren();          // limpiar la pantalla anterior
        this.menu.activo = destino;
        this.pantallas[destino].crear(this.zona);
    }
}
