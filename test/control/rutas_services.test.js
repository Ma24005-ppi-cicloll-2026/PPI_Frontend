// Pruebas de los 20 services: que cada uno apunte a su ruta y herede de DefaultService.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("Rutas de los services", () => {
    const casos = [
        [ClinicaService, "clinica"],
        [ConsultaProcedimientoPasoService, "consulta_procedimiento_paso"],
        [ConsultaProcedimientoService, "consulta_procedimiento"],
        [ConsultaService, "consulta"],
        [DocumentoService, "documento"],
        [ExamenResultadoService, "examen_resultado"],
        [ExamenService, "examen"],
        [ExamenTipoExamenService, "examen_tipo_examen"],
        [MedioContactoService, "medio_contacto"],
        [OrdenExamenService, "orden_examen"],
        [PersonaRolService, "persona_rol"],
        [PersonaService, "persona"],
        [ProcedimientoPasoExamenService, "procedimiento_paso_examen"],
        [ProcedimientoPasoSecuenciaService, "procedimiento_paso_secuencia"],
        [ProcedimientoPasoService, "procedimiento_paso"],
        [ProcedimientoService, "procedimiento"],
        [RolService, "rol"],
        [TipoDocumentoService, "tipo_documento"],
        [TipoExamenService, "tipo_examen"],
        [TipoMedioContactoService, "tipo_medio_contacto"]
    ];

    casos.forEach(([Clase, ruta]) => {
        describe(Clase.name, () => {
            it(`apunta a /resources/${ruta}`, () => {
                expect(new Clase().url).to.match(new RegExp(`/resources/${ruta}$`));
            });
            it("hereda de DefaultService", () => {
                expect(new Clase()).to.be.instanceOf(DefaultService);
            });
        });
    });

    it("hay un service por cada ruta (20)", () => {
        expect(casos).to.have.length(20);
    });
});

// Solo estos services tienen el metodo activos() (GET /activos)
describe("Metodo activos()", () => {
    const conActivos = [
        ClinicaService,
        RolService,
        TipoMedioContactoService
    ];
    let fetchFalso;
    beforeEach(() => { fetchFalso = sinon.stub(window, "fetch"); });
    afterEach(() => fetchFalso.restore());

    conActivos.forEach(Clase => {
        it(`${Clase.name} pide /activos y devuelve la lista`, async () => {
            fetchFalso.resolves(new Response(JSON.stringify([{ activo: true }]), { status: 200 }));
            const datos = await new Clase().activos();
            expect(fetchFalso.firstCall.args[0]).to.match(/\/activos$/);
            expect(datos).to.have.length(1);
        });
    });

    it("los demas services no tienen activos()", () => {
        expect(new DocumentoService().activos).to.equal(undefined);
        expect(new PersonaService().activos).to.equal(undefined);
    });
});

}
