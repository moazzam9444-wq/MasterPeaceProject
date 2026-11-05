(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }
  if (gsap && window.SplitText) {
    gsap.registerPlugin(window.SplitText);
  }

  let lenis=null;
  const splits=[];
  const tick=time=>lenis?.raf(time*1000);
  addEventListener('kicks-navigation-change',event=>{if(event.detail.open)lenis?.stop();else lenis?.start();});
  if (window.Lenis && gsap && ScrollTrigger && !reduceMotion.matches && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    lenis = new window.Lenis({
      duration: 1.05,
      prevent: node => Boolean(node.closest('.premium-nav, .avatar-menu, .kicks-chat, dialog')),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.15
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const hash = link.getAttribute("href");
        if (!hash || hash === "#") return;
        const target = document.querySelector(hash);
        if (!target) return;
        event.preventDefault();

        lenis.scrollTo(target, { offset: -64 });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Motion                                                              */
  /* ------------------------------------------------------------------ */

  const initMotion = () => {
    if (!gsap || !ScrollTrigger || reduceMotion.matches) return;

    /* Hero intro ----------------------------------------------------- */

    const heroLines = gsap.utils.toArray(".hero-line > span");
    if (heroLines.length) {
      gsap.from(heroLines, {
        yPercent: 118,
        duration: 1.15,
        stagger: 0.09,
        ease: "power4.out",
        delay: 0.05
      });
    }

    gsap.from(".hero-media img", {
      scale: 1.08,
      duration: 2.4,
      ease: "power2.out"
    });

    gsap.from(".hero-eyebrow, .hero-sub, .hero-actions, .hero-cities, .search, .hero-foot", {
      y: 26,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.07,
      delay: 0.45,
      ease: "power2.out"
    });

    /* Scroll reveals ------------------------------------------------- */

    gsap.utils.toArray("[data-reveal]").forEach((element) => {
      gsap.from(element, {
        y: 30,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true
        }
      });
    });

    /* Split headlines ------------------------------------------------ */

    const splitTitles = () => {
      if (!window.SplitText) return;

      gsap.utils.toArray("[data-split]").forEach((element) => {
        let split;

        try {
          const options = {
            type: "lines",
            linesClass: "split-line",
            mask: "lines"
          };
          split = window.SplitText.create
            ? window.SplitText.create(element, options)
            : new window.SplitText(element, options);
        } catch (error) {
          return;
        }

        splits.push(split);
        gsap.from(split.lines, {
          yPercent: 42,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 86%",
            once: true
          }
        });
      });
    };

    splitTitles();

    /* Pinned flow ---------------------------------------------------- */

    const flow = document.querySelector(".flow");
    const steps = gsap.utils.toArray(".flow-step");
    const frames = gsap.utils.toArray(".flow-frame");
    const progress = document.querySelector("[data-flow-progress]");
    const progressLabel = document.querySelector("[data-flow-label]");

    const setFlowStep = (index) => {
      steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
      frames.forEach((frame, i) => frame.classList.toggle("is-active", i === index));
      if (progressLabel) {
        progressLabel.textContent = `0${index + 1} / 0${steps.length}`;
      }
    };

    if (flow && !flow.classList.contains("kickoff-stack") && steps.length) {
      setFlowStep(0);

      const mediaQuery = gsap.matchMedia();

      mediaQuery.add("(min-width: 900px) and (hover: hover) and (pointer: fine)", () => {
        flow.classList.add("is-pinned");
        ScrollTrigger.refresh();

        const updateFlow = (self) => {
          const index = Math.min(
            steps.length - 1,
            Math.floor(self.progress * steps.length)
          );
          setFlowStep(index);
          if (progress) {
            progress.style.transform = `scaleX(${self.progress})`;
          }
        };

        const trigger = ScrollTrigger.create({
          id: "kicks-story",
          trigger: flow,
          start: "top top",
          end: "bottom bottom",
          onUpdate: updateFlow,
          onRefresh: updateFlow
        });

        const parallax = gsap.to(".flow-frame img", {
          yPercent: 7,
          ease: "none",
          scrollTrigger: {
            trigger: flow,
            start: "top top",
            end: "bottom bottom",
            scrub: true
          }
        });

        return () => {
          trigger.kill();
          parallax.kill();
          flow.classList.remove("is-pinned");
          setFlowStep(0);
          if (progress) progress.style.transform = "scaleX(0)";
          ScrollTrigger.refresh();
        };
      });
    }

    /* Tournament bracket --------------------------------------------- */

    const bracket = document.querySelector("[data-bracket]");

    if (bracket) {
      const strokes = Array.from(bracket.querySelectorAll("path"));

      strokes.forEach((stroke) => {
        let length = 0;
        try {
          length = stroke.getTotalLength();
        } catch (error) {
          length = 0;
        }
        if (length) {
          stroke.style.strokeDasharray = String(length);
          stroke.style.strokeDashoffset = String(length);
        }
      });

      if (strokes.length) {
        gsap.to(strokes, {
          strokeDashoffset: 0,
          duration: 1.5,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: {
            trigger: bracket,
            start: "top 88%",
            once: true
          }
        });
      }
    }

    window.addEventListener("load", () => ScrollTrigger.refresh());
  };

  if(gsap && ScrollTrigger){
    (document.fonts?.ready || Promise.resolve()).then(()=>{
      const motion=gsap.matchMedia();
      motion.add('(prefers-reduced-motion: no-preference)',()=>{
        const context=gsap.context(initMotion);
        return ()=>{
          context.revert();
          splits.splice(0).forEach(split=>split.revert());
          document.querySelectorAll('[data-bracket] path').forEach(path=>{path.style.strokeDasharray='';path.style.strokeDashoffset='';});
          document.querySelector('.flow')?.classList.remove('is-pinned');
          if(lenis){lenis.destroy();lenis=null;gsap.ticker.remove(tick);}
        };
      });
    });
  }
})();
