// AI photography, layered into a slow homepage-only matchday experience.
{
  const hero = document.querySelector(".home-page .hero");
  const canvas = document.getElementById("heroMatchdayCanvas");
  if (hero && canvas) {
    const context = canvas.getContext("2d");
    const stadium = new Image();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const navbar = document.querySelector(".navbar");
    const stage = hero.querySelector(".hero-stage");
    const copy = hero.querySelector(".hero-content");
    const finale = hero.querySelector(".shot-finale");
    const hud = hero.querySelector(".shot-hud");
    const instruction = document.getElementById("shotInstruction");
    let ready = false;
    let visible = true;
    let frame = 0;
    let progress = 0;
    let target = 0;
    let lastTime = 0;
    let pointerX = 0;
    let pointerY = 0;

    function clamp(value) { return Math.max(0, Math.min(1, value)); }
    function ease(value) { value = clamp(value); return value * value * (3 - 2 * value); }

    function drawScene(value) {
      if (!ready) return;
      const box = stage.getBoundingClientRect();
      const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
      const width = Math.round(box.width * pixelRatio);
      const height = Math.round(box.height * pixelRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const mobile = box.width < 768;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#06140e";
      context.fillRect(0, 0, width, height);

      // Slow camera push through the photograph; no fast page-scroll hijacking.
      const zoom = 1.025 + ease(value / 0.38) * 0.24;
      const scale = mobile ? width * 1.9 / stadium.width : Math.max(width / stadium.width, height / stadium.height);
      const imageWidth = stadium.width * scale * zoom;
      const imageHeight = stadium.height * scale * zoom;
      const left = mobile ? width * 0.7 - imageWidth * 0.76 : (width - imageWidth) / 2 + pointerX * 12 * pixelRatio;
      const top = mobile ? height - imageHeight - height * 0.04 : (height - imageHeight) / 2 + pointerY * 8 * pixelRatio;
      context.save();
      context.translate(left + imageWidth, top);
      context.scale(-1, 1);
      context.drawImage(stadium, 0, 0, imageWidth, imageHeight);
      context.restore();

      // Soft stadium-light sweeps replace the floating-ball effect.
      context.save();
      context.globalCompositeOperation = "screen";
      const lightX = width * (0.22 + value * 0.09);
      const lightY = mobile ? height * 0.52 : height * 0.13;
      const light = context.createRadialGradient(lightX, lightY, 0, lightX, lightY, width * 0.6);
      light.addColorStop(0, "rgba(222,255,237,0.17)");
      light.addColorStop(0.3, "rgba(143,210,183,0.045)");
      light.addColorStop(1, "rgba(143,210,183,0)");
      context.fillStyle = light;
      context.fillRect(0, 0, width, height);
      context.restore();

      // Restrained atmospheric specks, tied to scroll rather than running forever.
      context.fillStyle = "#e5ffe9";
      for (let i = 0; i < 24; i++) {
        const px = ((i * 173.7 + value * (i % 2 ? 45 : -35)) % 1000) / 1000 * width;
        const py = ((i * 93.1 - value * 55 + 1000) % 1000) / 1000 * height;
        context.globalAlpha = 0.12 + (i % 3) * 0.06;
        context.beginPath();
        context.arc(px, py, (i % 3 + 1) * pixelRatio * 0.6, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;

      const intro = 1 - ease(value / 0.28);
      const middle = ease((value - 0.27) / 0.12) * (1 - ease((value - 0.6) / 0.1));
      const ending = ease((value - 0.72) / 0.16);
      hero.style.setProperty("--shot-copy", intro);
      hero.style.setProperty("--shot-copy-lift", -28 * (1 - intro) + "px");
      hero.style.setProperty("--shot-shade", 0.45 + intro * 0.55);
      hero.style.setProperty("--shot-middle", middle);
      hero.style.setProperty("--shot-finale", ending);
      hero.style.setProperty("--shot-progress", value);
      // Each part of the scroll changes the composition, not just its captions.
      const gallery = ease((value - 0.18) / 0.23);
      const reveal = ease((value - 0.65) / 0.23);
      hero.style.setProperty("--scene-gallery", gallery);
      hero.style.setProperty("--scene-ending", reveal);
      hero.style.setProperty("--scene-travel", clamp((value - 0.35) / 0.35));
      hero.dataset.shotPhase = value < 0.28 ? "set" : value < 0.72 ? "strike" : "score";
      copy.inert = intro < 0.1;
      copy.setAttribute("aria-hidden", String(copy.inert));
      finale.inert = ending < 0.8;
      finale.setAttribute("aria-hidden", String(finale.inert));
      instruction.textContent = value < 0.28 ? "Scroll slowly. Feel the game." : value < 0.72 ? "Your game. Your moment." : "Find your pitch. Make it yours.";
    }

    function animate(time) {
      frame = 0;
      if (!visible || document.hidden || !ready) return;
      const delta = Math.min(time - (lastTime || time), 64);
      lastTime = time;
      progress += (target - progress) * (1 - Math.exp(-delta / 170));
      if (Math.abs(target - progress) < 0.0002) progress = target;
      drawScene(motion.matches ? 0 : progress);
      if (progress !== target && !motion.matches) frame = requestAnimationFrame(animate);
      else lastTime = 0;
    }

    function update() {
      const navHeight = navbar.offsetHeight;
      hero.style.setProperty("--shot-nav-height", navHeight + "px");
      const distance = hero.offsetHeight - stage.offsetHeight;
      target = motion.matches || distance <= 0 ? 0 : clamp((navHeight - hero.getBoundingClientRect().top) / distance);
      if (!frame && visible && ready) frame = requestAnimationFrame(animate);
    }

    function setMotionMode() {
      hero.classList.toggle("shot-ready", ready && !motion.matches);
      hud.hidden = !ready || motion.matches;
      progress = target = 0;
      update();
    }

    stadium.src = "assets/images/kicks-matchday-ai.webp";
    stadium.decode().then(() => {
      ready = Boolean(context);
      setMotionMode();
    }).catch(() => { hud.hidden = true; });
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    stage.addEventListener("pointermove", event => {
      if (motion.matches || event.pointerType !== "mouse") return;
      const box = stage.getBoundingClientRect();
      pointerX = (event.clientX - box.left) / box.width - 0.5;
      pointerY = (event.clientY - box.top) / box.height - 0.5;
      update();
    });
    stage.addEventListener("pointerleave", () => { pointerX = pointerY = 0; update(); });
    document.addEventListener("visibilitychange", update);
    new ResizeObserver(update).observe(navbar);
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) update();
    }).observe(hero);
    motion.addEventListener("change", setMotionMode);
    update();
  }
}
