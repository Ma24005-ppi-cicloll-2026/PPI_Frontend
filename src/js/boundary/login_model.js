// Pantalla "Cambio de rol": se elige la clinica y luego la persona con su rol
// (igual que SesionModels del backend). La sesion queda en sessionStorage.
class LoginModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.personasRoles = [];
    }

    async iniciar() {
        this.contenedor.innerHTML = `
            <h2>Cambio de rol</h2>
            <galeno-autocomplete id="selClinica" label="Clínica"></galeno-autocomplete>
            <galeno-autocomplete id="selPersonaRol" label="Usuario"></galeno-autocomplete>`;
        const selClinica = this.contenedor.querySelector("#selClinica");
        this.selPersonaRol = this.contenedor.querySelector("#selPersonaRol");
        this.aviso = document.querySelector("#aviso");

        selClinica.formatoTexto = c => c.nombre;
        this.selPersonaRol.formatoTexto = pr =>
            `${pr.idPersona?.nombres ?? ""} ${pr.idPersona?.apellidos ?? ""} (${pr.idRol?.nombre ?? "sin rol"})`.trim();

        selClinica.addEventListener("galeno-seleccion", e => this.alElegirClinica(e.detail.valor));
        this.selPersonaRol.addEventListener("galeno-seleccion", e => this.alElegirPersonaRol(e.detail.valor));

        try {
            const clinicas = await new ClinicaService().listar(0, 100);
            selClinica.opciones = clinicas.filter(c => c.activo);
            this.personasRoles = await new PersonaRolService().listar(0, 1000);
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    alElegirClinica(clinica) {
        this.selPersonaRol.limpiar();
        // como el backend: solo personal de esa clinica, sin pacientes
        this.selPersonaRol.opciones = this.personasRoles.filter(pr =>
            pr.idClinica?.idClinica === clinica.idClinica &&
            pr.idRol?.nombre?.trim().toLowerCase() !== "paciente");
    }

    alElegirPersonaRol(pr) {
        const sesion = {
            idPersonaRol: pr.idPersonaRol,
            nombre: `${pr.idPersona?.nombres ?? ""} ${pr.idPersona?.apellidos ?? ""}`.trim(),
            rol: pr.idRol?.nombre ?? "", clinica: pr.idClinica?.nombre ?? ""
        };
        try { sessionStorage.setItem("sesion", JSON.stringify(sesion)); } catch (e) { /* se ignora */ }
        window.dispatchEvent(new CustomEvent("galeno-sesion"));   // el encabezado se actualiza
        this.aviso.mostrar("Sesión iniciada", "exito");
    }
}
