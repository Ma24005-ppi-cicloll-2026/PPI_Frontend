// Copia JSON del API en IndexedDB para consultar el último dato recibido sin red.
// Solo guarda respuestas GET correctas; nunca guarda credenciales ni escrituras pendientes.
class ApiCache {
    static BASE = "galeno-api-cache";
    static VERSION = 1;
    static STORE = "respuestas";
    static MAX_EDAD_MS = 7 * 24 * 60 * 60 * 1000;

    static abrir() {
        if (!("indexedDB" in globalThis)) return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            const solicitud = indexedDB.open(ApiCache.BASE, ApiCache.VERSION);
            solicitud.onupgradeneeded = () => {
                const db = solicitud.result;
                if (!db.objectStoreNames.contains(ApiCache.STORE))
                    db.createObjectStore(ApiCache.STORE, { keyPath: "url" });
            };
            solicitud.onsuccess = () => resolve(solicitud.result);
            solicitud.onerror = () => reject(solicitud.error);
        });
    }

    static async leer(url) {
        const db = await ApiCache.abrir();
        if (!db) return null;
        try {
            const dato = await new Promise((resolve, reject) => {
                const tx = db.transaction(ApiCache.STORE, "readonly");
                const solicitud = tx.objectStore(ApiCache.STORE).get(url);
                solicitud.onsuccess = () => resolve(solicitud.result ?? null);
                solicitud.onerror = () => reject(solicitud.error);
            });
            if (!dato || Date.now() - dato.guardado > ApiCache.MAX_EDAD_MS) return null;
            return dato.valor;
        } finally { db.close(); }
    }

    static async guardar(url, valor) {
        const db = await ApiCache.abrir();
        if (!db) return false;
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(ApiCache.STORE, "readwrite");
                tx.objectStore(ApiCache.STORE).put({ url, valor, guardado: Date.now() });
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
            return true;
        } finally { db.close(); }
    }

    static async limpiar() {
        const db = await ApiCache.abrir();
        if (!db) return;
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(ApiCache.STORE, "readwrite");
                tx.objectStore(ApiCache.STORE).clear();
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } finally { db.close(); }
    }
}
