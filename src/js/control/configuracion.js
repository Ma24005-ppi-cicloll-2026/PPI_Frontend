class Configuracion {

    // Lee la dirección del API desde index.html para no fijarla en el código.
    constructor(documento = globalThis.document) {
        const meta = nombre => documento?.querySelector?.(`meta[name="${nombre}"]`)?.content ?? "";
        this.api = meta("galeno-api");
        this.tamanoPagina = Number(meta("galeno-pagina")) || 500;
    }
}
