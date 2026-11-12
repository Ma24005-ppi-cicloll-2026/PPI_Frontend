{
const { expect } = chai;
describe("ConsultaService · ticket PDF del backend", () => {
    let stub;
    afterEach(() => stub?.restore());
    const respuesta = (estado = 200, nombre = 'attachment; filename="ticket-cita-2026-11-11-abc.pdf"') =>
        new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), { status: estado, headers: { "Content-Disposition": nombre } });

    it("pide GET /consulta/{id}/ticket como PDF", async () => {
        stub = sinon.stub(window, "fetch").resolves(respuesta());
        const r = await new ConsultaService().ticket("k1");
        expect(stub.firstCall.args[0]).to.match(/\/resources\/consulta\/k1\/ticket$/);
        expect(stub.firstCall.args[1].headers.Accept).to.equal("application/pdf");
        expect(r.nombre).to.equal("ticket-cita-2026-11-11-abc.pdf");
        expect(r.blob.size).to.be.greaterThan(0);
    });
    it("usa un nombre por defecto si no viene Content-Disposition", async () => {
        stub = sinon.stub(window, "fetch").resolves(new Response(new Blob(["x"]), { status: 200 }));
        expect((await new ConsultaService().ticket("k1")).nombre).to.equal("ticket-cita.pdf");
    });
    it("404: la cita ya no existe", async () => {
        stub = sinon.stub(window, "fetch").resolves(respuesta(404));
        try { await new ConsultaService().ticket("k1"); expect.fail("debia fallar"); }
        catch (e) { expect(e.message).to.equal("La cita ya no existe"); }
    });
    it("otro error del servidor", async () => {
        stub = sinon.stub(window, "fetch").resolves(respuesta(500));
        try { await new ConsultaService().ticket("k1"); expect.fail("debia fallar"); }
        catch (e) { expect(e.message).to.contain("500"); }
    });
    it("descargarTicket baja el archivo con un enlace temporal", async () => {
        stub = sinon.stub(window, "fetch").resolves(respuesta());
        const clic = sinon.stub(HTMLAnchorElement.prototype, "click");
        const crear = sinon.stub(URL, "createObjectURL").returns("blob:x");
        try {
            const nombre = await new ConsultaService().descargarTicket("k1");
            expect(nombre).to.equal("ticket-cita-2026-11-11-abc.pdf");
            expect(clic.calledOnce).to.equal(true);
            expect(crear.calledOnce).to.equal(true);
        } finally { clic.restore(); crear.restore(); }
    });
});
}
