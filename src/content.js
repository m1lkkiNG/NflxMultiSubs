const console = require('./console');
const runtime = (typeof browser !== 'undefined' ? browser : chrome).runtime;
let port;
let ready = false;
let pending = [];
let reconnectTimer;
const sendPage = message => window.postMessage({ namespace: 'nflxmultisubs', ...message }, location.origin);
function connect() {
  if (port) return;
  try {
    port = runtime.connect({ name: 'page-relay' });
    port.onMessage.addListener(message => {
      if (!message.settings) return;
      ready = true;
      sendPage({ action: 'apply-settings', settings: message.settings });
      for (const item of pending.splice(0)) port.postMessage(item);
    });
    port.onDisconnect.addListener(() => {
      port = null;
      ready = false;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 1000);
    });
  } catch { console.warn('RELAY_CONNECT_FAILED'); }
}
// Register before starting the page script, so its first handshake cannot be lost.
window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin ||
      event.data?.namespace !== 'nflxmultisubs') return;
  const { action, settings } = event.data;
  if (action === 'connect') { connect(); return; }
  let message;
  if (action === 'update-settings' && settings && typeof settings === 'object') message = { settings };
  if (action === 'startPlayback') message = { startPlayback: 1 };
  if (action === 'stopPlayback') message = { stopPlayback: 1 };
  if (!message) return;
  connect();
  if (ready && port) port.postMessage(message);
  else { pending.push(message); pending = pending.slice(-20); }
});
console.log('CONTENT_READY', document.readyState);
if (BROWSER === 'safari') {
  // Safari 18+: declarative MAIN-world document_start injection in the manifest.
  // There is no script-tag resource load, inline script, eval, or CSP relaxation.
  connect();
} else {
  const inject = () => {
    const parent = document.head || document.documentElement;
    if (!parent) return false;
    const script = document.createElement('script');
    script.src = runtime.getURL('nflxmultisubs.min.js');
    script.id = runtime.id;
    script.onload = () => script.remove();
    script.onerror = () => console.error('PAGE_SCRIPT_LOAD_FAILED');
    parent.appendChild(script);
    return true;
  };
  if (!inject()) {
    const observer = new MutationObserver(() => { if (inject()) observer.disconnect(); });
    observer.observe(document, { childList: true, subtree: true });
  }
}
