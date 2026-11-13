# GalenoFE (PPI115 · segundo parcial)

PWA + SPA hecha solo con ECMAScript y Web Components (sin librerías, sin estilos de terceros).
Consume el API REST de GalenoSV (`http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/`).

## Historias de usuario (en el orden de la rúbrica)

| HU | Pantalla | Ruta | Quién |
|---|---|---|---|
| 1 Búsqueda de citas | Tipo de documento → número → clínica donde está registrado como paciente → rango de fechas. Cada cita es una card (fecha, hora, clínica, procedimientos) con el ticket en PDF **generado por el backend** (`GET /consulta/{id}/ticket`) | `#/citas` | Público |
| 2 Login | Solo tipo de documento y número (validado con la expresión regular del tipo). Solo empleados | `#/login` | Empleado |
| 3 Dashboard | Elige clínica y rol entre los suyos → "Cargar consultas" → filtros (paciente, Hoy/Pasado/Futuro/Rango) → cards con pasos, "Ver registro" y "Atender consulta" | `#/dashboard` | Empleado |
| 4 Consulta | Notas, exámenes por categoría, "Guardar y avanzar al siguiente paso", "Anterior", "Finalizar consulta" | `#/consulta/<id>` | Empleado |

### Convenciones (el backend no tiene campos para esto y no se tocó el esquema)
- El paso realizado N de un procedimiento corresponde al paso definido N (ordenados por `procedimiento_paso_secuencia`). Sin pasos definidos se usa un paso único "Atención".
- `tipoSecuencia` se interpreta sin distinguir mayúsculas ni tildes: `AFTER`/`Después`/`Posterior` significa que el paso nuevo va **después** de la referencia (la referencia va antes; así lo crea el backend en `ProcedimientoPasoModels.crearSecuencia`), `BEFORE` que va antes, `anterior`/`previo` que la referencia va antes. El **primer paso** de un procedimiento es el que no depende de otro (ninguna secuencia lo tiene como paso), igual que `calcularPrimerPaso` del backend; los pasos que la secuencia no ordena quedan al final en el orden en que llegaron.
- Las notas de cada paso se guardan en `consulta_procedimiento.observaciones`, una línea por paso: `Paso 2 (Consulta médica) · Autor: texto`.
- Un examen asignado crea una `orden_examen` con el nombre del examen en `indicaciones`.
- Estados de un paso: `En proceso` / `Completado`.

## Correr
- App: `browser-sync start --server src -f "**/*" --no-open` y el backend en Liberty (9080).
- Pruebas: `browser-sync start --server . --startPath test/index.html --no-open`.

## Al agregar un archivo a `src/`
Anotarlo en `ARCHIVOS` de `src/sw.js` y subir `VERSION`, para que también funcione sin conexión.

