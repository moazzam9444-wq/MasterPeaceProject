/* Presentation enhancements only. Never reads or mutates KicksStore or storage. */
(() => {
  const root = new URL('../', document.currentScript.src);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = '.catalog-card,.match-card,.cup-card,.team-card,.challenge-card,.meeting-card,.ed-club,.catalog-intro,.section-heading,.view-heading,.ed-teams-heading';
  const photos = '.catalog-image img,.match-image img,.cup-card-image img,.pitch-photo img,.game-detail-image,.cup-cover img,.hero-photo img';
  const seen = new WeakSet();
  let observer, frame;
  const fallback = img => {
    if (!img.matches(photos) || img.dataset.visualFallback) return;
    img.dataset.visualFallback = 'true';
    img.alt = 'Football pitch illustration; venue image unavailable';
    img.src = new URL('assets/images/field1.jpg', root).href;
    img.closest('.catalog-image,.match-image,.cup-card-image,.pitch-photo,.cup-cover')?.classList.add('has-image-fallback');
  };
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) fallback(event.target);
  }, true);
  function scan() {
    frame = null;
    document.querySelectorAll(photos).forEach(img => {
      if (img.complete && img.currentSrc && !img.naturalWidth) fallback(img);
    });
    if (motion.matches || !window.gsap || !('IntersectionObserver' in window)) return;
    observer ||= new IntersectionObserver(entries => {
      for (const {target, isIntersecting} of entries) {
        if (!isIntersecting) continue;
        observer.unobserve(target);
        if (!target.contains(document.activeElement) && !motion.matches)
          gsap.fromTo(target, {y:12, opacity:.85}, {y:0, opacity:1, duration:.5, ease:'power2.out', clearProps:'transform,opacity'});
      }
    }, {threshold:.08});
    document.querySelectorAll(cards).forEach(card => {
      if (seen.has(card)) return;
      seen.add(card); observer.observe(card);
    });
  }
  function start() {
    scan();
    const content = document.querySelector('main') || document.body;
    new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(scan); }).observe(content, {childList:true,subtree:true});
  }
  motion.addEventListener?.('change', () => {
    if (motion.matches) {
      observer?.disconnect();
      window.gsap?.killTweensOf(document.querySelectorAll(cards));
      document.querySelectorAll(cards).forEach(card => {card.style.removeProperty('transform');card.style.removeProperty('opacity');});
    } else scan();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
