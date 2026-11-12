// Base de datos de ejemplo para las pruebas de las pantallas (la misma forma que devuelve el backend).
const Datos = (() => {
    const dia = (desfase, hora = 9) => { const d = new Date(); d.setDate(d.getDate() + desfase); d.setHours(hora, 0, 0, 0); return d.toISOString(); };
    // fecha local "AAAA-MM-DD" de hoy + desfase dias (la que escribiria el usuario en un <input type=date>)
    const fechaLocal = desfase => { const d = new Date(); d.setDate(d.getDate() + desfase); const dos = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
    const personas = {
        ana: { idPersona: "p-ana", nombres: "Ana", apellidos: "Mejía", fechaNacimiento: "1990-05-10" },
        luis: { idPersona: "p-luis", nombres: "Luis", apellidos: "Pérez", fechaNacimiento: "2000-01-15" },
        jenni: { idPersona: "p-jenni", nombres: "Jenni", apellidos: "Rivas", fechaNacimiento: "1995-03-20" }
    };
    const clinicas = { sa: { idClinica: "c-sa", nombre: "Santa Ana" }, sm: { idClinica: "c-sm", nombre: "San Miguel" } };
    const roles = { med: { idRol: "r-med", nombre: "Médico" }, pac: { idRol: "r-pac", nombre: "Paciente" }, rec: { idRol: "r-rec", nombre: "Recepcionista" } };
    const pr = (id, persona, rol, clinica) => ({ idPersonaRol: id, idPersona: personas[persona], idRol: roles[rol], idClinica: clinicas[clinica] });
    const personasRoles = {
        anaMedSa: pr("pr-ana-med-sa", "ana", "med", "sa"), anaRecSa: pr("pr-ana-rec-sa", "ana", "rec", "sa"),
        anaMedSm: pr("pr-ana-med-sm", "ana", "med", "sm"),
        luisSa: pr("pr-luis-sa", "luis", "pac", "sa"), luisSm: pr("pr-luis-sm", "luis", "pac", "sm"),
        jenniSa: pr("pr-jenni-sa", "jenni", "pac", "sa")
    };
    const tipos = [
        { idTipoDocumento: "t-dui", nombre: "DUI", indicaciones: "00000000-0", expresionRegular: "^\\d{8}-\\d$", activo: true },
        { idTipoDocumento: "t-pas", nombre: "Pasaporte", indicaciones: "A0000000", expresionRegular: "^[A-Z]\\d{7}$", activo: true }];
    const doc = (id, persona, tipo, valor) => ({ idDocumento: id, idPersona: personas[persona], idTipoDocumento: tipos[tipo], valor });
    const procedimiento = { idProcedimiento: "pc-gen", nombre: "Consulta general", activo: true };
    const pasos = [
        { idProcedimientoPaso: "s-triaje", nombre: "Triaje", indicaFin: false, idProcedimiento: procedimiento, idRol: roles.rec },
        { idProcedimientoPaso: "s-medica", nombre: "Consulta médica", indicaFin: true, idProcedimiento: procedimiento, idRol: roles.med }];
    const consulta = (id, rol, desfase, extra = {}) => ({ idConsulta: id, fechaInicio: dia(desfase), fechaFin: null, observaciones: "", referenciaExterna: "", idPersonaRol: personasRoles[rol], ...extra });
    const consultas = [
        consulta("k-hoy", "luisSa", 0),                    // ya paso el triaje: le toca al medico
        consulta("k-manana", "jenniSa", 1),                // sin pasos: le toca a recepcion
        consulta("k-ayer", "luisSa", -1),
        consulta("k-sm", "luisSm", 0),
        consulta("k-cerrada", "luisSa", 0, { fechaFin: dia(0, 10) })];
    const cp = (id, k, obs = "") => ({ idConsultaProcedimiento: id, idProcedimiento: "pc-gen", fechaInicio: dia(0), fechaFin: null, observaciones: obs, idConsulta: consultas.find(c => c.idConsulta === k) });
    return {
        dia, fechaLocal, personas, clinicas, roles, personasRoles, tipos, pasos, procedimiento,
        bd() {
            return {
                tipo_documento: tipos, persona: Object.values(personas), clinica: Object.values(clinicas), rol: Object.values(roles),
                persona_rol: Object.values(personasRoles),
                documento: [doc("d1", "ana", 0, "01234567-8"), doc("d2", "luis", 0, "11111111-1"), doc("d3", "jenni", 1, "A1234567")],
                consulta: consultas,
                procedimiento: [procedimiento],
                procedimiento_paso: pasos,
                procedimiento_paso_secuencia: [{ idProcedimientoPasoSecuencia: "q1", idProcedimientoPaso: pasos[0], idProcedimientoPasoReferencia: "s-medica", tipoSecuencia: "siguiente" }],
                consulta_procedimiento: [cp("cp-hoy", "k-hoy"), cp("cp-manana", "k-manana"), cp("cp-ayer", "k-ayer"), cp("cp-sm", "k-sm"), cp("cp-cerrada", "k-cerrada")],
                consulta_procedimiento_paso: [{ idConsultaProcedimientoPaso: "cpp1", fechaInicio: dia(0, 8), fechaFin: dia(0, 8), estado: "Completado", idConsultaProcedimiento: { idConsultaProcedimiento: "cp-hoy" }, idPersonaRol: personasRoles.anaRecSa }],
                orden_examen: [{ idOrdenExamen: "oe1", fechaCreacion: dia(0, 8), indicaciones: "Hemograma", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "cpp1" } }],
                examen_resultado: [{ idExamenResultado: "er1", resultado: "Normal", idOrdenExamen: { idOrdenExamen: "oe1" } }],
                examen: [{ idExamen: "e-hemo", nombre: "Hemograma", activo: true }, { idExamen: "e-rx", nombre: "Radiografía", activo: true }],
                procedimiento_paso_examen: [
                    { idProcedimientoPasoExamen: "x1", activo: true, idExamen: { idExamen: "e-hemo" }, idProcedimientoPaso: { idProcedimientoPaso: "s-medica" } },
                    { idProcedimientoPasoExamen: "x2", activo: true, idExamen: { idExamen: "e-rx" }, idProcedimientoPaso: { idProcedimientoPaso: "s-medica" } }],
                tipo_examen: [{ idTipoExamen: "te-lab", nombre: "Laboratorio" }, { idTipoExamen: "te-img", nombre: "Imagen" }],
                examen_tipo_examen: [
                    { idExamenTipoExamen: "et1", idExamen: { idExamen: "e-hemo" }, idTipoExamen: { idTipoExamen: "te-lab", nombre: "Laboratorio" } },
                    { idExamenTipoExamen: "et2", idExamen: { idExamen: "e-rx" }, idTipoExamen: { idTipoExamen: "te-img", nombre: "Imagen" } }]
            };
        }
    };
})();
