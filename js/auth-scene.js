// Gentle background depth on authentication pages; never moves the form.
{
  const scene = document.querySelector(".login-page .auth-shell");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  if (scene) {
    scene.addEventListener("pointermove", event => {
      if (motion.matches || event.pointerType !== "mouse") return;
      document.body.style.setProperty("--auth-drift-x", (event.clientX / innerWidth - .5) * 10 + "px");
      document.body.style.setProperty("--auth-drift-y", (event.clientY / innerHeight - .5) * 6 + "px");
    });
    function resetDepth() {
      document.body.style.setProperty("--auth-drift-x", "0px");
      document.body.style.setProperty("--auth-drift-y", "0px");
    }
    scene.addEventListener("pointerleave", resetDepth);
    motion.addEventListener("change", resetDepth);
  }
}
