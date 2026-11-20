class GalenoTarjetaAgenda extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Utilidades del sistema que usa el componente para mostrar los datos.
    agenda = new Agenda();
    datosClinica = new DatosClinica();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = null;
    }

    // Actualiza los datos de la vista.
    set datos(v) { this._datos = v; this.pintar(); }
    // Devuelve los datos de la vista.
    get datos() { return this._datos; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Obtiene las iniciales que se muestran en el avatar.
    iniciales(nombre) {
        return String(nombre ?? "").trim().split(/\s+/).slice(0, 2)
            .map(p => p[0] ? p[0].toUpperCase() : "").join("") || "?";
    }

    // Elige el estilo visual para el estado recibido.
    tono(nombre) {
        let h = 0;
        for (const c of String(nombre ?? "")) h = (h * 31 + c.charCodeAt(0)) % 997;
        return h % 5;
    }

    // Actualiza el indicador al recuperar la conexión.
    conectar() {
        this.shadowRoot.querySelectorAll(".ver").forEach(b => b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-ver-registro",
                { detail: { idPaso: b.dataset.paso }, bubbles: true, composed: true }))));
        this.shadowRoot.querySelector(".atender")?.addEventListener("click", () => {
            if (this._datos?.puedeAtender !== false) this.dispatchEvent(new CustomEvent("galeno-atender",
                { detail: { idConsulta: this._datos?.idConsulta }, bubbles: true, composed: true }));
        });
        const mas = this.shadowRoot.querySelector(".mas");
        if (mas) mas.addEventListener("click", () => {
            const abierto = mas.getAttribute("aria-expanded") === "true";
            mas.setAttribute("aria-expanded", String(!abierto));
            mas.querySelector("span").textContent = abierto ? this.textoVerMas(Number(mas.dataset.n)) : "Ver menos";
            this.shadowRoot.querySelectorAll(".extra").forEach(li => { li.hidden = abierto; });
        });
    }

    // Arma la sección de un procedimiento con su barra de avance y sus pasos.
    procedimiento(pr) {
        const seccion = this.plantillas.clonar("plantilla-galeno-tarjeta-agenda-proc").firstElementChild;
        seccion.querySelector("h4").append(pr.nombre ?? "");
        if (!pr.pasos.length) {
            ["div.progreso", ".cuenta", "ol.pasos", ".mas"].forEach(s => seccion.querySelector(s).remove());
            return seccion;
        }
        seccion.querySelector(".sin").remove();
        const completado = this.datosClinica.completado;
        const total = pr.total ?? pr.pasos.length;
        const hechos = pr.pasos.filter(s => s.estado === completado).length;
        seccion.querySelector(".progreso span").style.width = `${total > 0 ? Math.round(hechos * 100 / total) : 0}%`;
        seccion.querySelector(".cuenta").textContent = `${hechos} de ${total} paso${total === 1 ? "" : "s"}`;
        const extras = pr.pasos.length - 3;
        seccion.querySelector("ol.pasos").append(...pr.pasos.map((s, i) => this.paso(s, i >= 3)));
        const mas = seccion.querySelector(".mas");
        if (extras > 0) {
            mas.dataset.n = String(extras);
            mas.querySelector("span").textContent = this.textoVerMas(extras);
        } else mas.remove();
        return seccion;
    }

    // Texto del botón que muestra los pasos ocultos, en singular o plural.
    textoVerMas(n) { return `Ver ${n} paso${n === 1 ? "" : "s"} más`; }

    // Arma la fila de un paso realizado.
    paso(s, extra) {
        const li = this.plantillas.clonar("plantilla-galeno-tarjeta-agenda-paso").firstElementChild;
        const hecho = s.estado === this.datosClinica.completado;
        if (extra) { li.className = "extra"; li.hidden = true; }
        const marca = li.querySelector(".marca");
        marca.classList.add(hecho ? "hecho" : "curso");
        marca.textContent = hecho ? "✓" : "…";
        const nombre = li.querySelector(".paso-nombre");
        nombre.title = s.nombre ?? "";
        nombre.querySelector(".nombre-paso").textContent = s.nombre ?? "";
        const ins = li.querySelector(".ins");
        ins.classList.add(hecho ? "ins-hecho" : "ins-curso");
        ins.textContent = s.estado || "En proceso";
        const quien = `${s.quien || "—"}${s.rol ? " · " + s.rol : ""}`;
        li.querySelector(".quien-paso").textContent = quien;
        li.querySelector(".quien-paso").title = quien;
        li.querySelector("time").textContent = this.agenda.hora(s.fecha);
        const ver = li.querySelector(".ver");
        ver.dataset.paso = s.idPaso ?? "";
        ver.setAttribute("aria-label", `Ver registro de ${s.nombre ?? ""}`);
        return li;
    }

    // Clona el molde de la tarjeta y le pone los datos de la consulta.
    pintar() {
        const d = this._datos || {};
        const p = d.paciente || {};
        const finalizada = Boolean(d.finalizada);
        const datos = `${p.edad != null ? p.edad + " años · " : ""}${p.documento || "—"}`;
        const raiz = this.plantillas.llenar(this.plantillas.clonar("plantilla-galeno-tarjeta-agenda"), {
            iniciales: this.iniciales(p.nombre), nombre: p.nombre || "Paciente", datos,
            insignia: finalizada ? "Finalizada" : d.devuelta ? "Devuelta" : "En curso",
            dia: this.agenda.dia(d.fechaInicio), hora: this.agenda.hora(d.fechaInicio), titulo: d.titulo || "" });
        raiz.querySelector("article").classList.toggle("finalizada", finalizada);
        raiz.querySelector(".avatar").classList.add(`tono-${this.tono(p.nombre)}`);
        raiz.querySelector(".ident-datos").title = datos;
        raiz.querySelector(".insignia").classList.add(finalizada ? "fin" : d.devuelta ? "devuelta" : "curso");
        if (!d.titulo) raiz.querySelector(".ref").remove();
        const final = finalizada ? raiz.querySelector(".atender") : raiz.querySelector(".final");
        final.remove();
        const cierre = raiz.querySelector(finalizada ? ".final" : ".atender");
        cierre.before(...(d.procedimientos || []).map(pr => this.procedimiento(pr)));
        if (!finalizada) cierre.disabled = d.puedeAtender === false;
        this.shadowRoot.replaceChildren(raiz);
        this.conectar();
    }
}

customElements.define("galeno-tarjeta-agenda", GalenoTarjetaAgenda);
