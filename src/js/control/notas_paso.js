class NotasPaso {

    // Construye la parte de la nota que identifica el paso.
    prefijo(numero) { return `Paso ${numero} (`; }

    // Reemplaza la línea de ese paso y conserva las demás observaciones.
    guardar(observaciones, numero, nombrePaso, autor, texto) {
        const lineas = this.lineas(observaciones).filter(l => !l.startsWith(this.prefijo(numero)));
        const nota = String(texto ?? "").replace(/\s*\n\s*/g, " / ").trim();
        if (nota) lineas.push(`${this.prefijo(numero)}${nombrePaso}) · ${autor}: ${nota}`);
        return lineas.sort((a, b) => this.numeroDe(a) - this.numeroDe(b)).join("\n");
    }

    // Extrae la nota que corresponde al número de paso.
    de(observaciones, numero) {
        const linea = this.lineas(observaciones).find(l => l.startsWith(this.prefijo(numero)));
        const m = linea && /^Paso \d+ \(.*?\) · .*?: (.*)$/.exec(linea);
        return m ? m[1].replace(/ \/ /g, "\n") : "";
    }

    // Separa las observaciones en líneas para localizar cada nota.
    lineas(observaciones) {
        return String(observaciones ?? "").split("\n").map(l => l.trim()).filter(Boolean);
    }

    // Extrae el número de paso del encabezado de la nota.
    numeroDe(linea) {
        const m = /^Paso (\d+) \(/.exec(linea);
        return m ? Number(m[1]) : 9999;
    }

    // Construye la parte de la nota que identifica una devolución.
    prefijoDevolucion(numero) { return `Devuelto ${numero} · `; }

    // Agrega el motivo por el que se devolvió el paso y reemplaza uno anterior.
    guardarDevolucion(observaciones, numero, autor, motivo) {
        const lineas = this.quitarDevolucion(observaciones, numero);
        const texto = String(motivo ?? "").replace(/\s*\n\s*/g, " / ").trim();
        return [lineas, `${this.prefijoDevolucion(numero)}${autor}: ${texto}`].filter(Boolean).join("\n");
    }

    // Lee quién devolvió el paso y por qué.
    devolucionDe(observaciones, numero) {
        const linea = this.lineas(observaciones).find(l => l.startsWith(this.prefijoDevolucion(numero)));
        const m = linea && /^Devuelto \d+ · (.*?): (.*)$/.exec(linea);
        return m ? { autor: m[1], motivo: m[2].replace(/ \/ /g, "\n") } : null;
    }

    // Borra el motivo de devolución cuando el paso se vuelve a completar.
    quitarDevolucion(observaciones, numero) {
        return this.lineas(observaciones).filter(l => !l.startsWith(this.prefijoDevolucion(numero))).join("\n");
    }
}
