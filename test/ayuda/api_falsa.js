class ApiFalsa {

    // Copia los datos de prueba y sustituye fetch por el API simulado.
    constructor(bd) {
        this.bd = JSON.parse(JSON.stringify(bd));
        this.llamadas = [];
        this.contador = 0;
        this.stub = sinon.stub(window, "fetch").callsFake((url, op) => this.responder(url, op || {}));
    }

    // Restaura la implementación original al terminar la prueba.
    restaurar() { this.stub.restore(); }

    // Filtra las solicitudes registradas por método y ruta.
    enviados(metodo, ruta) { return this.llamadas.filter(l => l.metodo === metodo && l.ruta === ruta); }

    // Simula una respuesta del API y registra sus escrituras.
    async responder(url, op) {
        const [ruta, id] = url.split("/resources/")[1].split("?")[0].split("/");
        const metodo = op.method || "GET";
        if (metodo === "POST") {
            const cuerpo = JSON.parse(op.body);
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

const Ayuda = {
    // Simula la entrada de texto y notifica el cambio.
    escribir(campo, texto) {
        const i = campo.shadowRoot.querySelector("input, textarea"); i.value = texto; i.dispatchEvent(new Event("input"));
    },
    // Selecciona la opción indicada.
    elegir(selector, indice) {
        const s = selector.shadowRoot.querySelector("select"); s.value = String(indice); s.dispatchEvent(new Event("change"));
    },
    // Selecciona un tipo de documento por su nombre.
    tipo(buscador, nombre) {
        const q = buscador.shadowRoot.querySelector("#q"); q.value = nombre; q.dispatchEvent(new Event("input"));
        buscador.shadowRoot.querySelector("li").click();
    },
    // Pulsa el control indicado dentro del componente.
    clic(el, selector) { el.shadowRoot.querySelector(selector).click(); },
    // Obtiene las etiquetas que renderizó el componente.
    textos(el, selector) { return [...el.shadowRoot.querySelectorAll(selector)].map(x => x.textContent.trim()); }
};
