class FlujoPasos {

    // Ordena los pasos por dependencia. AFTER sitúa el paso después de su referencia.
    static ordenar(pasos, secuencias = []) {
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
    static definidos(idProcedimiento, todosLosPasos, secuencias) {
        const suyos = todosLosPasos.filter(p => p.idProcedimiento?.idProcedimiento === idProcedimiento);
        return FlujoPasos.ordenar(suyos, secuencias);
    }

    // Ordena los registros por fecha de inicio para asociarlos con los pasos definidos.
    static realizados(idConsultaProcedimiento, todosLosRealizados) {
        return todosLosRealizados
            .filter(r => r.idConsultaProcedimiento?.idConsultaProcedimiento === idConsultaProcedimiento)
            .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
    }

    // Calcula el paso actual y usa Atención si el procedimiento no define pasos.
    static estado(definidos, realizados) {
        const pasos = definidos.length ? definidos : [{ idProcedimientoPaso: null, nombre: "Atención", idRol: null }];
        const ultimo = realizados[realizados.length - 1];
        const ultimoCompletado = ultimo && ultimo.estado === DatosClinica.COMPLETADO;
        const hechos = ultimoCompletado ? realizados.length : Math.max(realizados.length - 1, 0);
        const completo = hechos >= pasos.length;
        return { definidos: pasos, realizados, actual: completo ? null : hechos, completo };
    }

    // Permite atender el paso al rol indicado o cuando el paso no tiene rol.
    static loAtiende(estado, idRol) {
        if (estado.completo) return false;
        const rolDelPaso = estado.definidos[estado.actual]?.idRol?.idRol;
        return !rolDelPaso || !idRol || rolDelPaso === idRol;
    }
}
