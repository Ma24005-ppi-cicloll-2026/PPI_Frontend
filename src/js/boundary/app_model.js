// Modelo principal: une el menu, el encabezado (sesion) y la zona de pantallas (#pantalla).
// Para agregar una pantalla nueva: una linea en `this.pantallas` y una en `this.items`.
class AppModel {

    constructor() {
        this.menu = document.querySelector("#menu");
        this.zona = document.querySelector("#pantalla");
        this.pantallas = {
            inicio: c => new InicioModel(c, d => this.irA(d)).iniciar(),
            consulta: c => new BusquedaConsultaModel(c).iniciar(),
            login: c => new LoginModel(c).iniciar()
        };
        this.items = [
            { texto: "Inicio", destino: "inicio" },
            { texto: "Consultas", destino: "consulta" },
            { texto: "Cambio de rol", destino: "login" }
        ];
        Object.entries(ENTIDADES).forEach(([destino, e]) => {
            this.pantallas[destino] = c => new ListadoModel(c, e).iniciar();
            this.items.push({ texto: e.titulo, destino });
        });
    }

    iniciar() {
        this.menu.items = this.items;
        this.menu.addEventListener("galeno-navegar", e => this.irA(e.detail.destino));
        window.addEventListener("galeno-sesion", () => this.pintarSesion());
        this.pintarSesion();
        this.irA("inicio");
    }

    irA(destino) {
        this.zona.replaceChildren();          // limpiar la pantalla anterior
        this.menu.activo = destino;
        this.pantallas[destino](this.zona);   // dibujar la nueva
    }

    pintarSesion() {
        let s = null;
        try { s = JSON.parse(sessionStorage.getItem("sesion") || "null"); } catch (e) { /* sin almacenamiento: sin sesion */ }
        document.querySelector("#sesion").textContent =
            s ? `${s.nombre} · ${s.rol} · ${s.clinica}` : "Sin sesión iniciada";
    }
}

new AppModel().iniciar();
