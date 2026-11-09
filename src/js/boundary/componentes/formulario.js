// <galeno-formulario>: el formulario de crear/editar de cualquier entidad.
// El Model solo describe los campos; el componente dibuja y recoge los valores.
//   form.campos = [
//     { nombre: "nombres",   etiqueta: "Nombres",   tipo: "texto", requerido: true },
//     { nombre: "fechaNacimiento", etiqueta: "Nacimiento", tipo: "fecha" },
//     { nombre: "activo",    etiqueta: "Activo",    tipo: "casilla" },
//     { nombre: "idPersona", etiqueta: "Persona",   tipo: "relacion",
//       opciones: personas, formatoTexto: p => p.nombres + " " + p.apellidos }
//   ];
//   form.valores = registro;           // para editar (o {} para crear)
// Tipos: texto, area, fecha, fechahora, casilla, relacion.
// Eventos: "galeno-guardar" { datos }  y  "galeno-cancelar".
class GalenoFormulario extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._campos = [];
        this._valores = {};
        this._relaciones = {};     // nombre del campo -> objeto elegido
    }

    set campos(v) { this._campos = Array.isArray(v) ? v : []; this.pintar(); }
    set valores(v) { this._valores = v ? { ...v } : {}; this.pintar(); }

    connectedCallback() { this.pintar(); }

    // el input datetime-local/date necesita "YYYY-MM-DDTHH:mm" o "YYYY-MM-DD"
    paraInput(valor, tipo) {
        if (!valor) return "";
        const d = new Date(String(valor).replace(/\[.*\]$/, ""));   // quita el "[UTC]" del backend
        if (isNaN(d)) return "";
        const p = n => String(n).padStart(2, "0");
        if (tipo === "fecha")   // solo fecha: se guarda a medianoche UTC, se lee en UTC (si no, salta un dia)
            return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    pintar() {
        const raiz = this.shadowRoot;
        raiz.innerHTML = `
          <style>
            form { display:grid; gap:.8rem; font-family:inherit; color:#1D3461;
                   background:#EEF5FB; padding:1rem; border-radius:.6rem; }
            label { display:grid; gap:.25rem; font-weight:600; }
            input:not([type=checkbox]), textarea { padding:.5rem; border:1px solid #829CBC;
                   border-radius:.4rem; font:inherit; }
            .check { display:flex; gap:.5rem; align-items:center; }
            .botones { display:flex; gap:.5rem; justify-content:flex-end; }
            button { padding:.5rem 1rem; border:0; border-radius:.4rem; cursor:pointer; color:#fff; }
            #guardar { background:#1D3461; } #cancelar { background:#829CBC; }
          </style>
          <form novalidate></form>`;
        const form = raiz.querySelector("form");
        this._relaciones = {};

        this._campos.forEach(c => {
            const valor = this._valores[c.nombre];
            if (c.tipo === "relacion") {
                const sel = document.createElement("galeno-autocomplete");
                sel.setAttribute("label", c.etiqueta);
                sel.dataset.campo = c.nombre;
                sel.formatoTexto = c.formatoTexto;
                sel.opciones = c.opciones || [];
                if (valor) { sel.seleccionar(valor); this._relaciones[c.nombre] = valor; }
                sel.addEventListener("galeno-seleccion", e => { this._relaciones[c.nombre] = e.detail.valor; });
                form.append(sel);
                return;
            }
            const label = document.createElement("label");
            let entrada;
            if (c.tipo === "area") {
                entrada = document.createElement("textarea"); entrada.rows = 3;
                entrada.value = valor ?? "";
            } else {
                entrada = document.createElement("input");
                entrada.type = { texto: "text", fecha: "date", fechahora: "datetime-local",
                                 casilla: "checkbox" }[c.tipo || "texto"] || "text";
                if (c.tipo === "casilla") entrada.checked = valor === true;
                else if (c.tipo === "fecha" || c.tipo === "fechahora") entrada.value = this.paraInput(valor, c.tipo);
                else entrada.value = valor ?? "";
            }
            entrada.name = c.nombre;
            if (c.requerido) entrada.required = true;
            if (c.tipo === "casilla") {
                label.className = "check"; label.append(entrada, c.etiqueta);
            } else {
                label.append(c.etiqueta + (c.requerido ? " *" : ""), entrada);
            }
            form.append(label);
        });

        const botones = document.createElement("div");
        botones.className = "botones";
        botones.innerHTML = `<button id="cancelar" type="button">Cancelar</button>
                             <button id="guardar" type="submit">Guardar</button>`;
        form.append(botones);

        botones.querySelector("#cancelar").addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-cancelar", { bubbles: true, composed: true })));
        form.addEventListener("submit", e => { e.preventDefault(); this.guardar(form); });
    }

    guardar(form) {
        if (!form.reportValidity()) return;               // respeta los "requerido"
        const datos = { ...this._valores };               // conserva el id y lo que no se edita
        const faltantes = [];
        this._campos.forEach(c => {
            if (c.tipo === "relacion") {
                datos[c.nombre] = this._relaciones[c.nombre] ?? null;
                if (c.requerido && !datos[c.nombre]) faltantes.push(c.etiqueta);
                return;
            }
            const entrada = form.elements[c.nombre];
            if (c.tipo === "casilla") datos[c.nombre] = entrada.checked;
            else if (c.tipo === "fecha" || c.tipo === "fechahora")
                datos[c.nombre] = entrada.value ? new Date(entrada.value).toISOString() : null;
            else datos[c.nombre] = entrada.value;
        });
        if (faltantes.length) {
            alert("Falta seleccionar: " + faltantes.join(", "));
            return;
        }
        this.dispatchEvent(new CustomEvent("galeno-guardar", { detail: { datos }, bubbles: true, composed: true }));
    }
}

customElements.define("galeno-formulario", GalenoFormulario);
