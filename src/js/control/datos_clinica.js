class DatosClinica {

    // Construye el nombre con los datos disponibles de la persona.
    static nombre(persona) {
        return `${persona?.nombres ?? ""} ${persona?.apellidos ?? ""}`.trim();
    }

    // Prepara el texto para compararlo sin tildes ni diferencias de mayúsculas.
    static normalizar(texto) {
        return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, " ").trim().toLowerCase();
    }

    // Comprueba si el registro pertenece a la clínica elegida.
    static esDeClinica(personaRol, idClinica) {
        const clinica = personaRol?.idClinica?.idClinica;
        return !clinica || !idClinica || clinica === idClinica;
    }

    // Convierte una fecha a un valor comparable.
    static milisegundos(fecha) {
        return GestorFechas.leer(fecha)?.getTime() ?? 0;
    }

    // Ordena una copia de los registros por fecha descendente.
    static masRecientePrimero(lista, campo) {
        return [...lista].sort((a, b) => DatosClinica.milisegundos(b[campo]) - DatosClinica.milisegundos(a[campo]));
    }
}

DatosClinica.ESTADOS_PASO = [{ nombre: "Pendiente" }, { nombre: "En proceso" }, { nombre: "Completado" }];
DatosClinica.COMPLETADO = "Completado";
