// Las notas que se escriben en un paso. El backend no tiene un campo de notas por paso, asi que se guardan en
// las observaciones del ConsultaProcedimiento, una linea por paso:
//     Paso 2 (Consulta médica) · Dr. Carlos Gómez: Dolor de cabeza desde hace dos dias
// Si un paso se guarda otra vez, su linea se reemplaza (no se duplica).
class NotasPaso {

    static prefijo(numero) { return `Paso ${numero} (`; }

    // Agrega o reemplaza la linea del paso `numero` y devuelve las observaciones nuevas.
    static guardar(observaciones, numero, nombrePaso, autor, texto) {
        const lineas = NotasPaso.lineas(observaciones).filter(l => !l.startsWith(NotasPaso.prefijo(numero)));
        const nota = String(texto ?? "").replace(/\s*\n\s*/g, " / ").trim();
        if (nota) lineas.push(`${NotasPaso.prefijo(numero)}${nombrePaso}) · ${autor}: ${nota}`);
        return lineas.sort((a, b) => NotasPaso.numeroDe(a) - NotasPaso.numeroDe(b)).join("\n");
    }

    // La nota (solo el texto) del paso `numero`, o "" si no tiene.
    static de(observaciones, numero) {
        const linea = NotasPaso.lineas(observaciones).find(l => l.startsWith(NotasPaso.prefijo(numero)));
        const m = linea && /^Paso \d+ \(.*?\) · .*?: (.*)$/.exec(linea);
        return m ? m[1].replace(/ \/ /g, "\n") : "";
    }

    static lineas(observaciones) {
        return String(observaciones ?? "").split("\n").map(l => l.trim()).filter(Boolean);
    }

    static numeroDe(linea) {
        const m = /^Paso (\d+) \(/.exec(linea);
        return m ? Number(m[1]) : 9999;     // las lineas que no son de un paso van al final
    }
}
