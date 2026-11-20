// Moldes de la interfaz: el HTML vive en src/plantillas/*.html dentro de etiquetas <template>
// y aquí solo se cargan, se clonan y se llenan con textContent (nunca con innerHTML).
class Plantillas {

    // Recibe el documento donde se registran los moldes y la lista de archivos que los contienen.
    constructor({ documento = globalThis.document,
                  archivos = ["formularios.html", "estructura.html", "instalacion.html", "consultas.html", "pantallas.html"] } = {}) {
        this.documento = documento;
        this.archivos = archivos;
    }

    // Descarga los archivos de plantillas y registra sus <template> en el documento.
    cargar(base = "plantillas/") {
        return Promise.all(this.archivos.map(nombre => fetch(base + nombre).then(r => {
            if (!r.ok) throw new Error("No se pudo cargar la plantilla " + nombre);
            return r.text();
        }))).then(textos => textos.forEach(texto => this.registrar(texto)));
    }

    // Lee un archivo HTML y copia sus <template> al documento (una sola vez cada uno).
    registrar(texto) {
        const archivo = new DOMParser().parseFromString(texto, "text/html");
        archivo.querySelectorAll("template[id]").forEach(t => {
            if (this.documento.getElementById(t.id)) return;
            this.quitarSangria(t.content);
            this.documento.head.append(this.documento.importNode(t, true));
        });
    }

    // Quita los saltos de línea y espacios que solo sirven para ordenar el archivo HTML.
    quitarSangria(nodo) {
        [...nodo.childNodes].forEach(hijo => {
            if (hijo.nodeType === Node.TEXT_NODE && !hijo.textContent.trim()) hijo.remove();
            else if (hijo.nodeType === Node.ELEMENT_NODE && hijo.localName !== "style") this.quitarSangria(hijo);
        });
    }

    // Devuelve una copia del molde lista para insertar.
    clonar(id) {
        const molde = this.documento.getElementById(id);
        if (!(molde instanceof HTMLTemplateElement)) throw new Error("Falta la plantilla " + id);
        return molde.content.cloneNode(true);
    }

    // Pone cada dato como texto en el elemento marcado con data-campo="nombre".
    llenar(raiz, datos) {
        raiz.querySelectorAll("[data-campo]").forEach(n => { n.textContent = datos[n.dataset.campo] ?? ""; });
        return raiz;
    }
}
