// <galeno-tarjeta-simple>: tarjeta generica (la de las pantallas de Inicio y de resumenes).
//   tarjeta.datos = {
//       titulo: "Personas",
//       descripcion: "Gestione los pacientes",          // opcional
//       campos: [ { etiqueta: "Nombre", valor: "Ana" } ], // opcional
//       boton: "Abrir"                                  // opcional: si viene, dibuja boton
//   };
// Al pulsar el boton emite "galeno-accion" (el Model decide a que pantalla ir).
class GalenoTarjetaSimple extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = { titulo: "", campos: [] };
    }

    set datos(valor) { this._datos = valor || { titulo: "", campos: [] }; this.pintar(); }
    get datos() { return this._datos; }

    connectedCallback() { this.pintar(); }

    pintar() {
        const d = this._datos;
        const campos = Array.isArray(d.campos) ? d.campos : [];
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; height:100%; }
            article { box-sizing:border-box; height:100%; display:flex; flex-direction:column;
                      align-items:center; text-align:center; background:#E6F1FA; color:#1D3461;
                      border:1px solid #B9D3EA; border-radius:.6rem; padding:1rem; font-family:inherit; }
            h3 { margin:0 0 .5rem; }
            p { margin:.25rem 0; }
            button { margin-top:auto; padding:.45rem 1.2rem; border:0; border-radius:.4rem;
                     background:#1D3461; color:#fff; cursor:pointer; }
            p + button, h3 + button { margin-top:auto; }
            .contenido { margin-bottom:.8rem; }
          </style>
          <article>
            <div class="contenido">
              <h3>${this.escapar(d.titulo)}</h3>
              ${d.descripcion ? `<p>${this.escapar(d.descripcion)}</p>` : ""}
              ${campos.map(c => `<p><strong>${this.escapar(c.etiqueta)}:</strong> ${this.escapar(c.valor ?? "—")}</p>`).join("")}
            </div>
            ${d.boton ? `<button id="accion" type="button">${this.escapar(d.boton)}</button>` : ""}
          </article>`;
        const boton = this.shadowRoot.querySelector("#accion");
        if (boton) boton.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-accion", { detail: { datos: d }, bubbles: true, composed: true })));
    }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
}

customElements.define("galeno-tarjeta-simple", GalenoTarjetaSimple);
