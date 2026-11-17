// Integracion HU1 · invitacion a instalar: la descarga del ticket sigue funcionando IGUAL
// y SOLO el exito de esa descarga avisa con "galeno-ticket-descargado" (la invitacion reacciona).
{
const { expect } = chai;
const esperar = () => new Promise(r => setTimeout(r, 0));

describe("Ticket de citas · activacion de la invitacion a instalar", () => {
    let api, zona, modelo, descargar, invitacion, pwa;

    beforeEach(async () => {
        Sesion.cerrar();
        api = new ApiFalsa(Datos.bd());
        zona = document.createElement("div"); document.body.append(zona);
        // servicio falso que SIEMPRE puede invitar en esta pantalla de prueba
        pwa = {
            ventana: window, estado: "instalable", mostrada: false, aplazos: 0,
            puedeInvitar() { return !this.mostrada; },
            marcarInvitacionMostrada() { this.mostrada = true; },
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
    afterEach(() => { api.restaurar(); zona.remove(); invitacion.remove(); });

    // card suelta DENTRO de #resultado (donde la app la monta: el evento burbujea hasta su listener)
    const card = () => {
        const tarjeta = document.createElement("galeno-tarjeta-cita");
        tarjeta.cita = { idConsulta: "c1", fechaInicio: "2026-02-02T10:00:00", clinica: "Santa Ana", procedimientos: ["Consulta general"] };
        zona.querySelector("#resultado").append(tarjeta);
        return tarjeta;
    };
    const bajarTicket = async tarjeta => {
        tarjeta.dispatchEvent(new CustomEvent("galeno-descargar-ticket",
            { detail: { idConsulta: "c1" }, bubbles: true, composed: true }));
        await esperar();
    };

    it("la descarga exitosa sigue igual y activa la invitacion (una vez por sesion)", async () => {
        const tarjeta = card();
        await bajarTicket(tarjeta);
        expect(descargar.calledWith("c1")).to.equal(true);
        const boton = () => tarjeta.shadowRoot.querySelector("#ticket");
        expect(boton().disabled, "el boton vuelve a estar disponible").to.equal(false);
        expect(invitacion.shadowRoot.querySelector(".tarjeta").hidden).to.equal(false);
        expect(pwa.mostrada, "el servicio marco la sesion").to.equal(true);
        // otra descarga no vuelve a invitar (marca de sesion)
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
