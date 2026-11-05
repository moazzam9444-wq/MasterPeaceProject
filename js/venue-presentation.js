/* Venue presentation only: mirrors existing record/DOM values, never writes storage. */
(() => {
  function mount() {
    const content = document.getElementById('fieldContent');
    if (!content || content.hidden || !window.KicksStore) return;
    const id = new URLSearchParams(location.search).get('id');
    const field = KicksStore.list('fields').find(row => String(row.id) === id);
    if (!field) return;
    const owner = KicksStore.find('users', field.ownerId);
    const place = [field.area, field.city].filter(Boolean).join(', ');
    for (const [selector, value] of [['[data-kx-location]',place],['[data-kx-format]',field.type],['[data-kx-owner]',owner?.name]]) {
      const target = content.querySelector(selector);
      if (!target) continue;
      if (value) target.textContent = value;
      else target.closest('dl>div')?.setAttribute('hidden','');
    }
    if (field.rating == null) content.querySelector('.kx-venue-grade').hidden = true;
    const image = document.getElementById('fieldPhoto');
    function mirrorImage() {
      const note = content.querySelector('.kx-photo-note');
      if (image.dataset.visualFallback) note.textContent = 'Venue photo unavailable. An illustrative pitch and detail crops of that illustration are shown.';
      content.querySelectorAll('[data-kx-photo-crop]').forEach((crop,index) => {
        if (crop.src !== image.src) crop.src = image.src;
        crop.alt = image.dataset.visualFallback ? `Detail crop ${index+1} of the illustrative pitch image` : `Detail crop ${index+1} of the venue photograph`;
      });
      const large = document.getElementById('largePhoto');
      if (large) {if (large.src !== image.src) large.src = image.src;large.alt = image.alt;}
      const largeNote = document.querySelector('[data-kx-large-photo-note]');
      if (largeNote) largeNote.textContent = image.dataset.visualFallback ? 'Illustrative pitch image / venue photo unavailable.' : 'Venue photograph';
    }
    mirrorImage();image.addEventListener('load',mirrorImage);
    new MutationObserver(mirrorImage).observe(image,{attributes:true,attributeFilter:['src']});
    const photoButton = document.getElementById('enlargePhoto');
    let photoOpener = photoButton;
    photoButton.addEventListener('click', event => {if(event.isTrusted) photoOpener = photoButton;},true);
    content.querySelectorAll('[data-kx-photo]').forEach(button => button.addEventListener('click',() => {photoOpener = button;photoButton.click();}));
    document.getElementById('photoDialog').addEventListener('close',() => queueMicrotask(() => {if(photoOpener?.isConnected) photoOpener.focus({preventScroll:true});}));
    function mirrorSummary() {
      const total = document.getElementById('bookingTotal').textContent.trim();
      const chosen = total && total !== '\u2014';
      content.querySelector('[data-kx-mobile-label]').textContent = chosen ? 'Your session' : 'Per hour';
      content.querySelector('[data-kx-mobile-price]').textContent = chosen ? total : document.getElementById('hourlyPrice').textContent + ' JOD';
    }
    mirrorSummary();
    const reservation = document.getElementById('reserve');
    const fitReservation = () => reservation.classList.toggle('is-too-tall',reservation.offsetHeight > innerHeight - 120);
    fitReservation();window.addEventListener('resize',fitReservation,{passive:true});
    if ('ResizeObserver' in window) new ResizeObserver(fitReservation).observe(reservation);
    const observer = new MutationObserver(mirrorSummary);
    observer.observe(document.getElementById('bookingTotal'),{childList:true,subtree:true,characterData:true});
    observer.observe(document.getElementById('hourlyPrice'),{childList:true,subtree:true,characterData:true});
  }
  // This deferred head script runs before deferred footer enhancements. Dock after all of them.
  if (document.readyState === 'complete') mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
