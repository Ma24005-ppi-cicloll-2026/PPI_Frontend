// Pantalla de Inicio: una tarjeta por cada modulo al que el rol tiene acceso.
//   modulos = [ { destino: "consulta", titulo: "Consultas", descripcion: "..." }, ... ]
class InicioModel {

    constructor(contenedor, irA, modulos) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.modulos = modulos || [];
    }

    iniciar() {
        const sesion = Sesion.obtener();
        const h2 = document.createElement("h2");
        h2.textContent = sesion ? `Bienvenido, ${sesion.nombre}` : "Bienvenido a GalenoSV";
        const p = document.createElement("p");
        p.textContent = this.modulos.length === 0
            ? "Su rol todavía no tiene pantallas asignadas. Comuníquese con el administrador."
            : "Sistema de gestión médica. Elija una opción:";
        const tarjetas = document.createElement("div");
        tarjetas.style.cssText = "display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(14rem, 1fr)); grid-auto-rows:1fr;";
        this.contenedor.replaceChildren(h2, p, tarjetas);
        this.modulos.forEach(m => {
            const tarjeta = document.createElement("galeno-tarjeta-simple");
            tarjeta.datos = { titulo: m.titulo, descripcion: m.descripcion, boton: "Abrir" };
            tarjeta.addEventListener("galeno-accion", () => this.irA(m.destino));
            tarjetas.append(tarjeta);
        });
    }
}
