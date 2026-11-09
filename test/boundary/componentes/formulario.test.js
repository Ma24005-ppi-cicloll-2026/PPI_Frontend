// Pruebas de galeno-formulario (lo usa "Nueva consulta" de recepcion).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("galeno-formulario", () => {
    let formulario, alerta;
    beforeEach(() => {
        alerta = sinon.stub(window, "alert");
        formulario = document.createElement("galeno-formulario");
        document.body.append(formulario);
        formulario.campos = [
            { nombre: "referencia", etiqueta: "Referencia", tipo: "texto", requerido: true },
            { nombre: "notas", etiqueta: "Notas", tipo: "area" },
            { nombre: "activo", etiqueta: "Activo", tipo: "casilla" },
            { nombre: "dia", etiqueta: "Dia", tipo: "fecha" },
            { nombre: "inicio", etiqueta: "Inicio", tipo: "fechahora" }
        ];
    });
    afterEach(() => { formulario.remove(); alerta.restore(); });

    const campo = nombre => formulario.shadowRoot.querySelector(`[name=${nombre}]`);
    const enviar = () => formulario.shadowRoot.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));

    it("dibuja un campo por cada definicion", () => {
        ["referencia", "notas", "activo", "dia", "inicio"].forEach(n => expect(campo(n), n).to.not.equal(null));
        expect(campo("notas").tagName).to.equal("TEXTAREA");
        expect(campo("activo").type).to.equal("checkbox");
    });
    it("marca como requeridos los campos requeridos", () => {
        expect(campo("referencia").required).to.equal(true);
        expect(campo("notas").required).to.equal(false);
    });
    it("precarga los valores del registro", () => {
        formulario.valores = { referencia: "R-1", activo: true, dia: "2000-01-05T00:00:00Z[UTC]" };
        expect(campo("referencia").value).to.equal("R-1");
        expect(campo("activo").checked).to.equal(true);
        expect(campo("dia").value).to.equal("2000-01-05");     // sin saltar de dia
    });
    it("emite galeno-guardar conservando el id y lo que no se edita", () => {
        formulario.valores = { idX: "abc", referencia: "R-1", oculto: "no se toca" };
        let datos = null;
        formulario.addEventListener("galeno-guardar", e => { datos = e.detail.datos; });
        campo("referencia").value = "R-2";
        enviar();
        expect(datos.idX).to.equal("abc");
        expect(datos.oculto).to.equal("no se toca");
        expect(datos.referencia).to.equal("R-2");
    });
    it("envia la fecha sola como medianoche UTC y la casilla como booleano", () => {
        let datos = null;
        formulario.addEventListener("galeno-guardar", e => { datos = e.detail.datos; });
        campo("referencia").value = "x";
        campo("dia").value = "2000-01-05";
        campo("activo").checked = true;
        enviar();
        expect(datos.dia).to.equal("2000-01-05T00:00:00.000Z");
        expect(datos.activo).to.equal(true);
    });
    it("envia null si la fecha queda vacia", () => {
        let datos = null;
        formulario.addEventListener("galeno-guardar", e => { datos = e.detail.datos; });
        campo("referencia").value = "x";
        enviar();
        expect(datos.dia).to.equal(null);
        expect(datos.inicio).to.equal(null);
    });
    it("emite galeno-cancelar al pulsar Cancelar", () => {
        let cancelado = false;
        formulario.addEventListener("galeno-cancelar", () => { cancelado = true; });
        formulario.shadowRoot.querySelector("#cancelar").click();
        expect(cancelado).to.equal(true);
    });

    describe("campo de relacion requerido", () => {
        beforeEach(() => {
            formulario.campos = [{ nombre: "persona", etiqueta: "Persona", tipo: "relacion", requerido: true,
                                   opciones: [{ n: "Ana" }], formatoTexto: p => p.n }];
        });
        it("no guarda si falta elegir y avisa cual falta", () => {
            let guardado = false;
            formulario.addEventListener("galeno-guardar", () => { guardado = true; });
            enviar();
            expect(guardado).to.equal(false);
            expect(alerta.calledOnce).to.equal(true);
            expect(alerta.firstCall.args[0]).to.include("Persona");
        });
        it("guarda el objeto elegido", () => {
            let datos = null;
            formulario.addEventListener("galeno-guardar", e => { datos = e.detail.datos; });
            const auto = formulario.shadowRoot.querySelector("galeno-autocomplete");
            const entrada = auto.shadowRoot.querySelector("#q");
            entrada.value = "an"; entrada.dispatchEvent(new Event("input"));
            auto.shadowRoot.querySelector("li").click();
            enviar();
            expect(datos.persona).to.deep.equal({ n: "Ana" });
        });
    });
});
}
