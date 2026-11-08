// <galeno-pestanas>: las pestañas de la pantalla de Consulta (Detalle / Documentos / Procedimientos).
//   <galeno-pestanas id="p">
//       <div slot="p0">...contenido de la primera pestaña...</div>
//       <div slot="p1">...contenido de la segunda...</div>
//   </galeno-pestanas>
//   p.titulos = ["Detalle", "Documentos"];
// Cada hijo lleva slot="p0", "p1"... segun su posicion; solo se ve el de la pestaña activa.
// Emite "galeno-cambiar-pestana" { indice, titulo }.
class GalenoPestanas extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._titulos = [];
        this._activa = 0;
    }

    set titulos(v) { this._titulos = Array.isArray(v) ? v : []; this._activa = 0; this.pintar(); }
    get activa() { return this._activa; }

    connectedCallback() { this.pintar(); }

    activar(indice) {
        if (indice < 0 || indice >= this._titulos.length) return;
        this._activa = indice;
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-cambiar-pestana",
            { detail: { indice, titulo: this._titulos[indice] }, bubbles: true, composed: true }));
    }

    pintar() {
        this.shadowRoot.innerHTML = `
          <style>
            nav { display:flex; gap:.25rem; border-bottom:2px solid #1D3461; flex-wrap:wrap; }
            button { padding:.5rem 1rem; border:0; background:#829CBC; color:#fff; cursor:pointer;
                     border-radius:.4rem .4rem 0 0; font:inherit; }
            button[aria-selected=true] { background:#1D3461; }
            .panel { padding:1rem 0; }
          </style>
          <nav role="tablist"></nav>
          <div class="panel" role="tabpanel"><slot name="p${this._activa}"></slot></div>`;
        const nav = this.shadowRoot.querySelector("nav");
        this._titulos.forEach((t, i) => {
            const b = document.createElement("button");
            b.type = "button"; b.role = "tab"; b.textContent = t;
            b.setAttribute("aria-selected", String(i === this._activa));
            b.addEventListener("click", () => this.activar(i));
            nav.append(b);
        });
    }
}

customElements.define("galeno-pestanas", GalenoPestanas);
