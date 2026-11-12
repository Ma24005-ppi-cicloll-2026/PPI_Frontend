// Quien inicio sesion. Solo los EMPLEADOS se autentican (el paciente consulta sus citas sin iniciar sesion).
//   - Sin sesion se puede ver: Buscar citas (HU1) y Iniciar sesion (HU2).
//   - Con sesion se puede ver: Dashboard (HU3), Consulta (HU4) y Buscar citas.
//
// La sesion guarda a la persona y TODOS sus roles-clinicas ("contextos"). Al entrar al Dashboard elige uno y se
// guardan tambien idPersonaRol, rol, idRol, clinica e idClinica: eso decide que consultas ve y que pasos atiende.
// OJO: esto solo ESCONDE pantallas en el navegador; no protege los datos (eso es del backend).

const PANTALLAS_PUBLICAS = ["citas", "login"];
const PANTALLAS_DEL_EMPLEADO = ["citas", "dashboard", "consulta"];

class Sesion {

    // "Médico " -> "medico": asi no importa si el rol se escribio con tilde o mayusculas
    static normalizarRol(nombre) {
        return String(nombre ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
    }

    static obtener() {
        try { return JSON.parse(sessionStorage.getItem("sesion") || "null"); }
        catch (e) { return Sesion.memoria; }          // si el navegador bloquea sessionStorage
    }

    // datos: { idPersona, nombre, contextos: [{ idPersonaRol, idRol, rol, idClinica, clinica }] }
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

    // Guarda el rol y la clinica con los que trabajara el empleado (sin reiniciar la pantalla).
    static elegirContexto(contexto) {
        const sesion = Sesion.obtener();
        if (!sesion) return;
        const nueva = { ...sesion, idPersonaRol: contexto.idPersonaRol, idRol: contexto.idRol, rol: contexto.rol,
                        idClinica: contexto.idClinica, clinica: contexto.clinica };
        Sesion.memoria = nueva;
        try { sessionStorage.setItem("sesion", JSON.stringify(nueva)); } catch (e) { /* queda en memoria */ }
        window.dispatchEvent(new CustomEvent("galeno-contexto"));   // solo el encabezado
    }

    // El rol y la clinica elegidos, o null si todavia no eligio
    static contexto() {
        const s = Sesion.obtener();
        return s?.idPersonaRol ? { idPersonaRol: s.idPersonaRol, idRol: s.idRol, rol: s.rol,
                                   idClinica: s.idClinica, clinica: s.clinica } : null;
    }

    static puede(pantalla) {
        return (Sesion.obtener() ? PANTALLAS_DEL_EMPLEADO : PANTALLAS_PUBLICAS).includes(pantalla);
    }
}
Sesion.memoria = null;
