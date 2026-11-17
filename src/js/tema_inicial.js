// Aplica el tema guardado ANTES de pintar para que no parpadee claro->oscuro.
// Vive en un archivo aparte para que el service worker lo deje en cache (index.html
// lo carga en <head>, antes de las hojas de estilo y de los componentes).
// Solo fija data-tema para eleccion manual (claro/oscuro): con "automatico" no toca
// nada y el CSS decide con prefers-color-scheme.
try {
    const t = localStorage.getItem("galeno-tema");
    if (t === "claro" || t === "oscuro") document.documentElement.dataset.tema = t;
} catch (e) { /* sin localStorage: queda el tema automatico */ }
