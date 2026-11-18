// Aplica el tema guardado antes de que aparezca la interfaz.
try {
    const t = localStorage.getItem("galeno-tema");
    if (t === "claro" || t === "oscuro") document.documentElement.dataset.tema = t;
} catch (e) {   }
