// Crea un PDF sencillo (texto en hoja carta/A4) usando solo JavaScript: sin librerias.
// Un PDF es un texto con una estructura fija: objetos numerados + una tabla (xref) que dice en que
// posicion empieza cada objeto. Aqui se arma ese texto y se convierte a bytes.
//
//   const bytes = new GeneradorPdf().generar({
//       titulo: "Resumen de consulta",
//       subtitulo: "Paciente: Ana Lopez",
//       secciones: [ { titulo: "Datos", filas: [["Inicio", "04/11/2026"], ["Fin", "En curso"]] },
//                    { titulo: "Notas", filas: [] } ],
//       pie: "GalenoSV"
//   });
//   GeneradorPdf.descargar(bytes, "resumen.pdf");
class GeneradorPdf {

    constructor({ ancho = 595.28, alto = 841.89, margen = 50, columnaEtiqueta = 130 } = {}) {
        this.ancho = ancho; this.alto = alto; this.margen = margen; this.columnaEtiqueta = columnaEtiqueta;
        this.interlineado = 15;
    }

    // ---------- texto ----------

    // Un PDF con fuente estandar entiende bytes (WinAnsi ~ Latin-1): tildes y ñ valen; lo demas se cambia por "?"
    codificar(texto) {
        return String(texto ?? "").replace(/[\r\n\t]+/g, " ")
            .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-")
            .replace(/[^\x20-\xFF]/g, "?")
            .replace(/[\\()]/g, c => "\\" + c);          // \ ( ) tienen significado especial en un PDF
    }

    // Partir un texto largo en renglones. Helvetica mide ~0.5 del tamaño de letra de promedio.
    partir(texto, anchoDisponible, tamano) {
        const maxCaracteres = Math.max(8, Math.floor(anchoDisponible / (tamano * 0.5)));
        const palabras = String(texto ?? "").split(/\s+/).filter(Boolean);
        const renglones = [];
        let actual = "";
        palabras.forEach(p => {
            while (p.length > maxCaracteres) {            // palabra gigante: se corta
                if (actual) { renglones.push(actual); actual = ""; }
                renglones.push(p.slice(0, maxCaracteres)); p = p.slice(maxCaracteres);
            }
            if ((actual + " " + p).trim().length > maxCaracteres) { renglones.push(actual); actual = p; }
            else actual = (actual + " " + p).trim();
        });
        if (actual) renglones.push(actual);
        return renglones.length ? renglones : [""];
    }

    // ---------- diseño: convierte los datos en "lineas" ubicadas en paginas ----------

    // cada instruccion: { x, y, fuente: "F1"|"F2", tamano, texto }  (y se mide desde abajo, como en PDF)
    maquetar({ titulo, subtitulo, secciones = [], pie }) {
        const paginas = [[]];
        let y = this.alto - this.margen;
        const abajo = this.margen + 20;
        const nueva = () => { paginas.push([]); y = this.alto - this.margen; };
        const poner = (x, fuente, tamano, texto) => paginas[paginas.length - 1].push({ x, y, fuente, tamano, texto });
        const bajar = (cuanto, necesita = cuanto) => { if (y - necesita < abajo) nueva(); y -= cuanto; };
        const util = this.ancho - this.margen * 2;

        bajar(0, 40);
        poner(this.margen, "F2", 18, titulo || "Documento"); bajar(22);
        if (subtitulo) { this.partir(subtitulo, util, 11).forEach(r => { poner(this.margen, "F1", 11, r); bajar(this.interlineado); }); }
        bajar(8);

        secciones.forEach(s => {
            bajar(0, 50);
            poner(this.margen, "F2", 13, s.titulo || ""); bajar(6);
            this.linea(paginas, y, this.margen, this.ancho - this.margen); bajar(14);
            if (!s.filas || s.filas.length === 0) {
                poner(this.margen, "F1", 10, "Sin registros."); bajar(this.interlineado);
            }
            (s.filas || []).forEach(([etiqueta, valor]) => {
                const renglones = this.partir(valor, util - this.columnaEtiqueta, 10);
                bajar(0, renglones.length * this.interlineado);
                poner(this.margen, "F2", 10, etiqueta);
                renglones.forEach(r => { poner(this.margen + this.columnaEtiqueta, "F1", 10, r); bajar(this.interlineado); });
            });
            bajar(10);
        });

        // pie de pagina en todas las paginas
        paginas.forEach((p, i) => p.push({ x: this.margen, y: this.margen - 15, fuente: "F1", tamano: 8,
            texto: `${pie || ""}${pie ? "  ·  " : ""}Página ${i + 1} de ${paginas.length}` }));
        return paginas;
    }

    // linea horizontal: se guarda como instruccion especial
    linea(paginas, y, x1, x2) { paginas[paginas.length - 1].push({ x: x1, y, x2, linea: true }); }

    // ---------- armado del archivo ----------

    contenidoPagina(instrucciones) {
        return instrucciones.map(i => i.linea
            ? `0.6 w ${i.x.toFixed(2)} ${i.y.toFixed(2)} m ${i.x2.toFixed(2)} ${i.y.toFixed(2)} l S`
            : `BT /${i.fuente} ${i.tamano} Tf ${i.x.toFixed(2)} ${i.y.toFixed(2)} Td (${this.codificar(i.texto)}) Tj ET`
        ).join("\n");
    }

    generar(datos) {
        const paginas = this.maquetar(datos);
        // objetos: 1 catalogo, 2 paginas, 3 y 4 fuentes, luego (contenido, pagina) por cada pagina
        const objetos = [];
        const idPagina = i => 5 + i * 2 + 1;
        objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        objetos[2] = `<< /Type /Pages /Kids [${paginas.map((_, i) => idPagina(i) + " 0 R").join(" ")}] /Count ${paginas.length} >>`;
        objetos[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
        objetos[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
        paginas.forEach((p, i) => {
            const flujo = this.contenidoPagina(p);
            objetos[5 + i * 2] = `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`;
            objetos[idPagina(i)] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.ancho} ${this.alto}] ` +
                `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
        });

        let pdf = "%PDF-1.4\n";
        const posiciones = [];
        for (let n = 1; n < objetos.length; n++) {
            posiciones[n] = pdf.length;                      // aqui empieza el objeto n
            pdf += `${n} 0 obj\n${objetos[n]}\nendobj\n`;
        }
        const inicioXref = pdf.length;
        pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
        for (let n = 1; n < objetos.length; n++) pdf += String(posiciones[n]).padStart(10, "0") + " 00000 n \n";
        pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
        // todos los caracteres valen <= 255, asi que 1 caracter = 1 byte
        return Uint8Array.from(pdf, c => c.charCodeAt(0));
    }

    // Baja el PDF al equipo del usuario (crea un enlace temporal y lo "pulsa")
    static descargar(bytes, nombre = "documento.pdf") {
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url; a.download = nombre;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
