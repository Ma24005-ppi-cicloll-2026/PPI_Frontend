// <galeno-tarjeta-agenda>: una consulta del Dashboard del empleado (HU3).
//   tarjeta.datos = {
//     idConsulta, paciente: { nombre, edad, documento }, fechaInicio, titulo,
//     procedimientos: [{ nombre, total, pasos: [{ idPaso, nombre, estado, quien, rol, fecha }] }],
//     finalizada, puedeAtender }
// (el total de pasos definidos lo agrega el dashboard; si no viene, se usa la cantidad de pasos hechos)
// Card compacta: franja de acento segun el estado, avatar de iniciales con tono segun el nombre,
// insignia de estado, chip de fecha/hora, barra de progreso "N de M pasos" y linea de tiempo
// compacta (por defecto los 3 pasos mas recientes, con "Ver N pasos mas" para expandir). Eventos:
//   "galeno-ver-registro" { idPaso }      boton "Registro" de un paso
//   "galeno-atender" { idConsulta }       boton "Atender consulta"
class GalenoTarjetaAgenda extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = null;
    }

    set datos(v) { this._datos = v; this.pintar(); }
    get datos() { return this._datos; }

    connectedCallback() { this.pintar(); }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // iniciales del paciente: primera letra de los dos primeros nombres/apellidos
    static iniciales(nombre) {
        return String(nombre ?? "").trim().split(/\s+/).slice(0, 2)
            .map(p => p[0] ? p[0].toUpperCase() : "").join("") || "?";
    }

    // tono del avatar (0..4) segun el nombre: hash simple y estable
    static tono(nombre) {
        let h = 0;
        for (const c of String(nombre ?? "")) h = (h * 31 + c.charCodeAt(0)) % 997;
        return h % 5;
    }

    conectar() {
        this.shadowRoot.querySelectorAll(".ver").forEach(b => b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-ver-registro",
                { detail: { idPaso: b.dataset.paso }, bubbles: true, composed: true }))));
        this.shadowRoot.querySelector(".atender")?.addEventListener("click", () => {
            if (this._datos?.puedeAtender !== false) this.dispatchEvent(new CustomEvent("galeno-atender",
                { detail: { idConsulta: this._datos?.idConsulta }, bubbles: true, composed: true }));
        });
        const mas = this.shadowRoot.querySelector(".mas");
        if (mas) mas.addEventListener("click", () => {
            const abierto = mas.getAttribute("aria-expanded") === "true";
            mas.setAttribute("aria-expanded", String(!abierto));
            mas.querySelector("span").textContent = abierto ? `Ver ${mas.dataset.n} pasos más` : "Ver menos";
            this.shadowRoot.querySelectorAll(".extra").forEach(li => { li.hidden = abierto; });
        });
    }

    pintar() {
        const d = this._datos || {};
        const p = d.paciente || {};
        const e = t => this.escapar(t);
        const finalizada = Boolean(d.finalizada);
        const texto = (n) => `paso${n === 1 ? "" : "s"}`;

        const proc = pr => {
            if (!pr.pasos.length) return `<p class="sin">Aún sin pasos realizados</p>`;
            const total = pr.total ?? pr.pasos.length;
            const hechos = pr.pasos.filter(s => s.estado === DatosClinica.COMPLETADO).length;
            const pct = total > 0 ? Math.round(hechos * 100 / total) : 0;
            const li = (s, extra) => `
                <li ${extra ? 'class="extra" hidden' : ""}>
                  <span class="marca ${s.estado === DatosClinica.COMPLETADO ? "hecho" : "curso"}" aria-hidden="true">${s.estado === DatosClinica.COMPLETADO ? "✓" : "…"}</span>
                  <span class="paso-nombre" title="${e(s.nombre)}">${e(s.nombre)}
                    <span class="ins ${s.estado === DatosClinica.COMPLETADO ? "ins-hecho" : "ins-curso"}">${e(s.estado || "En proceso")}</span></span>
                  <span class="quien-paso" title="${e((s.quien || "—") + (s.rol ? " · " + s.rol : ""))}">${e(s.quien || "—")}${s.rol ? " · " + e(s.rol) : ""}</span>
                  <time>${e(Agenda.hora(s.fecha))}</time>
                  <button type="button" class="ver" data-paso="${e(s.idPaso)}" aria-label="Ver registro de ${e(s.nombre)}">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    <span>Registro</span>
                  </button>
                </li>`;
            const visibles = pr.pasos.slice(0, 3), extras = pr.pasos.slice(3);
            return `
              <div class="progreso" aria-hidden="true"><span style="width:${pct}%"></span></div>
              <small class="cuenta">${hechos} de ${total} ${texto(total)}</small>
              <ol class="pasos">${visibles.map(s => li(s, false)).join("")}${extras.map(s => li(s, true)).join("")}</ol>
              ${extras.length ? `<button type="button" class="mas enlace" aria-expanded="false" data-n="${extras.length}"><span>Ver ${extras.length} pasos más</span></button>` : ""}`;
        };

        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; }
            article { position:relative; background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                      border:1px solid var(--borde, #E3EAEA); border-left:6px solid var(--primario, #2F6F73);
                      border-radius:var(--radio-tarjeta, .875rem); padding:.85rem .95rem;
                      height:100%; box-sizing:border-box; display:flex; flex-direction:column; gap:.55rem;
                      box-shadow:var(--sombra-1, none);
                      transition:box-shadow var(--velocidad, 180ms), border-color var(--velocidad, 180ms),
                                 transform var(--velocidad, 180ms); }
            article:hover { box-shadow:var(--sombra-2, none); border-color:var(--secundario-borde, #AECFC6);
                            border-left-color:var(--primario, #2F6F73); transform:translateY(-2px); }
            article.finalizada { border-left-color:var(--borde-fuerte, #9FB0B8); }
            article.finalizada:hover { border-left-color:var(--borde-fuerte, #9FB0B8); }
            header { display:flex; justify-content:space-between; gap:.7rem; align-items:flex-start; }
            .quien { display:flex; gap:.6rem; align-items:center; min-width:0; }
            .avatar { width:2.6rem; height:2.6rem; flex:0 0 auto; border-radius:50%;
                      display:grid; place-items:center; font-weight:700; letter-spacing:.02em; font-size:var(--fs-1, .875rem); }
            .tono-0 { background:var(--secundario, #CFE3DD); color:var(--tinta, #1D3461); }
            .tono-1 { background:var(--primario-suave, #E9F1EF); color:var(--primario-oscuro, #25585B); }
            .tono-2 { background:var(--aviso-fondo, #F7F0E3); color:var(--aviso, #96662C); }
            .tono-3 { background:var(--info-fondo, #EDF3F2); color:var(--tinta-suave, #44577B); }
            .tono-4 { background:var(--exito-fondo, #E9F3ED); color:var(--exito, #3E7C59); }
            .ident { min-width:0; }
            h3 { margin:0; font-size:var(--fs-2, 1rem); }
            .ident-datos { display:block; color:var(--tinta-suave, #44577B); font-size:var(--fs-0, .75rem);
                           white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .lado-sup { display:flex; flex-direction:column; align-items:flex-end; gap:.3rem; flex:0 0 auto; }
            .insignia { border-radius:999px; padding:.1rem .6rem; font-size:var(--fs-0, .75rem); font-weight:700; white-space:nowrap; }
            .insignia.curso { background:var(--primario-suave, #E9F1EF); color:var(--primario-oscuro, #25585B); border:1px solid var(--secundario-borde, #AECFC6); }
            .insignia.fin { background:var(--fondo, #F5F8F8); color:var(--tinta-suave, #44577B); border:1px solid var(--borde-fuerte, #9FB0B8); }
            .cuando { display:flex; flex-direction:column; align-items:flex-end; line-height:1.25;
                      background:var(--info-fondo, #EDF3F2); border-radius:var(--radio-control, .625rem); padding:.2rem .55rem;
                      font-size:var(--fs-0, .75rem); color:var(--tinta-suave, #44577B); white-space:nowrap; }
            .cuando strong { color:var(--tinta, #1D3461); font-size:var(--fs-1, .875rem); }
            .ref { margin:0; color:var(--tinta-suave, #44577B); font-size:var(--fs-0, .75rem); }
            .proc h4 { margin:0 0 .3rem; font-size:var(--fs-1, .875rem); display:flex; align-items:center; gap:.4rem; color:var(--tinta, #1D3461); }
            .proc h4 svg { color:var(--primario, #2F6F73); flex:0 0 auto; }
            .progreso { height:.4rem; border-radius:999px; background:var(--info-fondo, #EDF3F2); overflow:hidden; }
            .progreso span { display:block; height:100%; border-radius:999px; background:var(--primario, #2F6F73); transition:width var(--velocidad, 180ms); }
            .cuenta { display:block; margin-top:.2rem; color:var(--tinta-suave, #44577B); font-size:var(--fs-0, .75rem); }
            ol { list-style:none; margin:.45rem 0 0; padding:0; }
            .pasos li { display:grid; grid-template-columns:auto minmax(0, 1.1fr) minmax(0, 1fr) auto auto;
                        gap:.55rem; align-items:center; padding:.35rem 0; }
            .pasos li + li { border-top:1px dashed var(--borde, #E3EAEA); }
            .pasos .extra[hidden] { display:none; }
            .marca { width:1.15rem; height:1.15rem; border-radius:50%; display:grid; place-items:center;
                     font-size:.65rem; color:#fff; background:var(--inactivo, #8CA0A8); flex:0 0 auto; }
            .marca.hecho { background:var(--exito, #3E7C59); }
            .paso-nombre { min-width:0; font-weight:600; font-size:var(--fs-1, .875rem);
                           white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:.35rem; }
            .ins { flex:0 0 auto; border-radius:999px; padding:0 .45rem; font-size:.68rem; font-weight:700; }
            .ins-hecho { background:var(--exito-fondo, #E9F3ED); color:var(--exito, #3E7C59); }
            .ins-curso { background:var(--aviso-fondo, #F7F0E3); color:var(--aviso, #96662C); }
            .quien-paso { min-width:0; color:var(--tinta-suave, #44577B); font-size:var(--fs-0, .75rem);
                          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            time { font-size:var(--fs-0, .75rem); color:var(--tinta-suave, #44577B); white-space:nowrap; }
            button { font:inherit; cursor:pointer; transition:background var(--velocidad, 180ms), color var(--velocidad, 180ms); }
            .ver { display:inline-flex; align-items:center; gap:.3rem; border:1px solid var(--borde-fuerte, #9FB0B8);
                   background:var(--superficie, #fff); color:var(--tinta, #1D3461); border-radius:999px;
                   padding:.25rem .55rem; font-size:var(--fs-0, .75rem); font-weight:600; white-space:nowrap; }
            .ver:hover { background:var(--primario-suave, #E9F1EF); }
            .ver svg { color:var(--primario, #2F6F73); }
            .mas { margin-top:.35rem; padding:.25rem 0; border:0; background:none; color:var(--primario-oscuro, #25585B);
                   font-size:var(--fs-1, .875rem); font-weight:600; text-decoration:underline; text-underline-offset:2px; }
            .mas:hover { background:none; color:var(--tinta, #1D3461); }
            .atender { margin-top:auto; width:100%; min-height:2.75rem; border:0; background:var(--primario, #2F6F73);
                       color:var(--sobre-primario, #fff); padding:.5rem .8rem; font-weight:600;
                       border-radius:var(--radio-control, .625rem); }
            .atender:hover:not(:disabled) { background:var(--primario-oscuro, #25585B); }
            .atender:disabled { background:var(--inactivo, #8CA0A8); cursor:not-allowed; }
            .final { margin:auto 0 0; font-weight:600; color:var(--tinta-suave, #44577B); }
            .sin { margin:.2rem 0 0; color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
            @container (max-width:21.99rem) {
              .pasos li { grid-template-columns:auto minmax(0, 1fr) auto auto; }
              .quien-paso { display:none; }
            }
          </style>
          <article class="${finalizada ? "finalizada" : ""}">
            <header>
              <div class="quien">
                <span class="avatar tono-${GalenoTarjetaAgenda.tono(p.nombre)}" aria-hidden="true">${e(GalenoTarjetaAgenda.iniciales(p.nombre))}</span>
                <div class="ident">
                  <h3>${e(p.nombre || "Paciente")}</h3>
                  <small class="ident-datos" title="${e((p.edad != null ? p.edad + " años · " : "") + (p.documento || "—"))}">${p.edad != null ? e(p.edad) + " años · " : ""}${e(p.documento || "—")}</small>
                </div>
              </div>
              <div class="lado-sup">
                <span class="insignia ${finalizada ? "fin" : "curso"}">${finalizada ? "Finalizada" : "En curso"}</span>
                <div class="cuando"><strong>${e(Agenda.dia(d.fechaInicio))}</strong><span>${e(Agenda.hora(d.fechaInicio))}</span></div>
              </div>
            </header>
            ${d.titulo ? `<small class="ref">${e(d.titulo)}</small>` : ""}
            ${(d.procedimientos || []).map(pr => `<section class="proc"><h4>
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><path d="M9 3v2m6-2v2M9 11h6M9 15h6M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                ${e(pr.nombre)}</h4>${proc(pr)}</section>`).join("")}
            ${finalizada ? '<p class="final">Consulta finalizada</p>' : `<button type="button" class="atender" ${d.puedeAtender === false ? "disabled" : ""}>Atender consulta</button>`}
          </article>`;
        this.conectar();
    }
}

customElements.define("galeno-tarjeta-agenda", GalenoTarjetaAgenda);
