class DatosClinica {

    // Recibe el lector de fechas y define los estados que maneja un paso.
    constructor({ fechas = new GestorFechas() } = {}) {
        this.fechas = fechas;
        this.pendiente = "Pendiente";
        this.enProceso = "En proceso";
        this.completado = "Completado";
        this.devuelto = "Devuelto";
        this.estadosPaso = [this.pendiente, this.enProceso, this.completado, this.devuelto].map(nombre => ({ nombre }));
    }

    // Construye el nombre con los datos disponibles de la persona.
    nombre(persona) {
        return `${persona?.nombres ?? ""} ${persona?.apellidos ?? ""}`.trim();
    }

    // Toma las dos primeras iniciales del nombre para el avatar.
    iniciales(nombre) {
        return String(nombre ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
            .map(p => p[0].toUpperCase()).join("") || "?";
    }

    // Prepara el texto para compararlo sin tildes ni diferencias de mayúsculas.
    normalizar(texto) {
        return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, " ").trim().toLowerCase();
    }

    // Comprueba si el registro pertenece a la clínica elegida.
    esDeClinica(personaRol, idClinica) {
        const clinica = personaRol?.idClinica?.idClinica;
        return !clinica || !idClinica || clinica === idClinica;
    }

    // Convierte una fecha a un valor comparable.
    milisegundos(fecha) {
        return this.fechas.leer(fecha)?.getTime() ?? 0;
    }

    // Ordena una copia de los registros por fecha descendente.
    masRecientePrimero(lista, campo) {
        return [...lista].sort((a, b) => this.milisegundos(b[campo]) - this.milisegundos(a[campo]));
    }
}
