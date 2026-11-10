// Pruebas de LoginModel (HU1): usuario = nombre, contraseña = documento (tipo + numero con su expresion regular).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

const BD = {
    persona_rol: [
        { idPersonaRol: "emp-001", idPersona: { idPersona: "m1", nombres: "Gregory", apellidos: "House" }, idRol: { nombre: "Médico" }, idClinica: { idClinica: "c1", nombre: "Central" } },
        { idPersonaRol: "emp-002", idPersona: { idPersona: "r1", nombres: "Laura", apellidos: "Pérez" }, idRol: { nombre: "Recepcionista" }, idClinica: { idClinica: "c1", nombre: "Central" } },
        { idPersonaRol: "pac-001", idPersona: { idPersona: "p1", nombres: "Ana", apellidos: "López" }, idRol: { nombre: "Paciente" }, idClinica: { idClinica: "c1", nombre: "Central" } }
    ],
    tipo_documento: [
        { idTipoDocumento: "t-dui", nombre: "DUI", indicaciones: "00000000-0", expresionRegular: "^\\d{8}-\\d$", activo: true },
        { idTipoDocumento: "t-pas", nombre: "Pasaporte", indicaciones: "A0000000", expresionRegular: "^[A-Z]\\d{7}$", activo: true }
    ],
    documento: [
        { idDocumento: "d1", valor: "12345678-9", idPersona: { idPersona: "m1" }, idTipoDocumento: { idTipoDocumento: "t-dui" } },
        { idDocumento: "d3", valor: "B1234567", idPersona: { idPersona: "m1" }, idTipoDocumento: { idTipoDocumento: "t-pas" } },
        { idDocumento: "d4", valor: "87654321-0", idPersona: { idPersona: "r1" }, idTipoDocumento: { idTipoDocumento: "t-dui" } },
        { idDocumento: "d2", valor: "01234567-8", idPersona: { idPersona: "p1" }, idTipoDocumento: { idTipoDocumento: "t-dui" } }
    ]
};

