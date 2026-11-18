class AppModel {


    // Conecta las referencias del shell y configura las rutas.
    constructor(raiz = document) {
        this.raiz = raiz;
        this.menu = raiz.querySelector("#menu");
        this.zona = raiz.querySelector("#pantalla");
        this.textoSesion = raiz.querySelector("#sesion");
        this.tituloSeccion = raiz.querySelector("#titulo-seccion-texto");
        this.anuncio = raiz.querySelector("#anuncio");

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
        this.actual = null;
        this.param = null;
    }

    // Prepara el estado y las escuchas que necesita este flujo.
    iniciar() {
        this.menu.addEventListener("galeno-navegar", this.alNavegarMenu);
        window.addEventListener("galeno-sesion", this.alCambiarSesion);
        window.addEventListener("galeno-contexto", this.alCambiarContexto);
        window.addEventListener("hashchange", this.alCambiarHash);
        this.reiniciar(this.destinoEnDireccion());
    }

    // Descarta el trabajo pendiente de la vista al salir.
    destruir() {
        this.menu.removeEventListener("galeno-navegar", this.alNavegarMenu);
        window.removeEventListener("galeno-sesion", this.alCambiarSesion);
        window.removeEventListener("galeno-contexto", this.alCambiarContexto);
        window.removeEventListener("hashchange", this.alCambiarHash);
    }


    // Extrae la ruta y su parámetro del hash actual.
    destinoEnDireccion() {
        const [destino, ...resto] = window.location.hash.replace(/^#\/?/, "").split("/");
        return this.pantallas[destino] ? { destino, param: resto.join("/") || null } : null;
    }

    // Sincroniza la pantalla cuando cambia el hash.
    alCambiarDireccion() {
        const d = this.destinoEnDireccion();
        if (d && (d.destino !== this.actual || d.param !== this.param)) this.irA(d.destino, d.param);
    }

    // Devuelve las rutas disponibles para la sesión actual.
    permitidas() { return Object.keys(this.pantallas).filter(d => Sesion.puede(d)); }

    // Construye el menú con las rutas permitidas para la sesión.
    construirMenu() {
        return this.permitidas().filter(d => this.pantallas[d].enMenu !== false)
            .map(d => ({ texto: this.pantallas[d].texto, destino: d }));
    }

    // Escapa los caracteres con significado en HTML.
    static escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Actualiza el nombre y las acciones de sesión en la cabecera.
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
        t.classList.toggle("con-sesion", Boolean(s));
    }

    // Actualiza el menú y resuelve la ruta inicial según la sesión.
    reiniciar(pedida = null) {
        this.pintarSesion();
        this.menu.items = this.construirMenu();
        if (pedida && Sesion.puede(pedida.destino)) this.irA(pedida.destino, pedida.param);
        else this.irA(Sesion.obtener() ? "dashboard" : "citas");
    }

    // Cambia de ruta y monta la pantalla correspondiente.
    irA(destino, param = null) {
        if (!this.pantallas[destino] || !Sesion.puede(destino)) destino = Sesion.obtener() ? "dashboard" : "citas";
        if (destino === "consulta" && !param) destino = "dashboard";
        this.actual = destino;
        this.param = destino === "consulta" ? param : null;
        const ruta = "/" + destino + (this.param ? "/" + this.param : "");
        if (window.location.hash !== "#" + ruta) window.location.hash = ruta;

        // El montaje se ejecuta dentro de la transición cuando el navegador la admite.
        const pintar = () => {
            this.zona.replaceChildren();
            this.menu.activo = destino === "consulta" ? "dashboard" : destino;
            document.title = `${this.pantallas[destino].texto} · GalenoSV`;
            if (this.tituloSeccion) this.tituloSeccion.textContent = this.pantallas[destino].texto;
            const pantalla = document.createElement(this.pantallas[destino].elemento);
            pantalla.irA = (ruta, param) => this.irA(ruta, param);
            if (destino === "consulta") pantalla.idConsulta = this.param;
            this.zona.append(pantalla);
            this.zona.scrollTop = 0;
            this.enfocarPantalla(pantalla);
        };
        const reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (typeof document.startViewTransition === "function" && !reducir) {
            const transicion = document.startViewTransition(pintar);
            if (transicion) [transicion.ready, transicion.finished, transicion.updateCallbackDone]
                .forEach(promesa => promesa && promesa.catch(() => {}));
        } else {
            pintar();
        }
    }

    // Enfoca la entrada o el título y anuncia el cambio de ruta.
    enfocarPantalla(pantalla) {
        const titulo = this.zona.querySelector("h2");
        if (pantalla?.enfocarEntrada) {
            pantalla.enfocarEntrada();
        } else if (titulo) {
            titulo.setAttribute("tabindex", "-1");
            titulo.focus({ preventScroll: true });
        }
        if (this.anuncio) this.anuncio.textContent = `Pantalla: ${this.pantallas[this.actual].texto}`;
    }
}
