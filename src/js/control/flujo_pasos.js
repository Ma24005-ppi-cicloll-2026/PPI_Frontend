class FlujoPasos {

    // Recibe las utilidades para comparar fechas y estados de los pasos.
    constructor({ datos = new DatosClinica() } = {}) {
        this.datos = datos;
    }

    // Ordena los pasos por dependencia. AFTER sitúa el paso después de su referencia.
    ordenar(pasos, secuencias = []) {
        const ids = new Set(pasos.map(p => p.idProcedimientoPaso));
        const despuesDe = new Map(pasos.map(p => [p.idProcedimientoPaso, new Set()]));
        const faltan = new Map(pasos.map(p => [p.idProcedimientoPaso, 0]));
        // Registra una dependencia válida y evita contarla dos veces.
        const unir = (antes, despues) => {
            if (!ids.has(antes) || !ids.has(despues) || antes === despues || despuesDe.get(antes).has(despues)) return;
            despuesDe.get(antes).add(despues);
            faltan.set(despues, faltan.get(despues) + 1);
        };
        secuencias.forEach(s => {
            const paso = s.idProcedimientoPaso?.idProcedimientoPaso;
            const referencia = s.idProcedimientoPasoReferencia;
            const tipo = String(s.tipoSecuencia ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (/after|despues|posterior/.test(tipo)) unir(referencia, paso);
            else if (/before/.test(tipo)) unir(paso, referencia);
            else if (/ant|prev/.test(tipo)) unir(referencia, paso);
            else unir(paso, referencia);
        });
        const orden = [];
        const pendientes = [...pasos];
        // Si la secuencia forma un ciclo, conserva el orden de los pasos pendientes.
        while (pendientes.length) {
            const siguiente = pendientes.find(p => faltan.get(p.idProcedimientoPaso) === 0) ?? pendientes[0];
            pendientes.splice(pendientes.indexOf(siguiente), 1);
            orden.push(siguiente);
            despuesDe.get(siguiente.idProcedimientoPaso).forEach(d => faltan.set(d, faltan.get(d) - 1));
        }
        return orden;
    }

    // Obtiene y ordena los pasos definidos para el procedimiento.
    definidos(idProcedimiento, todosLosPasos, secuencias) {
        const suyos = todosLosPasos.filter(p => p.idProcedimiento?.idProcedimiento === idProcedimiento);
        return this.ordenar(suyos, secuencias);
    }

    // Ordena los registros por fecha de inicio para asociarlos con los pasos definidos.
    realizados(idConsultaProcedimiento, todosLosRealizados) {
        return todosLosRealizados
            .filter(r => r.idConsultaProcedimiento?.idConsultaProcedimiento === idConsultaProcedimiento)
            .sort((a, b) => this.datos.milisegundos(a.fechaInicio) - this.datos.milisegundos(b.fechaInicio));
    }

    // Calcula el paso actual: el primero que no está completado, aunque lo hayan devuelto.
    estado(definidos, realizados) {
        const pasos = definidos.length ? definidos : [{ idProcedimientoPaso: null, nombre: "Atención", idRol: null }];
        const pendiente = realizados.findIndex(r => r.estado !== this.datos.completado);
        const hechos = pendiente >= 0 ? pendiente : realizados.length;
        const completo = hechos >= pasos.length;
        const actual = completo ? null : hechos;
        const devuelto = actual !== null && realizados[actual]?.estado === this.datos.devuelto;
        return { definidos: pasos, realizados, actual, completo, devuelto };
    }

    // Permite devolver el expediente si hay un paso anterior ya registrado.
    puedeDevolver(estado) {
        return !estado.completo && estado.actual > 0 && !!estado.realizados[estado.actual - 1];
    }

    // Permite atender el paso al rol indicado o cuando el paso no tiene rol.
    loAtiende(estado, idRol) {
        if (estado.completo) return false;
        const rolDelPaso = estado.definidos[estado.actual]?.idRol?.idRol;
        return !rolDelPaso || !idRol || rolDelPaso === idRol;
    }
}