describe("LoginModel (HU1)", () => {
    let fetchFalso, contenedor, aviso, modelo, almacen, destinoPedido;

    // almacen falso para "Recordarme": no se toca el localStorage real
    const crearAlmacen = () => { const d = {}; return { getItem: k => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: k => { delete d[k]; }, d }; };
    const esperar = () => new Promise(r => setTimeout(r, 0));
    const $ = id => contenedor.querySelector("#" + id);
    const escribir = (id, texto) => { const i = $(id).shadowRoot.querySelector("input"); i.value = texto; i.dispatchEvent(new Event("input")); };
    const DUI = BD.tipo_documento[0], PASAPORTE = BD.tipo_documento[1];
    async function ingresar(usuario, clave, tipo = DUI) {
        escribir("usuario", usuario); escribir("clave", clave);
        if (tipo) $("tipo").seleccionar(tipo);
        $("formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        for (let i = 0; i < 8; i++) await esperar();
    }
    async function montar(alm = crearAlmacen()) {
        almacen = alm;
        modelo = new LoginModel(contenedor, { almacen, irA: d => { destinoPedido = d; } });
        await modelo.iniciar();
    }

    beforeEach(async () => {
        destinoPedido = null;
        fetchFalso = sinon.stub(window, "fetch").callsFake(async url => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            return new Response(JSON.stringify(BD[ruta] || []), { status: 200 });
        });
        Sesion.cerrar();
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        await montar();
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    describe("pantalla", () => {
        it("pide usuario y contraseña, y ofrece Recordarme", () => {
            expect($("usuario").getAttribute("label")).to.equal("Usuario");
            expect($("clave").getAttribute("type")).to.equal("password");
            expect($("recordar").getAttribute("type")).to.equal("checkbox");
        });
        it("la contraseña se puede mostrar y ocultar", () => {
            const entrada = $("clave").shadowRoot.querySelector("input");
            $("clave").shadowRoot.querySelector("#ver").click();
            expect(entrada.type).to.equal("text");
            $("clave").shadowRoot.querySelector("#ver").click();
            expect(entrada.type).to.equal("password");
        });
        it("ya no hay entrada para pacientes ni lista de personas", () => {
            expect(contenedor.querySelector("galeno-pestanas")).to.equal(null);
            expect(contenedor.querySelector("galeno-buscador-persona")).to.equal(null);
        });
        it("ofrece ir a Solicitar consulta sin iniciar sesion", () => {
            $("solicitar").click();
            expect(destinoPedido).to.equal("solicitar");
        });
    });

    describe("ingresar", () => {
        it("con nombre y DUI correctos inicia la sesion con rol y clinica", async () => {
            await ingresar("Gregory House", "12345678-9");
            expect(Sesion.obtener()).to.deep.include({ nombre: "Gregory House", rol: "Médico", clinica: "Central", idClinica: "c1", idPersonaRol: "emp-001" });
            expect(Sesion.tipo()).to.equal("medico");
            expect(aviso.mostrar.calledWith("Sesión iniciada", "exito")).to.equal(true);
        });
        it("tambien entra con su pasaporte si elige ese tipo", async () => {
            await ingresar("Gregory House", "B1234567", PASAPORTE);
            expect(Sesion.tipo()).to.equal("medico");
        });
        it("el numero de un tipo no sirve si se elige otro tipo", async () => {
            await ingresar("Gregory House", "12345678-9", PASAPORTE);
            expect(Sesion.obtener()).to.equal(null);
            expect($("clave").shadowRoot.querySelector("#error").textContent).to.contain("formato de Pasaporte");
        });
        it("si el numero no cumple la expresion regular del tipo lo dice con las indicaciones y no consulta", async () => {
            await ingresar("Gregory House", "123", DUI);
            expect($("clave").shadowRoot.querySelector("#error").textContent).to.equal("No tiene el formato de DUI: 00000000-0");
            expect(Sesion.obtener()).to.equal(null);
        });
        it("un pasaporte con minuscula no cumple la expresion regular", async () => {
            await ingresar("Gregory House", "b1234567", PASAPORTE);
            expect($("clave").shadowRoot.querySelector("#error").textContent).to.contain("formato");
            expect(Sesion.obtener()).to.equal(null);
        });
        it("sin elegir el tipo de documento lo pide", async () => {
            await ingresar("Gregory House", "12345678-9", null);
            expect($("mensaje").textContent).to.equal("Elija el tipo de documento");
            expect(Sesion.obtener()).to.equal(null);
        });
        it("no distingue mayusculas, tildes ni espacios de mas en el nombre", async () => {
            await ingresar("  laura   PEREZ ", "87654321-0");
            expect(Sesion.obtener().nombre).to.equal("Laura Pérez");
            expect(Sesion.tipo()).to.equal("recepcion");
        });
        it("con documento de otra persona no inicia sesion y lo dice", async () => {
            await ingresar("Gregory House", "87654321-0");
            expect(Sesion.obtener()).to.equal(null);
            expect($("mensaje").textContent).to.equal("Usuario o contraseña incorrectos");
        });
        it("con usuario inexistente no inicia sesion", async () => {
            await ingresar("Nadie Conocido", "12345678-9");
            expect(Sesion.obtener()).to.equal(null);
            expect($("mensaje").textContent).to.contain("incorrectos");
        });
        it("un paciente no puede iniciar sesion aunque su documento exista", async () => {
            await ingresar("Ana López", "01234567-8");
            expect(Sesion.obtener()).to.equal(null);
        });
        it("despues de un error limpia la contraseña", async () => {
            await ingresar("Gregory House", "99999999-9");
            expect($("clave").value).to.equal("");
        });
        it("sin usuario o sin contraseña avisa en el campo y no consulta nada", async () => {
            await ingresar("", "");
            expect($("usuario").shadowRoot.querySelector("#error").textContent).to.contain("usuario");
            expect($("clave").shadowRoot.querySelector("#error").textContent).to.contain("contraseña");
            expect(Sesion.obtener()).to.equal(null);
        });
        it("el error se quita al volver a escribir", async () => {
            await ingresar("", "");
            escribir("usuario", "G");
            expect($("usuario").shadowRoot.querySelector("#error").textContent).to.equal("");
        });
        it("al elegir el tipo, el campo muestra el formato esperado", async () => {
            $("tipo").seleccionar(PASAPORTE);
            $("tipo").dispatchEvent(new CustomEvent("galeno-seleccion", { detail: { valor: PASAPORTE } }));
            expect($("clave").shadowRoot.querySelector("input").placeholder).to.equal("A0000000");
        });
        it("si el backend falla avisa que no se pudo conectar", async () => {
            fetchFalso.callsFake(async () => new Response("", { status: 500 }));
            await montar();
            await ingresar("Gregory House", "12345678-9");
            expect($("mensaje").textContent).to.contain("No se pudo conectar");
            expect(Sesion.obtener()).to.equal(null);
        });
        it("el boton vuelve a su texto despues de verificar", async () => {
            await ingresar("Gregory House", "12345678-9");
            expect($("ingresar").disabled).to.equal(false);
            expect($("ingresar").textContent).to.equal("Iniciar sesión");
        });
    });

    describe("recordarme", () => {
        it("con la casilla marcada guarda el usuario (nunca la contraseña)", async () => {
            $("recordar").value = true;
            await ingresar("Gregory House", "12345678-9");
            expect(almacen.d["galeno-usuario"]).to.equal("Gregory House");
            expect(JSON.stringify(almacen.d)).to.not.contain("12345678-9");
        });
        it("sin marcar no guarda nada y borra lo guardado antes", async () => {
            almacen.setItem("galeno-usuario", "Antiguo");
            await ingresar("Gregory House", "12345678-9");
            expect(almacen.getItem("galeno-usuario")).to.equal(null);
        });
        it("la proxima vez el usuario ya aparece escrito y la casilla marcada", async () => {
            const alm = crearAlmacen(); alm.setItem("galeno-usuario", "Gregory House");
            contenedor.replaceChildren();
            await montar(alm);
            expect($("usuario").value).to.equal("Gregory House");
            expect($("recordar").value).to.equal(true);
            expect($("clave").value).to.equal("");
        });
    });
});
}
