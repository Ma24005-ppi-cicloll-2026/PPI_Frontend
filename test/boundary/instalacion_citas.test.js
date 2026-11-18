{
const { expect } = chai;
// Deja terminar las tareas asíncronas pendientes de la prueba.
const esperar = () => new Promise(r => setTimeout(r, 0));

describe("Ticket de citas · activacion de la invitacion a instalar", () => {
    let api, zona, modelo, descargar, invitacion, pwa;

    // Prepara el entorno de las pruebas.
    beforeEach(async () => {
        Sesion.cerrar();
        api = new ApiFalsa(Datos.bd());
        zona = document.createElement("div"); document.body.append(zona);
        pwa = {
            ventana: window, estado: "instalable", mostrada: false, aplazos: 0,
            // Comprueba si corresponde ofrecer la invitación en esta sesión.
            puedeInvitar() { return !this.mostrada; },
            // Registra que la invitación ya se mostró en esta sesión.
            marcarInvitacionMostrada() { this.mostrada = true; },
            // Guarda la fecha desde la que se cuenta el aplazamiento.
            aplazar() { this.aplazos++; }
        };
        invitacion = document.createElement("galeno-invitacion-instalar");
        invitacion.pwa = pwa;
        document.body.append(invitacion);
        await Ayuda.esperar();
        descargar = sinon.stub().resolves("ticket.pdf");
        modelo = new CitasModel(zona, { descargar });
        await modelo.iniciar(); await Ayuda.esperar();
    });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => { api.restaurar(); zona.remove(); invitacion.remove(); });

    // Devuelve la tarjeta de cita que se usará en la prueba.
    const card = () => {
        const tarjeta = document.createElement("galeno-tarjeta-cita");
        tarjeta.cita = { idConsulta: "c1", fechaInicio: "2026-02-02T10:00:00", clinica: "Santa Ana", procedimientos: ["Consulta general"] };
        zona.querySelector("#resultado").append(tarjeta);
        return tarjeta;
    };
    // Descarga el PDF y mantiene el estado de carga en su tarjeta.
    const bajarTicket = async tarjeta => {
        tarjeta.dispatchEvent(new CustomEvent("galeno-descargar-ticket",
            { detail: { idConsulta: "c1" }, bubbles: true, composed: true }));
        await esperar();
    };

    it("la descarga exitosa sigue igual y activa la invitacion (una vez por sesion)", async () => {
        const tarjeta = card();
        await bajarTicket(tarjeta);
        expect(descargar.calledWith("c1")).to.equal(true);
        // Busca el botón que se usa en la prueba.
        const boton = () => tarjeta.shadowRoot.querySelector("#ticket");
        expect(boton().disabled, "el boton vuelve a estar disponible").to.equal(false);
        expect(invitacion.shadowRoot.querySelector(".tarjeta").hidden).to.equal(false);
        expect(pwa.mostrada, "el servicio marco la sesion").to.equal(true);
        await bajarTicket(tarjeta);
        expect(pwa.mostrada).to.equal(true);
    });
    it("si la descarga FALLA no hay invitacion (y la pantalla no se rompe)", async () => {
        descargar.rejects(new Error("No se pudo generar el ticket"));
        const tarjeta = card();
        await bajarTicket(tarjeta);
        expect(descargar.calledOnce).to.equal(true);
        expect(invitacion.shadowRoot.querySelector(".tarjeta").hidden).to.equal(true);
        expect(pwa.mostrada, "no se marco la sesion: no hubo exito").to.equal(false);
        expect(tarjeta.shadowRoot.querySelector("#ticket").disabled).to.equal(false);
    });
    it("la invitacion no se activa por el fallo aunque el servicio este libre", async () => {
        expect(pwa.puedeInvitar(), "el servicio podria invitar").to.equal(true);
        descargar.rejects(new Error("error 500"));
        const tarjeta = card();
        await bajarTicket(tarjeta);
        expect(invitacion.shadowRoot.querySelector(".tarjeta").hidden).to.equal(true);
    });
});
}
