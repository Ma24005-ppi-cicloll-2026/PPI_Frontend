class NotasPaso {

    // Construye la parte de la nota que identifica el paso.
    static prefijo(numero) { return `Paso ${numero} (`; }

    // Reemplaza la línea de ese paso y conserva las demás observaciones.
    static guardar(observaciones, numero, nombrePaso, autor, texto) {
        const lineas = NotasPaso.lineas(observaciones).filter(l => !l.startsWith(NotasPaso.prefijo(numero)));
        const nota = String(texto ?? "").replace(/\s*\n\s*/g, " / ").trim();
        if (nota) lineas.push(`${NotasPaso.prefijo(numero)}${nombrePaso}) · ${autor}: ${nota}`);
        return lineas.sort((a, b) => NotasPaso.numeroDe(a) - NotasPaso.numeroDe(b)).join("\n");
    }

    // Extrae la nota que corresponde al número de paso.
    static de(observaciones, numero) {
        const linea = NotasPaso.lineas(observaciones).find(l => l.startsWith(NotasPaso.prefijo(numero)));
        const m = linea && /^Paso \d+ \(.*?\) · .*?: (.*)$/.exec(linea);
        return m ? m[1].replace(/ \/ /g, "\n") : "";
    }

    // Separa las observaciones en líneas para localizar cada nota.
    static lineas(observaciones) {
        return String(observaciones ?? "").split("\n").map(l => l.trim()).filter(Boolean);
    }

    // Extrae el número de paso del encabezado de la nota.
    static numeroDe(linea) {
        const m = /^Paso (\d+) \(/.exec(linea);
        return m ? Number(m[1]) : 9999;
    }
}
