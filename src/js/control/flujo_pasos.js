// Los pasos de un procedimiento y en cual va una consulta.
//
// En el backend:
//   - ProcedimientoPaso            = un paso DEFINIDO de un procedimiento (ej. "Triaje", "Consulta medica").
//   - ProcedimientoPasoSecuencia   = que paso va antes o despues de otro (idProcedimientoPasoReferencia + tipoSecuencia).
//   - ConsultaProcedimientoPaso    = un paso REALIZADO en una consulta (estado, fechas y quien lo hizo).
//
// Un paso realizado no guarda cual paso definido era, asi que se usa el orden: el 1.º paso realizado de un
// procedimiento es el 1.º paso definido, el 2.º realizado es el 2.º definido, y asi. Por eso los pasos
// definidos se ordenan siempre igual (ordenar) y los realizados se ordenan por su fecha de inicio.
class FlujoPasos {

    // Pasos definidos de UN procedimiento, en orden. secuencias = todas las ProcedimientoPasoSecuencia.
    //   - tipoSecuencia que contiene "ant" o "prev": el paso de referencia va ANTES.
    //   - cualquier otro ("siguiente", "despues"...): el paso de referencia va DESPUES.
    // Los pasos que no quedan ordenados por la secuencia se dejan al final, en el orden en que llegaron.
    static ordenar(pasos, secuencias = []) {
        const ids = new Set(pasos.map(p => p.idProcedimientoPaso));
        const despuesDe = new Map(pasos.map(p => [p.idProcedimientoPaso, new Set()]));   // paso -> los que van despues
        const faltan = new Map(pasos.map(p => [p.idProcedimientoPaso, 0]));              // paso -> cuantos van antes
        const unir = (antes, despues) => {
            if (!ids.has(antes) || !ids.has(despues) || antes === despues || despuesDe.get(antes).has(despues)) return;
            despuesDe.get(antes).add(despues);
            faltan.set(despues, faltan.get(despues) + 1);
        };
        secuencias.forEach(s => {
            const paso = s.idProcedimientoPaso?.idProcedimientoPaso;
            const referencia = s.idProcedimientoPasoReferencia;
            if (/ant|prev/i.test(s.tipoSecuencia ?? "")) unir(referencia, paso); else unir(paso, referencia);
        });
        const orden = [];
        const pendientes = [...pasos];
        while (pendientes.length) {
            const siguiente = pendientes.find(p => faltan.get(p.idProcedimientoPaso) === 0) ?? pendientes[0];   // sin salida: ciclo
            pendientes.splice(pendientes.indexOf(siguiente), 1);
            orden.push(siguiente);
            despuesDe.get(siguiente.idProcedimientoPaso).forEach(d => faltan.set(d, faltan.get(d) - 1));
        }
        return orden;
    }

    // Los pasos definidos del procedimiento `idProcedimiento`, ya en orden.
    static definidos(idProcedimiento, todosLosPasos, secuencias) {
        const suyos = todosLosPasos.filter(p => p.idProcedimiento?.idProcedimiento === idProcedimiento);
        return FlujoPasos.ordenar(suyos, secuencias);
    }

    // Pasos realizados de un ConsultaProcedimiento, el primero primero.
    static realizados(idConsultaProcedimiento, todosLosRealizados) {
        return todosLosRealizados
            .filter(r => r.idConsultaProcedimiento?.idConsultaProcedimiento === idConsultaProcedimiento)
            .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
    }

    // Donde va un procedimiento. Devuelve:
    //   definidos   los pasos definidos (si no hay ninguno se usa un paso unico "Atención", asi igual se puede atender)
    //   realizados  los pasos realizados
    //   actual      posicion del paso que toca (el que esta "En proceso" o el siguiente por empezar); null si ya termino
    //   completo    true si todos los pasos estan completados
    static estado(definidos, realizados) {
        const pasos = definidos.length ? definidos : [{ idProcedimientoPaso: null, nombre: "Atención", idRol: null }];
        const ultimo = realizados[realizados.length - 1];
        const ultimoCompletado = ultimo && ultimo.estado === DatosClinica.COMPLETADO;
        const hechos = ultimoCompletado ? realizados.length : Math.max(realizados.length - 1, 0);
        const completo = hechos >= pasos.length;
        return { definidos: pasos, realizados, actual: completo ? null : hechos, completo };
    }

    // true si el paso que toca puede atenderlo `idRol` (los pasos sin rol los puede atender cualquiera)
    static loAtiende(estado, idRol) {
        if (estado.completo) return false;
        const rolDelPaso = estado.definidos[estado.actual]?.idRol?.idRol;
        return !rolDelPaso || !idRol || rolDelPaso === idRol;
    }
}
