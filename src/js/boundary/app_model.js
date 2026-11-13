// Modelo principal: une el menu, el encabezado (sesion) y la zona de pantallas (#pantalla).
// Pantallas (en el orden de la rubrica): citas (HU1, publica), login (HU2), dashboard (HU3), consulta (HU4, #/consulta/<id>).
// Lo que ve cada quien sale de Sesion.puede() (control/sesion.js). Se arranca desde el index.html:
//     new AppModel().iniciar();
class AppModel {

    constructor() {
        this.menu = document.querySelector("#menu");
        this.zona = document.querySelector("#pantalla");
        this.textoSesion = document.querySelector("#sesion");
        this.tituloSeccion = document.querySelector("#titulo-seccion-texto");
        this.anuncio = document.querySelector("#anuncio");   // region aria-live para anunciar la pantalla
        // Para agregar una pantalla: una entrada aqui (y su regla en control/sesion.js).
        // `enMenu: false` = se llega desde otra pantalla (la consulta se abre desde el Dashboard).
        this.pantallas = {
            citas:     { texto: "Buscar citas", crear: c => new CitasModel(c).iniciar() },
            login:     { texto: "Iniciar sesión", crear: c => new LoginModel(c, { irA: d => this.irA(d) }).iniciar() },
            dashboard: { texto: "Dashboard", crear: c => new DashboardModel(c, { irA: (d, p) => this.irA(d, p) }).iniciar() },
            consulta:  { texto: "Consulta", enMenu: false,
                         crear: (c, p) => new SeguimientoModel(c, p, { irA: (d, q) => this.irA(d, q) }).iniciar() }
        };
        this.alCambiarSesion = () => this.reiniciar();
        this.alCambiarContexto = () => this.pintarSesion();
        this.alCambiarHash = () => this.alCambiarDireccion();
        this.actual = null;                    // la pantalla que se esta mostrando
        this.param = null;
    }

    iniciar() {
        this.menu.addEventListener("galeno-navegar", e =>
            e.detail.destino === "salir" ? Sesion.cerrar() : this.irA(e.detail.destino));
        window.addEventListener("galeno-sesion", this.alCambiarSesion);
        window.addEventListener("galeno-contexto", this.alCambiarContexto);
        window.addEventListener("hashchange", this.alCambiarHash);     // botones Atras/Adelante del navegador
        this.reiniciar(this.destinoEnDireccion());                     // al recargar se respeta la direccion
    }

    destruir() {
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
        // El menu solo lleva pantallas: "Cerrar sesion" vive en la tarjeta de usuario de la cabecera.
        return this.permitidas().filter(d => this.pantallas[d].enMenu !== false)
            .map(d => ({ texto: this.pantallas[d].texto, destino: d }));
    }

    static escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Tarjeta de usuario compacta alineada a la derecha: avatar con iniciales, nombre, rol · clinica
    // y debajo el boton-enlace "Cerrar sesion". Sin sesion: "Sin sesión iniciada" + "Iniciar sesión".
    // Conserva #sesion y su aria-live: todo el texto vive dentro del mismo span.
    pintarSesion() {
        const s = Sesion.obtener();
        const t = this.textoSesion;
        if (s) {
            const detalle = [s.rol, s.clinica].filter(Boolean).join(" · ");
            const nombre = AppModel.escapar(s.nombre || "");
            t.innerHTML = `
                <span class="avatar" aria-hidden="true">${AppModel.escapar(GalenoTarjetaAgenda.iniciales(s.nombre || ""))}</span>
                <span class="datos">
                    <span class="nombre" title="${nombre}">${nombre}</span>
                    ${detalle ? `<span class="detalle" title="${AppModel.escapar(detalle)}">${AppModel.escapar(detalle)}</span>` : ""}
                    <button class="salir" type="button">
                        ${GalenoMenu.ICONOS.salir}<span>Cerrar sesión</span>
                    </button>
                </span>`;
            t.querySelector("button.salir").addEventListener("click", () => Sesion.cerrar());
        } else {
            t.innerHTML = `
                <span class="avatar" aria-hidden="true">${GalenoMenu.ICONOS.login}</span>
                <span class="datos">
                    <span class="nombre">Sin sesión iniciada</span>
                    <button class="entrar" type="button"><span>Iniciar sesión</span></button>
                </span>`;
            t.querySelector("button.entrar").addEventListener("click", () => this.irA("login"));
        }
        t.classList.toggle("con-sesion", Boolean(s));   // resalta la tarjeta solo con sesion
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
        const pintar = () => {
            this.zona.replaceChildren();          // limpiar la pantalla anterior
            this.menu.activo = destino === "consulta" ? "dashboard" : destino;
            document.title = `${this.pantallas[destino].texto} · GalenoSV`;
            // la cabecera compacta muestra a la izquierda el titulo de la seccion actual
            if (this.tituloSeccion) this.tituloSeccion.textContent = this.pantallas[destino].texto;
            this.pantallas[destino].crear(this.zona, this.param);
            this.zona.scrollTop = 0;              // la pantalla nueva empieza arriba
            this.enfocarPantalla();
        };
        // transicion de vista nativa (view transitions) si existe y el usuario no pide menos movimiento;
        // si no hay API, el respaldo es la animacion CSS "aparecer" de #pantalla > section (nodo nuevo = se anima)
        const reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (typeof document.startViewTransition === "function" && !reducir) {
            const transicion = document.startViewTransition(pintar);
            transicion && transicion.finished && transicion.finished.catch(() => {});
        } else {
            pintar();
        }
    }

    // al cambiar de pantalla: el foco va al titulo de la nueva pantalla y un region aria-live lo anuncia
    enfocarPantalla() {
        const titulo = this.zona.querySelector("h2");
        if (titulo) {
            titulo.setAttribute("tabindex", "-1");
            titulo.focus({ preventScroll: true });
        }
        if (this.anuncio) this.anuncio.textContent = `Pantalla: ${this.pantallas[this.actual].texto}`;
    }
}
