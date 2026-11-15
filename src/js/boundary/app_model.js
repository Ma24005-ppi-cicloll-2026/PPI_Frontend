// Modelo principal: une el menu, el encabezado (sesion) y la zona de pantallas (#pantalla).
// Pantallas (en el orden de la rubrica): citas (HU1, publica), login (HU2), dashboard (HU3), consulta (HU4, #/consulta/<id>).
// Lo que ve cada quien sale de Sesion.puede() (control/sesion.js). Se arranca desde el index.html:
//     new AppModel().iniciar();
class AppModel {

    constructor(raiz = document) {
        this.raiz = raiz;
        this.menu = raiz.querySelector("#menu");
        this.zona = raiz.querySelector("#pantalla");
        this.textoSesion = raiz.querySelector("#sesion");
        // Para agregar una pantalla: una entrada aqui (y su regla en control/sesion.js).
        // `enMenu: false` = se llega desde otra pantalla (la consulta se abre desde el Dashboard).
        this.pantallas = {
            citas:     { texto: "Buscar citas", elemento: "galeno-pantalla-citas" },
            login:     { texto: "Iniciar sesión", elemento: "galeno-pantalla-login" },
            dashboard: { texto: "Dashboard", elemento: "galeno-pantalla-dashboard" },
            consulta:  { texto: "Consulta", elemento: "galeno-pantalla-consulta", enMenu: false }
        };
        this.alCambiarSesion = () => this.reiniciar();
        this.alCambiarContexto = () => this.pintarSesion();
        this.alCambiarHash = () => this.alCambiarDireccion();
        this.alNavegarMenu = e =>
            e.detail.destino === "salir" ? Sesion.cerrar() : this.irA(e.detail.destino);
        this.actual = null;                    // la pantalla que se esta mostrando
        this.param = null;
    }

    iniciar() {
        this.menu.addEventListener("galeno-navegar", this.alNavegarMenu);
        window.addEventListener("galeno-sesion", this.alCambiarSesion);
        window.addEventListener("galeno-contexto", this.alCambiarContexto);
        window.addEventListener("hashchange", this.alCambiarHash);     // botones Atras/Adelante del navegador
        this.reiniciar(this.destinoEnDireccion());                     // al recargar se respeta la direccion
    }

    destruir() {
        this.menu.removeEventListener("galeno-navegar", this.alNavegarMenu);
        window.removeEventListener("galeno-sesion", this.alCambiarSesion);
        window.removeEventListener("galeno-contexto", this.alCambiarContexto);
        window.removeEventListener("hashchange", this.alCambiarHash);
    }

    // ---------- direccion (SPA): #/citas, #/dashboard, #/consulta/<id> ----------

    destinoEnDireccion() {
        const [destino, ...resto] = window.location.hash.replace(/^#\/?/, "").split("/");
        return this.pantallas[destino] ? { destino, param: resto.join("/") || null } : null;
    }

    alCambiarDireccion() {
        const d = this.destinoEnDireccion();
        if (d && (d.destino !== this.actual || d.param !== this.param)) this.irA(d.destino, d.param);
    }

    permitidas() { return Object.keys(this.pantallas).filter(d => Sesion.puede(d)); }

    construirMenu() {
        const items = this.permitidas().filter(d => this.pantallas[d].enMenu !== false)
            .map(d => ({ texto: this.pantallas[d].texto, destino: d }));
        if (Sesion.obtener()) items.push({ texto: "Cerrar sesión", destino: "salir" });
        return items;
    }

    pintarSesion() {
        const s = Sesion.obtener();
        this.textoSesion.textContent = s
            ? [s.nombre, s.rol, s.clinica].filter(Boolean).join(" · ")
            : "Sin sesión iniciada";
    }

    // al arrancar y cada vez que alguien inicia o cierra sesion: sin sesion -> Buscar citas; con sesion -> Dashboard
    reiniciar(pedida = null) {
        this.pintarSesion();
        this.menu.items = this.construirMenu();
        if (pedida && Sesion.puede(pedida.destino)) this.irA(pedida.destino, pedida.param);
        else this.irA(Sesion.obtener() ? "dashboard" : "citas");
    }

    irA(destino, param = null) {
        if (!this.pantallas[destino] || !Sesion.puede(destino)) destino = Sesion.obtener() ? "dashboard" : "citas";
        if (destino === "consulta" && !param) destino = "dashboard";
        this.actual = destino;
        this.param = destino === "consulta" ? param : null;
        const ruta = "/" + destino + (this.param ? "/" + this.param : "");
        if (window.location.hash !== "#" + ruta) window.location.hash = ruta;   // la URL refleja la pantalla
        this.zona.replaceChildren();          // limpiar la pantalla anterior
        this.menu.activo = destino === "consulta" ? "dashboard" : destino;
        document.title = `${this.pantallas[destino].texto} · GalenoSV`;
        const pantalla = document.createElement(this.pantallas[destino].elemento);
        pantalla.irA = (ruta, param) => this.irA(ruta, param);
        if (destino === "consulta") pantalla.idConsulta = this.param;
        this.zona.append(pantalla);
    }
}
