class ApiCache {

    // Define la base de IndexedDB y cuántos días se conserva cada respuesta.
    constructor({ base = "galeno-api-cache", version = 1, almacen = "respuestas", dias = 7 } = {}) {
        this.base = base;
        this.version = version;
        this.almacen = almacen;
        this.maxEdadMs = dias * 24 * 60 * 60 * 1000;
    }

    // Abre IndexedDB y crea el almacén de respuestas si falta.
    abrir() {
        if (!("indexedDB" in globalThis)) return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            const solicitud = indexedDB.open(this.base, this.version);
            solicitud.onupgradeneeded = () => {
                const db = solicitud.result;
                if (!db.objectStoreNames.contains(this.almacen))
                    db.createObjectStore(this.almacen, { keyPath: "url" });
            };
            solicitud.onsuccess = () => resolve(solicitud.result);
            solicitud.onerror = () => reject(solicitud.error);
        });
    }

    // Abre la base, ejecuta la operación y la cierra al terminar.
    conBase(operacion, sinBase) {
        return this.abrir().then(db => {
            if (!db) return sinBase;
            return operacion(db).finally(() => db.close());
        });
    }

    // Recupera una copia local si todavía está dentro de los siete días.
    leer(url) {
        return this.conBase(db => new Promise((resolve, reject) => {
            const solicitud = db.transaction(this.almacen, "readonly").objectStore(this.almacen).get(url);
            solicitud.onsuccess = () => resolve(solicitud.result ?? null);
            solicitud.onerror = () => reject(solicitud.error);
        }).then(dato => (!dato || Date.now() - dato.guardado > this.maxEdadMs) ? null : dato.valor), null);
    }

    // Completa una transacción de escritura y avisa cuando termina.
    escribir(db, cambio) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.almacen, "readwrite");
            cambio(tx.objectStore(this.almacen));
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    // Guarda la respuesta con su fecha para poder comprobar el vencimiento.
    guardar(url, valor) {
        return this.conBase(db => this.escribir(db, s => s.put({ url, valor, guardado: Date.now() })), false);
    }

    // Vacía las copias locales cuando termina la sesión.
    limpiar() {
        return this.conBase(db => this.escribir(db, s => s.clear()).then(() => undefined), undefined);
    }
}
