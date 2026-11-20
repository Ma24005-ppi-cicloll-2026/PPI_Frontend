// Copia de respaldo por si el navegador bloquea sessionStorage.
const respaldoSesion = { valor: null };

class Sesion {

    // Recibe el almacén del navegador y define qué pantallas ve cada tipo de usuario.
    constructor({ almacen = globalThis.sessionStorage, ventana = globalThis.window, cache = null } = {}) {
        this.almacen = almacen;
        this.ventana = ventana;
        this.cache = cache;
        this.publicas = ["citas", "login"];
        this.delEmpleado = ["citas", "dashboard", "consulta"];
    }

    // Normaliza el nombre para comparar roles de forma consistente.
    normalizarRol(nombre) {
        return String(nombre ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
    }

    // Recupera la sesión del navegador o de la copia de respaldo.
    obtener() {
        try { return JSON.parse(this.almacen.getItem("sesion") || "null"); }
        catch (e) { return respaldoSesion.valor; }
    }

    // Guarda la sesión y avisa a la aplicación con un evento.
    escribir(datos, evento) {
        respaldoSesion.valor = datos;
        try { this.almacen.setItem("sesion", JSON.stringify(datos)); } catch (e) {   }
        this.ventana?.dispatchEvent(new CustomEvent(evento));
    }

    // Conserva los contextos del empleado y avisa del inicio de sesión.
    iniciar(datos) { this.escribir(datos, "galeno-sesion"); }

    // Cierra la sesión y pide borrar las copias locales de datos.
    cerrar() {
        const cache = this.cache ?? (typeof ApiCache !== "undefined" ? new ApiCache() : null);
        cache?.limpiar().catch(() => {});
        this.escribir(null, "galeno-sesion");
    }

    // Guarda la clínica y el rol sin volver a montar el dashboard.
    elegirContexto(contexto) {
        const sesion = this.obtener();
        if (!sesion) return;
        this.escribir({ ...sesion, idPersonaRol: contexto.idPersonaRol, idRol: contexto.idRol, rol: contexto.rol,
                        idClinica: contexto.idClinica, clinica: contexto.clinica }, "galeno-contexto");
    }

    // Devuelve la clínica y el rol elegidos si están disponibles.
    contexto() {
        const s = this.obtener();
        return s?.idPersonaRol ? { idPersonaRol: s.idPersonaRol, idRol: s.idRol, rol: s.rol,
                                   idClinica: s.idClinica, clinica: s.clinica } : null;
    }

    // Comprueba si la sesión permite acceder a la ruta indicada.
    puede(pantalla) {
        return (this.obtener() ? this.delEmpleado : this.publicas).includes(pantalla);
    }
}
