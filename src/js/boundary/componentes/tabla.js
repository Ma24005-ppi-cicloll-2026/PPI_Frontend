// <galeno-tabla>: el listado de cada entidad (una sola tabla para las 20 pantallas).
//   tabla.columnas = [ { campo: "nombres", titulo: "Nombres" },
//                      { campo: "idPersona", titulo: "Persona", formato: p => p?.nombres } ];
//   tabla.filas = await service.listar(0, 10);
// Emite "galeno-editar" y "galeno-eliminar" con { fila }.
// Con el atributo `solo-lectura` no dibuja los botones (listas que el cliente solo consulta).
class GalenoTabla extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._columnas = [];
        this._filas = [];
    }

    set columnas(v) { this._columnas = Array.isArray(v) ? v : []; this.pintar(); }
    set filas(v) { this._filas = Array.isArray(v) ? v : []; this.pintar(); }
    get filas() { return this._filas; }

    connectedCallback() { this.pintar(); }

    valor(fila, col) {
        const v = fila?.[col.campo];
        if (typeof col.formato === "function") return col.formato(v, fila);
        if (v === null || v === undefined || v === "") return "—";
        if (typeof v === "boolean") return v ? "Sí" : "No";
        return v;
    }

    pintar() {
        const raiz = this.shadowRoot;
        raiz.innerHTML = `
          <style>
            .marco { overflow-x:auto; }
            table { width:100%; border-collapse:collapse; font-family:inherit; background:#fff; color:#1D3461; }
            th { background:#1D3461; color:#fff; text-align:left; }
            th, td { padding:.5rem .7rem; border-bottom:1px solid #829CBC; }
            button { padding:.3rem .6rem; border:0; border-radius:.3rem; cursor:pointer; color:#fff; }
            .ed { background:#629DCB; } .el { background:#b3261e; }
            .vacio { padding:1rem; text-align:center; }
          </style>
          <div class="marco"><table>
            <thead><tr></tr></thead><tbody></tbody>
          </table></div>`;

        const cabecera = raiz.querySelector("thead tr");
        this._columnas.forEach(c => {
            const th = document.createElement("th");
            th.textContent = c.titulo ?? c.campo;
            cabecera.append(th);
        });
        const lectura = this.hasAttribute("solo-lectura");
        if (!lectura) cabecera.append(document.createElement("th"));   // columna de acciones

        const cuerpo = raiz.querySelector("tbody");
        if (this._filas.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = this._columnas.length + (lectura ? 0 : 1);
            td.className = "vacio";
            td.textContent = "No hay registros para mostrar";
            tr.append(td); cuerpo.append(tr);
            return;
        }
        this._filas.forEach(fila => {
            const tr = document.createElement("tr");
            this._columnas.forEach(c => {
                const td = document.createElement("td");
                td.textContent = this.valor(fila, c);   // textContent: seguro contra HTML
                tr.append(td);
            });
            if (!lectura) {
                const acciones = document.createElement("td");
                acciones.append(this.boton("Editar", "ed", "galeno-editar", fila),
                                this.boton("Eliminar", "el", "galeno-eliminar", fila));
                tr.append(acciones);
            }
            cuerpo.append(tr);
        });
    }

    boton(texto, clase, evento, fila) {
        const b = document.createElement("button");
        b.type = "button"; b.className = clase; b.textContent = texto;
        b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent(evento, { detail: { fila }, bubbles: true, composed: true })));
        return b;
    }
}

customElements.define("galeno-tabla", GalenoTabla);
