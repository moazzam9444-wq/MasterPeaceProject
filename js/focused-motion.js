/* Presentation only: Fields and Player Dashboard. No store or storage writes. */
(() => {
  'use strict';
  if (!document.body.classList.contains('kx-focused')) return;

  const gsap = window.gsap, ST = window.ScrollTrigger;
  const assetRoot = new URL('../',document.currentScript.src);
  // Preserve the existing honest image fallback while replacing its legacy motion owner.
  const photoSelector = '.kx-venue-image img,#fieldPhoto';
  function fallback(photo) {
    if (!photo.matches?.(photoSelector) || photo.dataset.visualFallback) return;
    photo.dataset.visualFallback='true';
    photo.alt='Football pitch illustration; venue image unavailable';
    photo.closest('.catalog-image,.pitch-photo')?.classList.add('has-image-fallback');
    photo.src=new URL('assets/images/field1.jpg',assetRoot).href;
  }
  document.addEventListener('error',event => fallback(event.target),true);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const events = [], active = new Set(), triggers = new Set();
  let seen = new WeakSet(), lastView = null, queued = false;
  const dialogState = new WeakMap();
  const rendered = element => element?.isConnected && element.getClientRects().length > 0 &&
    !element.closest('[hidden],dialog:not([open])') && getComputedStyle(element).visibility !== 'hidden';
  const label = element => {
    if (element.matches('.kx-venue')) return 'venue:' + new URL(element.querySelector('.view-field').href).searchParams.get('id');
    return element.id ? '#' + element.id : '.' + String(element.className).trim().split(/\s+/).slice(0,2).join('.');
  };
  function log(type, kind, elements, extra = {}) {
    events.push({type, kind, at:performance.now(), targets:elements.map(label), ...extra});
    if (events.length > 180) events.splice(0, events.length - 180);
  }
  window.KicksFocusedMotion = {events, version:'1', available:!!(gsap && ST),
    get reduced(){return preference.matches;}, get active(){return active.size;},
    get scrollTriggers(){return [...triggers].filter(t => t.trigger?.isConnected).length;}};
  if (!gsap || !ST) {
    document.querySelectorAll(photoSelector).forEach(photo => {if(photo.complete && !photo.naturalWidth)fallback(photo);});
    return; // Native content remains fully visible if a library fails.
  }
  gsap.registerPlugin(ST);

  function reveal(elements, kind, options = {}) {
    const targets = [...elements].filter(rendered);
    if (preference.matches || !targets.length) return;
    for (const earlier of [...active]) {
      if (earlier.targets.some(target => targets.includes(target))) {earlier.tween?.kill();earlier.cleanup();}
    }
    // Cancel only earlier presentation tweens on these nodes, including legacy entrances.
    gsap.killTweensOf(targets);
    const duration = options.duration || .5, y = options.y ?? 14;
    const record = {targets, tween:null, cleanup:null};
    function finish() {
      targets.forEach(target => {
        // GSAP normalizes individual transform properties to inline "none".
        // Clear those too, so native CSS hover elevation resumes after the reveal.
        for (const property of ['opacity','transform','translate','rotate','scale']) target.style.removeProperty(property);
      });
      active.delete(record);
    }
    record.cleanup = finish;
    active.add(record);
    record.tween = gsap.fromTo(targets, {opacity:.12,y,scale:options.scale || 1}, {
      opacity:1,y:0,scale:1,duration,stagger:options.stagger ?? .055,ease:'power2.out',overwrite:'auto',
      onStart(){log('start',kind,targets,{duration,y,opacity:gsap.getProperty(targets[0],'opacity')});},
      onComplete(){finish();log('complete',kind,targets,{opacity:1,y:0});}
    });
  }

  function count(card) {
    const original = card.querySelector('strong');
    const value = original?.textContent.trim();
    if (!value || !/^\d+(\.\d+)?$/.test(value) || !rendered(original) || preference.matches) return;
    const target = Number(value), decimals = value.includes('.') ? value.split('.')[1].length : 0;
    const layer = document.createElement('span');
    layer.className = 'kf-count-layer';layer.dataset.kfInternal = 'true';layer.setAttribute('aria-hidden','true');
    const style = getComputedStyle(original);
    Object.assign(layer.style, {left:original.offsetLeft+'px',top:original.offsetTop+'px',
      fontFamily:style.fontFamily,fontWeight:style.fontWeight,fontSize:style.fontSize,lineHeight:style.lineHeight});
    layer.textContent = '0';card.append(layer);
    // Keep the original numeric text and its screen-reader representation intact.
    original.style.opacity = '0';
    const state = {value:0}, record = {targets:[original],tween:null,cleanup:null};
    record.cleanup = () => {layer.remove();original.style.removeProperty('opacity');active.delete(record);};
    active.add(record);
    log('start','kpi',[original],{from:0,to:target});
    record.tween = gsap.to(state, {value:target,duration:.65,ease:'power2.out',
      onUpdate(){layer.textContent=state.value.toFixed(decimals);},
      onComplete(){record.cleanup();log('complete','kpi',[original],{value:target,sourceText:original.textContent});}});
  }

  function register(elements, kind, numeric = false) {
    const fresh = [...elements].filter(element => rendered(element) && !seen.has(element));
    fresh.forEach(element => seen.add(element));
    if (!fresh.length) return false;
    if (!preference.matches) {
      ST.batch(fresh, {start:'top 94%',once:true,interval:.055,batchMax:4,
        onEnter(batch){
          const visible = batch.filter(rendered);
          reveal(visible,kind,{duration:.5,y:kind==='card'?18:12,stagger:.065});
          if (numeric) visible.forEach(card => count(card));
        }
      }).forEach(trigger => triggers.add(trigger));
    }
    return true;
  }

  function clean() {
    for (const record of [...active]) {
      if (preference.matches || record.targets.some(target => !rendered(target))) {
        record.tween?.kill();record.cleanup();
      }
    }
    for (const trigger of [...triggers]) {
      if (preference.matches || !rendered(trigger.trigger)) {trigger.kill();triggers.delete(trigger);}
    }
  }

  function scan() {
    queued = false;clean();
    const root = document.querySelector('main');
    if (!root) return;
    const assistant=document.querySelector('.kicks-assistant-launcher');
    if (assistant && !assistant.hasAttribute('aria-label')) assistant.setAttribute('aria-label','Open KICKS Assistant');
    root.querySelectorAll(photoSelector).forEach(photo => {
      if (photo.complete && photo.currentSrc && !photo.naturalWidth) fallback(photo);
    });
    let refresh = false;
    const intro = root.querySelector('.kx-finder-copy');
    if (rendered(intro) && !seen.has(intro)) {
      seen.add(intro);
      reveal(intro.children,'page',{duration:.58,y:14,stagger:.065});
      const search = root.querySelector('.kx-search-command');
      if (search) reveal([search],'search',{duration:.5,y:10});
    }
    const gallery = root.querySelector('.kx-venue-gallery');
    if (rendered(gallery) && !seen.has(gallery)) {
      seen.add(gallery);reveal([gallery],'gallery',{duration:.6,y:12});
      reveal(root.querySelectorAll('.kx-venue-identity>*'),'detail-title',{duration:.5,y:10});
    }
    refresh = register(root.querySelectorAll('.kx-venue'),'card') || refresh;
    refresh = register(root.querySelectorAll('.kx-venue-chapter,.kx-next-chapter'),'section') || refresh;
    refresh = register(root.querySelectorAll('#reserve'),'booking-panel') || refresh;

    const view = document.getElementById('dashboardView');
    if (view?.firstElementChild && view.firstElementChild !== lastView) {
      lastView = view.firstElementChild;
      reveal(document.querySelectorAll('.dash-top>div'),'dashboard-heading',{duration:.35,y:8});
    }
    if (view) {
      refresh = register(view.querySelectorAll('.kx-workspace-lead'),'dashboard-feature') || refresh;
      refresh = register(view.querySelectorAll('.stat-card'),'kpi-card',true) || refresh;
      refresh = register(view.querySelectorAll('.dash-panel,.view-heading,.profile-view-heading'),'dashboard-panel') || refresh;
    }
    document.querySelectorAll('dialog').forEach(dialog => {
      const open = dialog.open && rendered(dialog);
      if (open && !dialogState.get(dialog)) {
        reveal([dialog],'dialog',{duration:.24,y:10,scale:.99});
        const photo = dialog.querySelector('#largePhoto');
        if (photo) reveal([photo],'gallery-photo',{duration:.4,y:0,scale:1.025});
      }
      dialogState.set(dialog,open);
    });
    if (refresh && !preference.matches) ST.refresh();
  }
  function schedule() {if (!queued) {queued=true;requestAnimationFrame(scan);}}
  function start() {
    scan();
    new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('[data-kf-internal]'))) schedule();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']});
    document.addEventListener('click',event => {
      if (event.target.closest('#filterToggle')) requestAnimationFrame(() => {
        const panel=document.getElementById('filterPanel');
        if (panel?.classList.contains('is-open')) reveal([panel],'filters',{duration:.26,y:8});
        ST.refresh();
      });
      if (event.target.closest('.kx-dashboard-menu')) requestAnimationFrame(() => {
        const sidebar = document.querySelector('.dash-sidebar');
        if (document.body.classList.contains('kx-nav-open')) reveal([sidebar],'sidebar',{duration:.24,y:-8});
      });
    });
    preference.addEventListener('change',() => {clean();seen=new WeakSet();schedule();});
    window.addEventListener('pagehide',() => {for (const record of [...active]) {record.tween?.kill();record.cleanup();}triggers.forEach(t=>t.kill());triggers.clear();});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
