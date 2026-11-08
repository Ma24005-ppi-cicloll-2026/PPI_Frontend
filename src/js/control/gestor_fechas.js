// Convierte las fechas que manda el backend para mostrarlas.
// JSON-B las manda como "2026-11-04T15:17:01Z[UTC]" y JavaScript no entiende el "[UTC]".
class GestorFechas {
    static leer(valor) {
        const d = new Date(String(valor).replace(/\[.*\]$/, ""));
        return isNaN(d) ? null : d;
    }
    // solo dia (fecha de nacimiento): se lee en UTC para que no salte un dia
    static aFecha(valor) {
        const d = valor ? GestorFechas.leer(valor) : null;
        return d ? d.toLocaleDateString("es-SV", { timeZone: "UTC" }) : "—";
    }
    // fecha y hora (consultas, procedimientos)
    static aFechaHora(valor) {
        const d = valor ? GestorFechas.leer(valor) : null;
        return d ? d.toLocaleString("es-SV") : "—";
    }
}
