// Pantalla de Inicio: una tarjeta por modulo (como Inicio.xhtml del backend).
class InicioModel {

    constructor(contenedor, irA) {
        this.contenedor = contenedor;
        this.irA = irA;
    }

    iniciar() {
        this.contenedor.innerHTML = `<h2>Bienvenido a GalenoSV</h2>
            <p>Sistema de gestión médica: pacientes, exámenes, procedimientos y consultas.</p>
            <div id="tarjetas" style="display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(14rem, 1fr)); grid-auto-rows:1fr;"></div>`;
        const cont = this.contenedor.querySelector("#tarjetas");
        const modulos = [
            { destino: "consulta", titulo: "Consultas", descripcion: "Buscar pacientes y ver sus consultas" },
            { destino: "login", titulo: "Cambio de rol", descripcion: "Elegir clínica y usuario" },
            ...Object.entries(ENTIDADES).map(([destino, e]) => ({ destino, titulo: e.titulo, descripcion: e.descripcion }))
        ];
        modulos.forEach(m => {
            const tarjeta = document.createElement("galeno-tarjeta-simple");
            tarjeta.datos = { titulo: m.titulo, descripcion: m.descripcion, boton: "Abrir" };
            tarjeta.addEventListener("galeno-accion", () => this.irA(m.destino));
            cont.append(tarjeta);
        });
    }
}
