// Old room bookmarks now lead to messages; no media/provider script is loaded.
(() => {
 const user=KicksAuth.current();
 if(user){location.replace(KicksAuth.dashboard(user)+'#messages');return;}
 const login=new URL('Pages/Auth/login.html',new URL('../',document.currentScript.src));
 login.searchParams.set('returnTo',location.pathname+location.search);
 location.replace(login.href);
})();
