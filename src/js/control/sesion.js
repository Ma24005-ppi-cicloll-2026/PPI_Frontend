
const PANTALLAS_PUBLICAS = ["citas", "login"];
const PANTALLAS_DEL_EMPLEADO = ["citas", "dashboard", "consulta"];

class Sesion {

    // Normaliza el nombre para comparar roles de forma consistente.
    static normalizarRol(nombre) {
        return String(nombre ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
    }

    // Recupera la sesión del navegador o de la memoria.
    static obtener() {
        try { return JSON.parse(sessionStorage.getItem("sesion") || "null"); }
        catch (e) { return Sesion.memoria; }
    }

    // Conserva los contextos del empleado y avisa del inicio de sesión.
    static iniciar(datos) {
        Sesion.memoria = datos;
        try { sessionStorage.setItem("sesion", JSON.stringify(datos)); } catch (e) {   }
        window.dispatchEvent(new CustomEvent("galeno-sesion"));
    }

    // Cierra la sesión y pide borrar las copias locales de datos.
    static cerrar() {
        Sesion.memoria = null;
        try { sessionStorage.setItem("sesion", "null"); } catch (e) {   }
        if (typeof ApiCache !== "undefined") ApiCache.limpiar().catch(() => {});
        window.dispatchEvent(new CustomEvent("galeno-sesion"));
    }

    // Guarda la clínica y el rol sin volver a montar el dashboard.
    static elegirContexto(contexto) {
        const sesion = Sesion.obtener();
        if (!sesion) return;
        const nueva = { ...sesion, idPersonaRol: contexto.idPersonaRol, idRol: contexto.idRol, rol: contexto.rol,
                        idClinica: contexto.idClinica, clinica: contexto.clinica };
        Sesion.memoria = nueva;
        try { sessionStorage.setItem("sesion", JSON.stringify(nueva)); } catch (e) {   }
        window.dispatchEvent(new CustomEvent("galeno-contexto"));
    }

    // Devuelve la clínica y el rol elegidos si están disponibles.
    static contexto() {
        const s = Sesion.obtener();
        return s?.idPersonaRol ? { idPersonaRol: s.idPersonaRol, idRol: s.idRol, rol: s.rol,
                                   idClinica: s.idClinica, clinica: s.clinica } : null;
    }

    // Comprueba si la sesión permite acceder a la ruta indicada.
    static puede(pantalla) {
        return (Sesion.obtener() ? PANTALLAS_DEL_EMPLEADO : PANTALLAS_PUBLICAS).includes(pantalla);
    }
}
Sesion.memoria = null;
