class Agenda {

    static MODOS = ["Hoy", "Pasado", "Futuro", "Rango"];

    // Devuelve el primer instante del día en la zona local.
    static inicioDelDia(fecha) { const d = new Date(fecha); d.setHours(0, 0, 0, 0); return d; }
    // Devuelve el último instante del día en la zona local.
    static finDelDia(fecha) { const d = new Date(fecha); d.setHours(23, 59, 59, 999); return d; }

    // Calcula los límites del filtro según el modo elegido.
    static rango(modo, desde = "", hasta = "", ahora = new Date()) {
        switch (modo) {
            case "Pasado": return { desde: null, hasta: new Date(Agenda.inicioDelDia(ahora).getTime() - 1) };
            case "Futuro": return { desde: new Date(Agenda.finDelDia(ahora).getTime() + 1), hasta: null };
            case "Rango": return {
                desde: desde ? Agenda.inicioDelDia(Agenda.fecha(desde)) : null,
                hasta: hasta ? Agenda.finDelDia(Agenda.fecha(hasta)) : null };
            default: return { desde: Agenda.inicioDelDia(ahora), hasta: Agenda.finDelDia(ahora) };
        }
    }

    // Convierte una fecha del formulario a mediodía local.
    static fecha(texto) {
        const [a, m, d] = String(texto).split("-").map(Number);
        return new Date(a, (m || 1) - 1, d || 1, 12, 0, 0);
    }

    // Comprueba si la fecha cae dentro de los límites indicados.
    static enRango(fecha, rango) {
        const f = GestorFechas.leer(fecha);
        if (!f) return false;
        return (!rango.desde || f >= rango.desde) && (!rango.hasta || f <= rango.hasta);
    }

    // Calcula los años cumplidos usando la fecha de nacimiento.
    static edad(nacimiento, hoy = new Date()) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nacimiento ?? ""));
        let a, mes, dia;
        if (m) { a = Number(m[1]); mes = Number(m[2]) - 1; dia = Number(m[3]); }
        else {
            const n = GestorFechas.leer(nacimiento);
            if (!n) return null;
            a = n.getFullYear(); mes = n.getMonth(); dia = n.getDate();
        }
        const cumplio = hoy.getMonth() > mes || (hoy.getMonth() === mes && hoy.getDate() >= dia);
        return hoy.getFullYear() - a - (cumplio ? 0 : 1);
    }

    // Formatea la hora para mostrarla en la agenda.
    static hora(fecha) {
        const f = GestorFechas.leer(fecha);
        return f ? f.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—";
    }

    // Formatea el día para mostrarlo en la agenda.
    static dia(fecha) {
        const f = GestorFechas.leer(fecha);
        return f ? f.toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
    }
}
