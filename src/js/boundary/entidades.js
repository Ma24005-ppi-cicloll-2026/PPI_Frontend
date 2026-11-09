// Descripcion de las 8 pantallas de administracion (solo para el personal).
// ListadoModel las dibuja todas igual: cada una solo dice su service, sus columnas (tabla)
// y sus campos (formulario). Para agregar otra pantalla de listado: una entrada aqui.
const ACTIVO = { nombre: "activo", etiqueta: "Activo", tipo: "casilla" };

const ENTIDADES = {
    persona: {
        titulo: "Personas", descripcion: "Pacientes y personal registrado",
        servicio: () => new PersonaService(), id: "idPersona",
        columnas: [
            { campo: "nombres", titulo: "Nombres" },
            { campo: "apellidos", titulo: "Apellidos" },
            { campo: "fechaNacimiento", titulo: "Nacimiento", formato: GestorFechas.aFecha }
        ],
        campos: [
            { nombre: "nombres", etiqueta: "Nombres", tipo: "texto", requerido: true },
            { nombre: "apellidos", etiqueta: "Apellidos", tipo: "texto", requerido: true },
            { nombre: "fechaNacimiento", etiqueta: "Fecha de nacimiento", tipo: "fecha" }
        ]
    },
    clinica: {
        titulo: "Clínicas", descripcion: "Clínicas donde se atiende",
        servicio: () => new ClinicaService(), id: "idClinica",
        columnas: [
            { campo: "nombre", titulo: "Nombre" }, { campo: "tipo", titulo: "Tipo" },
            { campo: "comentarios", titulo: "Comentarios" }, { campo: "activo", titulo: "Activo" }
        ],
        campos: [
            { nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
            { nombre: "tipo", etiqueta: "Tipo", tipo: "texto" },
            { nombre: "comentarios", etiqueta: "Comentarios", tipo: "area" }, ACTIVO
        ]
    },
    examen: {
        titulo: "Exámenes", descripcion: "Catálogo de exámenes",
        servicio: () => new ExamenService(), id: "idExamen",
        columnas: [{ campo: "nombre", titulo: "Nombre" }, { campo: "observaciones", titulo: "Observaciones" },
                   { campo: "activo", titulo: "Activo" }],
        campos: [{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
                 { nombre: "observaciones", etiqueta: "Observaciones", tipo: "area" }, ACTIVO]
    },
    procedimiento: {
        titulo: "Procedimientos", descripcion: "Procedimientos médicos y sus pasos",
        servicio: () => new ProcedimientoService(), id: "idProcedimiento",
        columnas: [{ campo: "nombre", titulo: "Nombre" }, { campo: "observaciones", titulo: "Observaciones" },
                   { campo: "activo", titulo: "Activo" }],
        campos: [{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
                 { nombre: "observaciones", etiqueta: "Observaciones", tipo: "area" }, ACTIVO]
    },
    tipo_documento: {
        titulo: "Tipos de documento", descripcion: "DUI, NIT, pasaporte...",
        servicio: () => new TipoDocumentoService(), id: "idTipoDocumento",
        columnas: [{ campo: "nombre", titulo: "Nombre" }, { campo: "indicaciones", titulo: "Indicaciones" },
                   { campo: "expresionRegular", titulo: "Expresión regular" }, { campo: "activo", titulo: "Activo" }],
        campos: [{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
                 { nombre: "indicaciones", etiqueta: "Indicaciones", tipo: "area" },
                 { nombre: "expresionRegular", etiqueta: "Expresión regular", tipo: "texto" }, ACTIVO]
    },
    tipo_medio_contacto: {
        titulo: "Tipos de medio de contacto", descripcion: "Teléfono, correo...",
        servicio: () => new TipoMedioContactoService(), id: "idTipoMedioContacto",
        columnas: [{ campo: "nombre", titulo: "Nombre" }, { campo: "indicaciones", titulo: "Indicaciones" },
                   { campo: "expresionRegular", titulo: "Expresión regular" }, { campo: "activo", titulo: "Activo" }],
        campos: [{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
                 { nombre: "indicaciones", etiqueta: "Indicaciones", tipo: "area" },
                 { nombre: "expresionRegular", etiqueta: "Expresión regular", tipo: "texto" }, ACTIVO]
    },
    rol: {
        titulo: "Roles", descripcion: "Roles del personal y pacientes",
        servicio: () => new RolService(), id: "idRol",
        columnas: [{ campo: "nombre", titulo: "Nombre" }, { campo: "observaciones", titulo: "Observaciones" },
                   { campo: "activo", titulo: "Activo" }],
        campos: [{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
                 { nombre: "observaciones", etiqueta: "Observaciones", tipo: "area" }, ACTIVO]
    },
    tipo_examen: {
        titulo: "Tipos de examen", descripcion: "Clasificación de los exámenes",
        servicio: () => new TipoExamenService(), id: "idTipoExamen",
        columnas: [{ campo: "nombre", titulo: "Nombre" }, { campo: "observaciones", titulo: "Observaciones" },
                   { campo: "activo", titulo: "Activo" }],
        campos: [{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
                 { nombre: "observaciones", etiqueta: "Observaciones", tipo: "area" }, ACTIVO]
    }
};
