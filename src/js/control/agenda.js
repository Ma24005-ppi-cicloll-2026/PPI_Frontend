class Agenda {

    // Recibe el lector de fechas y define los modos del filtro de fechas.
    constructor({ fechas = new GestorFechas() } = {}) {
        this.fechas = fechas;
        this.modos = ["Hoy", "Pasado", "Futuro", "Rango"];
    }

    // Devuelve el primer instante del día en la zona local.
    inicioDelDia(fecha) { const d = new Date(fecha); d.setHours(0, 0, 0, 0); return d; }
    // Devuelve el último instante del día en la zona local.
    finDelDia(fecha) { const d = new Date(fecha); d.setHours(23, 59, 59, 999); return d; }

    // Calcula los límites del filtro según el modo elegido.
    rango(modo, desde = "", hasta = "", ahora = new Date()) {
        switch (modo) {
            case "Pasado": return { desde: null, hasta: new Date(this.inicioDelDia(ahora).getTime() - 1) };
            case "Futuro": return { desde: new Date(this.finDelDia(ahora).getTime() + 1), hasta: null };
            case "Rango": return {
                desde: desde ? this.inicioDelDia(this.fecha(desde)) : null,
                hasta: hasta ? this.finDelDia(this.fecha(hasta)) : null };
            default: return { desde: this.inicioDelDia(ahora), hasta: this.finDelDia(ahora) };
        }
    }

    // Convierte una fecha del formulario a mediodía local.
    fecha(texto) {
        const [a, m, d] = String(texto).split("-").map(Number);
        return new Date(a, (m || 1) - 1, d || 1, 12, 0, 0);
    }

    // Comprueba si la fecha cae dentro de los límites indicados.
    enRango(fecha, rango) {
        const f = this.fechas.leer(fecha);
        if (!f) return false;
        return (!rango.desde || f >= rango.desde) && (!rango.hasta || f <= rango.hasta);
    }

    // Calcula los años cumplidos usando la fecha de nacimiento.
    edad(nacimiento, hoy = new Date()) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nacimiento ?? ""));
        let a, mes, dia;
        if (m) { a = Number(m[1]); mes = Number(m[2]) - 1; dia = Number(m[3]); }
        else {
            const n = this.fechas.leer(nacimiento);
            if (!n) return null;
            a = n.getFullYear(); mes = n.getMonth(); dia = n.getDate();
        }
        const cumplio = hoy.getMonth() > mes || (hoy.getMonth() === mes && hoy.getDate() >= dia);
        return hoy.getFullYear() - a - (cumplio ? 0 : 1);
    }

    // Formatea la hora para mostrarla en la agenda.
    hora(fecha) {
        const f = this.fechas.leer(fecha);
        return f ? f.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—";
    }

    // Formatea el día para mostrarlo en la agenda.
    dia(fecha) {
        const f = this.fechas.leer(fecha);
        return f ? f.toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
    }
}
