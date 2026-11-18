class GalenoMarcaAcceso extends HTMLElement {
    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    // Monta la marca y adapta su contenido al ancho de la pantalla de acceso.
    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display:block; min-inline-size:0; }
                .marca {
                    box-sizing:border-box; position:relative; isolation:isolate; overflow:hidden;
                    display:flex; flex-direction:column; justify-content:center;
                    min-block-size:100%; padding:.75rem 1.25rem;
                    border-radius:calc(1rem - 1px) calc(1rem - 1px) 0 0;
                    background:linear-gradient(145deg, var(--celeste, #E3F1F7), var(--secundario, #CFE3DD));
                    color:var(--tinta, #1D3461);
                }
                .nombre { display:flex; align-items:center; gap:.5rem; margin:0; font-weight:700; }
                .nombre svg { inline-size:1.75rem; block-size:1.75rem; color:var(--foco, #2F6F73); }
                .titulo { margin:.25rem 0 0; font-size:1.125rem; line-height:1.2; font-weight:600; }
                .ampliado { display:none; }
                .lema { margin:.75rem 0 0; color:var(--tinta-suave, #44577B); }
                .forma {
                    position:absolute; z-index:-1; inset:-2rem -3rem auto auto; inline-size:16rem;
                    fill:var(--celeste-fuerte, #B5D8E8); stroke:var(--secundario-borde, #AECFC6);
                    opacity:.55; pointer-events:none;
                }
                .ecg { display:block; inline-size:100%; margin:1.5rem 0; color:var(--foco, #2F6F73); }
                /* pathLength permite dibujar el ECG completo con un desplazamiento de 1. */
                .trazo {
                    stroke-dasharray:1; stroke-dashoffset:1;
                    animation:pulso 4s ease-in-out infinite;
                }
                @keyframes pulso {
                    0% { stroke-dashoffset:1; }
                    48%, 72% { stroke-dashoffset:0; }
                    100% { stroke-dashoffset:-1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .trazo { animation:none; stroke-dasharray:none; stroke-dashoffset:0; }
                }
                ul { list-style:none; padding:0; margin:0; display:grid; gap:.75rem; }
                li { display:flex; align-items:center; gap:.75rem; }
                li svg { inline-size:1.375rem; block-size:1.375rem; flex:none; color:var(--foco, #2F6F73); }
                @container acceso (width >= 56rem) {
                    .marca { padding:2.5rem; border-radius:19px 0 0 19px; }
                    .nombre { font-size:1.125rem; }
                    .titulo { margin-top:1rem; font-size:2.25rem; }
                    .ampliado { display:block; }
                }
                @container acceso (width < 30rem) {
                    .marca { padding:.75rem 1rem; border-radius:calc(.75rem - 1px) calc(.75rem - 1px) 0 0; }
                }
            </style>
            <div class="marca">
                <svg class="forma" viewBox="0 0 260 220" aria-hidden="true" focusable="false">
                    <path d="M220 28c38 30 54 106 0 145s-145 33-176-9 3-87 49-110 89-56 127-26Z"/>
                    <path d="M223 67c15 33-6 80-49 103s-84 12-102-11 5-60 36-75 100-50 115-17Z" fill="none" stroke-width="2"/>
                </svg>
                <p class="nombre">
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5"
                        stroke-linecap="round" aria-hidden="true" focusable="false">
                        <rect x="2.5" y="2.5" width="27" height="27" rx="8"/><path d="M16 9.5v13M9.5 16h13"/>
                    </svg>
                    GalenoSV
                </p>
                <p class="titulo">Portal de empleados</p>
                <div class="ampliado">
                    <p class="lema">Cada paciente, con todo su contexto a la mano.</p>
                    <svg class="ecg" viewBox="0 0 240 64" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                        <path opacity=".22" d="M1 36h238"/>
                        <path class="trazo" pathLength="1" d="M1 36h45l8-15 8 27 9-20 8 8h29l10-10 9 18 10-34 10 39 9-13h83"/>
                    </svg>
                    <ul>
                        <li>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
                                aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="M5.5 15c.5-2 4.5-2 5 0M14 10h4m-4 4h4"/></svg>
                            Acceso con tu documento
                        </li>
                        <li>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
                                aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 5 2 2 4-4"/></svg>
                            Tus consultas del día
                        </li>
                        <li>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
                                aria-hidden="true" focusable="false"><path d="M3 8c5-4 13-4 18 0M6 12c3.5-2.8 8.5-2.8 12 0m-9 4c1.5-1.2 4.5-1.2 6 0M4 4l16 16"/><circle cx="12" cy="20" r=".5"/></svg>
                            Funciona sin conexión
                        </li>
                    </ul>
                </div>
            </div>`;
    }
}

customElements.define("galeno-marca-acceso", GalenoMarcaAcceso);
