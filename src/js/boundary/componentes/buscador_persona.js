// <galeno-buscador-persona>: busca una Persona (paciente) por nombres o apellidos.
// Solo cambia como se muestra cada opcion; todo lo demas lo hereda de autocomplete.
//   buscador.opciones = await new PersonaService().listar(0, 500);
//   buscador.addEventListener("galeno-seleccion", e => usar(e.detail.valor));
class GalenoBuscadorPersona extends GalenoAutocomplete {
    texto(persona) {
        return `${persona?.nombres ?? ""} ${persona?.apellidos ?? ""}`.trim();
    }
}

customElements.define("galeno-buscador-persona", GalenoBuscadorPersona);
