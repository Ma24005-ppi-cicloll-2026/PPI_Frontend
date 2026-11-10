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
            login:     { texto: "Iniciar sesión", crear: c => new LoginModel(c, { irA: d => this.irA(d) }).iniciar() },
            solicitar: { texto: "Solicitar consulta", descripcion: "Pida su consulta sin iniciar sesión",
                         crear: c => new SolicitudModel(c).iniciar() },
            admision:  { texto: "Registrar paciente", descripcion: "Registrar a quien llega a la clínica (nombre y documento)",
                         crear: c => new AdmisionModel(c).iniciar() },
            registrar: { texto: "Registrar consulta", descripcion: "Abrir la consulta de un paciente ya registrado",
                         crear: c => new RegistroConsultaModel(c, { irA: d => this.irA(d) }).iniciar() },
            enfermeria: { texto: "Enfermería", descripcion: "Registrar y actualizar los pasos de las consultas",
                          crear: c => new AtencionModel(c, { pantalla: "enfermeria", titulo: "Enfermería: pasos de las consultas",
                              acciones: ["paso", "estado"],
                              sinPermiso: "Inicie sesión como personal de enfermería para atender los pasos." }).iniciar() },
            sala:      { texto: "Sala de espera", descripcion: "Quién está esperando en la clínica, en orden de llegada",
                         crear: c => new SalaModel(c).iniciar() },
            atencion:  { texto: "Atención", descripcion: "Consultas pendientes: pasos, exámenes y resultados",
                         crear: c => new AtencionModel(c).iniciar() },
            cierre:    { texto: "Cierre de consulta", descripcion: "Finalizar procedimientos y consulta, con constancia en PDF",
                         crear: c => new CierreModel(c).iniciar() },
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
        this.alCambiarHash = () => this.alCambiarDireccion();
        this.actual = null;                    // la pantalla que se esta mostrando
    }

    iniciar() {
        this.menu.addEventListener("galeno-navegar", e =>
            e.detail.destino === "salir" ? Sesion.cerrar() : this.irA(e.detail.destino));
        window.addEventListener("galeno-sesion", this.alCambiarSesion);
        window.addEventListener("hashchange", this.alCambiarHash);     // botones Atras/Adelante del navegador
        // al abrir la app (o recargar) se respeta la direccion: #/consulta abre Consultas si la sesion lo permite
        this.reiniciar(this.destinoEnDireccion());
    }

    destruir() {
        window.removeEventListener("galeno-sesion", this.alCambiarSesion);
        window.removeEventListener("hashchange", this.alCambiarHash);
    }

    // ---------- direccion (SPA): cada pantalla tiene su propia URL, ej. index.html#/consulta ----------

    destinoEnDireccion() {
        const destino = window.location.hash.replace(/^#\/?/, "");
        return this.pantallas[destino] ? destino : null;
    }

    // el usuario uso Atras/Adelante o edito la URL: se muestra esa pantalla sin volver a escribir la URL
    alCambiarDireccion() {
        const destino = this.destinoEnDireccion();
        if (destino && destino !== this.actual) this.irA(destino);
    }

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
    // (al arrancar recibe la pantalla de la direccion; al cambiar la sesion siempre empieza en Inicio o Login)
    reiniciar(pedida = null) {
        const sesion = Sesion.obtener();
        this.textoSesion.textContent = sesion
            ? [sesion.nombre, sesion.rol, sesion.clinica].filter(Boolean).join(" · ")
            : "Sin sesión iniciada";
        this.menu.items = this.construirMenu();
        this.irA(pedida && Sesion.puede(pedida) ? pedida : (sesion ? "inicio" : "login"));
    }

    irA(destino) {
        if (!Sesion.puede(destino)) destino = Sesion.obtener() ? "inicio" : "login";   // sin permiso: no entra
        this.actual = destino;
        if (window.location.hash !== "#/" + destino) window.location.hash = "/" + destino;   // la URL refleja la pantalla
        this.zona.replaceChildren();          // limpiar la pantalla anterior
        this.menu.activo = destino;
        document.title = destino === "inicio" ? "GalenoSV" : `${this.pantallas[destino].texto} · GalenoSV`;
        this.pantallas[destino].crear(this.zona);
    }
}
