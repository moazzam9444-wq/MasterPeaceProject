// One visible modal per interaction. A temporary step returns to its original form.
(() => {
  const parents=new WeakMap(),suspended=new WeakSet(),positions=new WeakMap();
  const nativeShow=dialog=>dialog.showModal();
  function open(dialog){
    if(!dialog || dialog.open)return;
    const active=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(active && active!==dialog){
      positions.set(active,{scroll:active.scrollTop,focus:document.activeElement});
      parents.set(dialog,active);suspended.add(active);active.close();
    }
    document.querySelector('.kicks-chat-close')?.click();
    dialog.returnValue='';nativeShow(dialog);dialog.scrollTop=0;
  }
  document.addEventListener('close',event=>{
    const dialog=event.target;if(!(dialog instanceof HTMLDialogElement))return;
    if(suspended.has(dialog)){suspended.delete(dialog);event.stopImmediatePropagation();return;}
    if(dialog.open)return;
    const parent=parents.get(dialog);parents.delete(dialog);
    if(!parent)return;
    queueMicrotask(()=>{
      if(!parent.isConnected || document.querySelector('dialog[open]'))return;
      nativeShow(parent);
      parent.dispatchEvent(new Event('kicks-dialog-resume'));
      const position=positions.get(parent);positions.delete(parent);
      if(position){if(position.focus?.isConnected)position.focus.focus({preventScroll:true});parent.scrollTop=position.scroll;}
    });
  },true);
  function dismissAll(){
    for(const dialog of document.querySelectorAll('dialog')){parents.delete(dialog);if(dialog.open)dialog.close();}
  }
  function isBackdrop(event,dialog){
    if(event.target!==dialog)return false;
    const rect=dialog.getBoundingClientRect();
    return event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom;
  }
  // A padding click is part of the dialog, not a click on its backdrop.
  let backdropPress=null;
  document.addEventListener('pointerdown',event=>{
    backdropPress=event.target instanceof HTMLDialogElement && isBackdrop(event,event.target)?event.target:null;
  },true);
  document.addEventListener('click',event=>{
    if(!(event.target instanceof HTMLDialogElement))return;
    if(!isBackdrop(event,event.target) || backdropPress!==event.target){event.stopPropagation();return;}
    event.target.close('cancel');
  },true);
  window.addEventListener('storage',event=>{if(['kicks-data-v2',null].includes(event.key))dismissAll();});
  window.addEventListener('hashchange',dismissAll);
  window.KicksDialogs={open,dismissAll,isBackdrop};
})();
