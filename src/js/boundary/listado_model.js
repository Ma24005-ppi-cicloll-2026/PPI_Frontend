// Pantalla de listado generica (Personas, Clinicas, Examenes...): tabla + paginador +
// crear/editar (formulario) + eliminar (confirmacion). Se configura con ENTIDADES[...].
class ListadoModel {

    constructor(contenedor, config) {
        this.contenedor = contenedor;
        this.config = config;
        this.servicio = config.servicio();
        this.filaAEliminar = null;
    }

    iniciar() {
        this.contenedor.innerHTML = `
            <h2>${this.config.titulo}</h2>
            <button id="nuevo" type="button">Nuevo</button>
            <galeno-formulario id="formulario" hidden></galeno-formulario>
            <galeno-estado-vista id="estado"></galeno-estado-vista>
            <galeno-tabla id="tabla"></galeno-tabla>
            <galeno-paginador id="paginador"></galeno-paginador>
            <galeno-modal-confirmacion id="confirmar"></galeno-modal-confirmacion>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.formulario = $("formulario"); this.estado = $("estado"); this.tabla = $("tabla");
        this.paginador = $("paginador"); this.confirmar = $("confirmar");
        this.aviso = document.querySelector("#aviso");

        this.tabla.columnas = this.config.columnas;
        this.formulario.campos = this.config.campos;
        this.paginador.tamano = 10;

        $("nuevo").addEventListener("click", () => this.abrirFormulario({}));
        this.tabla.addEventListener("galeno-editar", e => this.abrirFormulario(e.detail.fila));
        this.tabla.addEventListener("galeno-eliminar", e => {
            this.filaAEliminar = e.detail.fila;
            this.confirmar.abrir("¿Desea eliminar este registro?");
        });
        this.confirmar.addEventListener("galeno-confirmar", () => this.eliminar());
        this.formulario.addEventListener("galeno-guardar", e => this.guardar(e.detail.datos));
        this.formulario.addEventListener("galeno-cancelar", () => this.formulario.hidden = true);
        this.paginador.addEventListener("galeno-cambiar-pagina", () => this.cargar());
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        return this.cargar();
    }

    abrirFormulario(registro) {
        this.formulario.valores = registro;
        this.formulario.hidden = false;
    }

    async cargar() {
        this.estado.mostrar("cargando");
        this.tabla.hidden = true;
        try {
            const filas = await this.servicio.listar(this.paginador.primero, this.paginador.tamano);
            if (filas.length === 0 && this.paginador.pagina > 1) {   // se borro la ultima de la pagina
                this.paginador.ir(this.paginador.pagina - 1);
                return;
            }
            this.tabla.filas = filas;
            this.paginador.actualizar(filas.length);
            if (filas.length === 0) { this.estado.mostrar("vacio"); return; }
            this.estado.mostrar("contenido");
            this.tabla.hidden = false;
        } catch (e) {
            this.estado.mostrar("error", e.message);
        }
    }

    async guardar(datos) {
        const id = datos[this.config.id];
        try {
            if (id) await this.servicio.actualizar(id, datos);
            else await this.servicio.crear(datos);
            this.formulario.hidden = true;
            this.aviso.mostrar("Registro guardado", "exito");
            await this.cargar();
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    async eliminar() {
        try {
            await this.servicio.eliminar(this.filaAEliminar[this.config.id]);
            this.aviso.mostrar("Registro eliminado", "exito");
            await this.cargar();
        } catch (e) { this.aviso.mostrar(e.message, "error"); }   // aqui sale el 409 (en uso)
    }
}
