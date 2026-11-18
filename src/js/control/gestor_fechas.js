class GestorFechas {
    // Interpreta el texto de JSON-B quitando el sufijo de zona entre corchetes.
    static leer(valor) {
        const d = new Date(String(valor).replace(/\[.*\]$/, ""));
        return isNaN(d) ? null : d;
    }
    // Formatea el día en UTC para conservar la fecha de origen.
    static aFecha(valor) {
        const d = valor ? GestorFechas.leer(valor) : null;
        return d ? d.toLocaleDateString("es-SV", { timeZone: "UTC" }) : "—";
    }
    // Formatea la fecha y la hora para mostrarlas en la interfaz.
    static aFechaHora(valor) {
        const d = valor ? GestorFechas.leer(valor) : null;
        return d ? d.toLocaleString("es-SV") : "—";
    }
}
