class ConsultaService extends DefaultService {
    constructor() {
        super("consulta");   // la misma ruta del @Path del resource
    }

    // GET /consulta/{id}/ticket -> el PDF de la cita, generado por el backend.
    // Devuelve { blob, nombre } (nombre sale de Content-Disposition; si no viene, uno por defecto).
    async ticket(id) {
        const url = `${this.url}/${encodeURIComponent(id)}/ticket`;
        try {
            const r = await fetch(url, { headers: { Accept: "application/pdf" } });
            window.dispatchEvent(new CustomEvent("galeno-api-disponible"));
            if (r.status === 404) throw new Error("La cita ya no existe");
            if (!r.ok) throw new Error("No se pudo generar el ticket (error " + r.status + ")");
            const disposicion = r.headers.get("Content-Disposition") ?? "";
            const ticket = { blob: await r.blob(), nombre: /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? "ticket-cita.pdf" };
            ApiCache.guardar(url, ticket).catch(() => {}); // no bloquear la descarga por almacenamiento local
            return ticket;
        } catch (error) {
            if (!(error instanceof TypeError) && navigator.onLine !== false) throw error;
            const guardado = await ApiCache.leer(url).catch(() => null);
            if (guardado) return guardado;
            throw new Error("El ticket no está guardado en este dispositivo y no hay conexión.");
        }
    }

    // Baja el PDF: lo ofrece al navegador como una descarga.
    async descargarTicket(id) {
        const { blob, nombre } = await this.ticket(id);
        const direccion = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = direccion; a.download = nombre;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(direccion), 1000);
        return nombre;
    }
}
