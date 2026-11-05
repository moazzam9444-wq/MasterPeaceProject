// Messaging workspace only. Legacy meeting records are preserved, never rendered.
(() => {
 function render(){
  document.getElementById('dashboardView').innerHTML='<section id="messagesPanel" class="messages-panel" aria-label="Direct messages"></section>';
  KicksMessages.render();
 }
 window.KicksDashboardMessages={render};
})();
