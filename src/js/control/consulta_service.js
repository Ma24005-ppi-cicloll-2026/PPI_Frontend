class ConsultaService extends DefaultService {
    // Vincula el servicio con su recurso REST.
    constructor(opciones) {
        super("consulta", opciones);
    }

    // Obtiene el PDF de la cita y conserva una copia para usar sin red.
    ticket(id) {
        const url = `${this.url}/${encodeURIComponent(id)}/ticket`;
        return this.solicitar(url, { headers: { Accept: "application/pdf" } })
            .then(r => {
                if (r.status === 404) throw new Error("La cita ya no existe");
                if (!r.ok) throw new Error("No se pudo generar el ticket (error " + r.status + ")");
                const disposicion = r.headers.get("Content-Disposition") ?? "";
                const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? "ticket-cita.pdf";
                return r.blob().then(blob => {
                    const ticket = { blob, nombre };
                    this.cache.guardar(url, ticket).catch(() => {});
                    return ticket;
                });
            })
            .catch(error => {
                if (!(error instanceof TypeError) && navigator.onLine !== false) throw error;
                return this.cache.leer(url).catch(() => null).then(guardado => {
                    if (guardado) return guardado;
                    throw new Error("El ticket no está guardado en este dispositivo y no hay conexión.");
                });
            });
    }

    // Descarga el ticket PDF generado por el servidor.
    descargarTicket(id) {
        return this.ticket(id).then(({ blob, nombre }) => {
            const direccion = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = direccion; a.download = nombre;
            document.body.append(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(direccion), 1000);
            return nombre;
        });
    }
}
