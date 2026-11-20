// Dobles de prueba: cada prueba arma solo los datos que necesita y se los pasa al modelo por el constructor.
const Falsos = {

    // Servicio falso: devuelve copias de la lista y registra lo que se le envía.
    servicio(lista = [], { id = "id", falla = false } = {}) {
        const copia = () => JSON.parse(JSON.stringify(lista));
        const error = () => Promise.reject(new Error("Falla simulada"));
        let n = 0;
        return {
            listarTodo: sinon.stub().callsFake(() => falla ? error() : Promise.resolve(copia())),
            crear: sinon.stub().callsFake(datos => falla ? error() : Promise.resolve({ ...datos, [id]: `${id}-nuevo-${++n}` })),
            actualizar: sinon.stub().callsFake((clave, datos) => falla ? error() : Promise.resolve(datos)),
            ticket: sinon.stub().callsFake(() => falla ? error() : Promise.resolve({ blob: new Blob(["%PDF"]), nombre: "ticket.pdf" }))
        };
    },

    // Promesa que la prueba resuelve cuando quiere, para simular respuestas lentas.
    diferida() {
        let resolver, rechazar;
        const promesa = new Promise((ok, mal) => { resolver = ok; rechazar = mal; });
        return { promesa, resolver, rechazar };
    },

    // Almacén en memoria para que la sesión no toque el sessionStorage real.
    almacen() {
        const datos = new Map();
        return { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) };
    },

    // Sesión aislada con su propio almacén; opcionalmente ya iniciada y con contexto elegido.
    sesion(empleado = null, contexto = null) {
        const sesion = new Sesion({ almacen: Falsos.almacen(), ventana: new EventTarget(), cache: { limpiar: () => Promise.resolve() } });
        if (empleado) sesion.iniciar(empleado);
        if (contexto) sesion.elegirContexto(contexto);
        return sesion;
    },

    // Aviso emergente falso que solo registra los mensajes.
    aviso() { return { mostrar: sinon.spy() }; },

    // Fecha ISO a partir de hoy, desplazada en días.
    dia(desfase = 0, hora = 9) {
        const d = new Date(); d.setDate(d.getDate() + desfase); d.setHours(hora, 0, 0, 0); return d.toISOString();
    },

    // Fecha local AAAA-MM-DD para los campos de tipo date.
    fechaLocal(desfase = 0) {
        const d = new Date(); d.setDate(d.getDate() + desfase);
        const dos = n => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    },

    // Constructores mínimos de registros del backend.
    tipo: (id = "t-dui", expresionRegular = "^\\d{8}-\\d$") => ({ idTipoDocumento: id, nombre: id, indicaciones: "", expresionRegular }),
    persona: (id, nombres = "Nombre", apellidos = "Apellido") => ({ idPersona: id, nombres, apellidos }),
    rol: (id, nombre = id) => ({ idRol: id, nombre }),
    clinica: (id, nombre = id) => ({ idClinica: id, nombre }),
    personaRol: (id, persona, rol, clinica) => ({ idPersonaRol: id, idPersona: persona, idRol: rol, idClinica: clinica }),
    documento: (persona, tipo, valor) => ({ idDocumento: "d-" + valor, idPersona: persona, idTipoDocumento: tipo, valor })
};

// Espera a que se cumpla una condición en lugar de esperar un número fijo de vueltas.
Ayuda.hasta = (condicion, { intentos = 200, mensaje = "la condición no se cumplió" } = {}) => new Promise((resolve, reject) => {
    const revisar = n => {
        let ok = false;
        try { ok = condicion(); } catch (e) { ok = false; }
        if (ok) return resolve();
        if (n <= 0) return reject(new Error("Tiempo agotado: " + mensaje));
        setTimeout(() => revisar(n - 1), 5);
    };
    revisar(intentos);
});
