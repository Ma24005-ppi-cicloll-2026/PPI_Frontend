// <galeno-modal-confirmacion>: pregunta "¿seguro?" antes de eliminar.
//   modal.abrir("¿Eliminar este registro?");
//   modal.addEventListener("galeno-confirmar", () => service.eliminar(id));
// No elimina nada por si solo: solo avisa al Model con eventos.
class GalenoModalConfirmacion extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
          <style>
            #fondo { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex;
                     align-items:center; justify-content:center; z-index:900; }
            #fondo[hidden] { display:none; }
            section { background:#EEF5FB; color:#1D3461; padding:1.2rem; border-radius:.6rem;
                      max-width:24rem; font-family:inherit; }
            button { padding:.5rem .9rem; border:0; border-radius:.4rem; cursor:pointer; margin-left:.4rem; }
            #si { background:#b3261e; color:#fff; }
            #no { background:#829CBC; color:#fff; }
            div { text-align:right; margin-top:1rem; }
          </style>
          <div id="fondo" hidden>
            <section role="alertdialog" aria-modal="true">
              <h3 id="titulo"></h3><p id="mensaje"></p>
              <div><button id="no" type="button">Cancelar</button>
                   <button id="si" type="button">Confirmar</button></div>
            </section>
          </div>`;
        this.shadowRoot.querySelector("#no").addEventListener("click", () => {
            this.cerrar();
            this.dispatchEvent(new CustomEvent("galeno-cancelar", { bubbles: true, composed: true }));
        });
        this.shadowRoot.querySelector("#si").addEventListener("click", () => {
            this.cerrar();
            this.dispatchEvent(new CustomEvent("galeno-confirmar", { bubbles: true, composed: true }));
        });
    }

    abrir(mensaje = "¿Desea continuar?", titulo = "Confirmar") {
        this.shadowRoot.querySelector("#titulo").textContent = titulo;
        this.shadowRoot.querySelector("#mensaje").textContent = mensaje;
        this.shadowRoot.querySelector("#fondo").hidden = false;
    }

    cerrar() {
        this.shadowRoot.querySelector("#fondo").hidden = true;
    }
}

customElements.define("galeno-modal-confirmacion", GalenoModalConfirmacion);
