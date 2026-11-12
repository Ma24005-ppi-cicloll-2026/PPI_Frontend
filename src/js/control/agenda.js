// Fechas de la agenda del dashboard: los rangos "Hoy / Pasado / Futuro / Rango" y la edad de un paciente.
class Agenda {

    static MODOS = ["Hoy", "Pasado", "Futuro", "Rango"];

    static inicioDelDia(fecha) { const d = new Date(fecha); d.setHours(0, 0, 0, 0); return d; }
    static finDelDia(fecha) { const d = new Date(fecha); d.setHours(23, 59, 59, 999); return d; }

    // Devuelve { desde, hasta } (null = sin limite).
    //   Hoy: de 00:00 a 23:59 de hoy · Pasado: antes de hoy · Futuro: despues de hoy
    //   Rango: lo que escribio el usuario (texto AAAA-MM-DD en `desde` y `hasta`, cualquiera puede faltar)
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

    // "2026-11-11" -> Date a mediodia local (asi la zona horaria no la corre de dia)
    static fecha(texto) {
        const [a, m, d] = String(texto).split("-").map(Number);
        return new Date(a, (m || 1) - 1, d || 1, 12, 0, 0);
    }

    static enRango(fecha, rango) {
        const f = GestorFechas.leer(fecha);
        if (!f) return false;
        return (!rango.desde || f >= rango.desde) && (!rango.hasta || f <= rango.hasta);
    }

    // Edad en años cumplidos; null si no hay fecha de nacimiento
    // Edad en años cumplidos; null si no hay fecha de nacimiento.
    // "1990-11-12" es solo un dia: se lee tal cual (sin zona horaria) para que el cumpleaños no se corra de dia.
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

    static hora(fecha) {
        const f = GestorFechas.leer(fecha);
        return f ? f.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—";
    }

    static dia(fecha) {
        const f = GestorFechas.leer(fecha);
        return f ? f.toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
    }
}
