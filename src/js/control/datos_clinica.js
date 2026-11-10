// Funciones pequeñas que usan varias pantallas (nombres, fechas, clinica de la sesion).
class DatosClinica {

    static nombre(persona) {
        return `${persona?.nombres ?? ""} ${persona?.apellidos ?? ""}`.trim();
    }

    // "José  Pérez" y "jose perez" son el mismo nombre
    static normalizar(texto) {
        return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, " ").trim().toLowerCase();
    }

    // Si el dato de la clinica no vino en el JSON no se descarta (no hay con que comparar).
    static esDeClinica(personaRol, idClinica) {
        const clinica = personaRol?.idClinica?.idClinica;
        return !clinica || !idClinica || clinica === idClinica;
    }

    static milisegundos(fecha) {
        return GestorFechas.leer(fecha)?.getTime() ?? 0;
    }

    static masRecientePrimero(lista, campo) {
        return [...lista].sort((a, b) => DatosClinica.milisegundos(b[campo]) - DatosClinica.milisegundos(a[campo]));
    }
}

// Estados que puede tener un paso de un procedimiento (si su base de datos usa otros nombres, cambielos aqui)
DatosClinica.ESTADOS_PASO = [{ nombre: "Pendiente" }, { nombre: "En proceso" }, { nombre: "Completado" }];
DatosClinica.COMPLETADO = "Completado";
