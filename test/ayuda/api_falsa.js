// Backend falso para las pruebas de las pantallas: responde los GET con las listas de BD, y guarda en
// "llamadas" cada POST y PUT (y los aplica a BD para que la pantalla vea el cambio al recargar).
//   const api = new ApiFalsa({ consulta: [...], procedimiento: [...] });
//   api.llamadas        -> [{ metodo: "POST", ruta: "consulta", cuerpo: {...} }, ...]
//   api.restaurar()     -> devuelve fetch a la normalidad
class ApiFalsa {

    constructor(bd) {
        this.bd = JSON.parse(JSON.stringify(bd));
        this.llamadas = [];
        this.contador = 0;
        this.stub = sinon.stub(window, "fetch").callsFake((url, op) => this.responder(url, op || {}));
    }

    restaurar() { this.stub.restore(); }

    enviados(metodo, ruta) { return this.llamadas.filter(l => l.metodo === metodo && l.ruta === ruta); }

    async responder(url, op) {
        const [ruta, id] = url.split("/resources/")[1].split("?")[0].split("/");
        const metodo = op.method || "GET";
        if (metodo === "POST") {
            const cuerpo = JSON.parse(op.body);
            // la ruta "consulta_procedimiento" crea el id "idConsultaProcedimiento", como el backend
            const nombreId = "id" + ruta.split("_").map(x => x[0].toUpperCase() + x.slice(1)).join("");
            const creado = { ...cuerpo, [nombreId]: `${ruta}-nuevo-${++this.contador}` };
            this.llamadas.push({ metodo, ruta, cuerpo });
            (this.bd[ruta] = this.bd[ruta] || []).push(creado);
            return new Response(JSON.stringify(creado), { status: 201 });
        }
        if (metodo === "PUT") {
            const cuerpo = JSON.parse(op.body);
            this.llamadas.push({ metodo, ruta, id, cuerpo });
            const lista = this.bd[ruta] || [];
            const i = lista.findIndex(x => Object.values(x).includes(id));
            if (i >= 0) lista[i] = cuerpo;
            return new Response(op.body, { status: 200 });
        }
        const lista = this.bd[ruta] || [];
        if (id) {
            const uno = lista.find(x => Object.values(x).includes(id));
            return uno ? new Response(JSON.stringify(uno), { status: 200 }) : new Response("", { status: 404 });
        }
        return new Response(JSON.stringify(lista), { status: 200 });
    }
}

// Ayudas para llenar pantallas con componentes (shadow DOM)
const Ayuda = {
    esperar: (veces = 8) => (async () => { for (let i = 0; i < veces; i++) await new Promise(r => setTimeout(r, 0)); })(),
    escribir(campo, texto) {                               // <galeno-campo>
        const i = campo.shadowRoot.querySelector("input, textarea"); i.value = texto; i.dispatchEvent(new Event("input"));
    },
    elegir(selector, indice) {                             // <galeno-selector>: elige la opcion `indice`
        const s = selector.shadowRoot.querySelector("select"); s.value = String(indice); s.dispatchEvent(new Event("change"));
    },
    tipo(buscador, nombre) {                               // <galeno-buscador-tipo-documentos>: elige por nombre
        const q = buscador.shadowRoot.querySelector("#q"); q.value = nombre; q.dispatchEvent(new Event("input"));
        buscador.shadowRoot.querySelector("li").click();
    },
    clic(el, selector) { el.shadowRoot.querySelector(selector).click(); },
    textos(el, selector) { return [...el.shadowRoot.querySelectorAll(selector)].map(x => x.textContent.trim()); }
};
