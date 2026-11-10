// Quien inicio sesion y que pantallas puede ver. Hay CINCO tipos de usuario segun su rol:
//   - "medico":    Inicio, Atencion (consultas pendientes) y Consultas (buscar historial).
//   - "enfermero": Inicio y Enfermeria (registrar y actualizar los pasos de las consultas).
//   - "recepcion": Inicio, Registrar paciente, Registrar consulta, Sala de espera y Cierre de consulta (con su constancia PDF).
//   - "personal":  cualquier otro rol (administrador...): todo menos las pantallas propias de cada rol de arriba.
//   - "paciente":  Inicio y su historial.
// Sin sesion se puede ver el Login y la pantalla publica "Solicitar consulta" (el paciente no se autentica).
// OJO: esto solo ESCONDE pantallas en el navegador; no protege los datos (eso es del backend).

// Nombres de rol (sin tildes ni mayusculas) que corresponden a cada tipo
const ROLES = {
    paciente: ["paciente"],
    recepcion: ["recepcionista", "recepcion"],
    medico: ["medico", "medica", "doctor", "doctora"],
    enfermero: ["enfermero", "enfermera"]
};

const PUBLICAS = ["login", "solicitar"];

// Tabla de permisos: para cambiar lo que ve cada tipo, se edita solo esta tabla.
const PERMISOS = {
    paciente: pantalla => pantalla === "inicio" || pantalla === "historial",
    recepcion: pantalla => ["inicio", "admision", "registrar", "sala", "cierre"].includes(pantalla),
    medico: pantalla => ["inicio", "atencion", "consulta"].includes(pantalla),
    enfermero: pantalla => ["inicio", "enfermeria"].includes(pantalla),
    personal: pantalla => !["login", "atencion", "cierre", "historial", "admision", "registrar", "enfermeria", "sala"].includes(pantalla)
};

class Sesion {

    // "Médico " -> "medico": asi no importa si el rol se escribio con tilde o mayusculas
    static normalizarRol(nombre) {
        return String(nombre ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    }

    static obtener() {
        try { return JSON.parse(sessionStorage.getItem("sesion") || "null"); }
        catch (e) { return Sesion.memoria; }          // si el navegador bloquea sessionStorage
    }

    static iniciar(datos) {
        Sesion.memoria = datos;
        try { sessionStorage.setItem("sesion", JSON.stringify(datos)); } catch (e) { /* queda en memoria */ }
        window.dispatchEvent(new CustomEvent("galeno-sesion"));   // el encabezado y el menu se actualizan
    }

    static cerrar() {
        Sesion.memoria = null;
        try { sessionStorage.setItem("sesion", "null"); } catch (e) { /* se ignora */ }   // "null" = sin sesion
        window.dispatchEvent(new CustomEvent("galeno-sesion"));
    }

    // "paciente", "recepcion", "medico", "enfermero", "personal" o null si no hay sesion
    static tipo() {
        const sesion = Sesion.obtener();
        if (!sesion) return null;
        const rol = Sesion.normalizarRol(sesion.rol);
        return ["paciente", "recepcion", "medico", "enfermero"].find(t => ROLES[t].includes(rol)) ?? "personal";
    }

    static esPaciente() { return Sesion.tipo() === "paciente"; }

    static puede(pantalla) {
        const tipo = Sesion.tipo();
        return tipo ? PERMISOS[tipo](pantalla) : PUBLICAS.includes(pantalla);   // sin sesion: login y solicitud
    }
}
Sesion.memoria = null;
