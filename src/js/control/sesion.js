// Quien inicio sesion y que pantallas puede ver. Hay DOS tipos de usuario:
//   - "paciente": solo Inicio y su historial.
//   - "personal": cualquier otro rol (medico, recepcionista, admin...): todo menos el historial del paciente.
// OJO: esto solo ESCONDE pantallas en el navegador; no protege los datos (eso es del backend).

// Tabla de permisos: para cambiar lo que ve cada tipo, se edita solo esta tabla.
const PERMISOS = {
    paciente: pantalla => pantalla === "inicio" || pantalla === "historial",
    personal: pantalla => pantalla !== "login" && pantalla !== "historial"
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

    // "paciente", "personal" o null si no hay sesion
    static tipo() {
        const sesion = Sesion.obtener();
        if (!sesion) return null;
        return Sesion.normalizarRol(sesion.rol) === "paciente" ? "paciente" : "personal";
    }

    static esPaciente() { return Sesion.tipo() === "paciente"; }

    static puede(pantalla) {
        const tipo = Sesion.tipo();
        return tipo ? PERMISOS[tipo](pantalla) : pantalla === "login";   // sin sesion: solo el login
    }
}
Sesion.memoria = null;
