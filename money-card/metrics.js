// Count worksheet actions without reading any form values or loading a remote script.
(() => {
  const pagePath = '/money-card/';
  if (location.origin !== 'https://fqadulting.com' ||
      !['/money-card/', '/money-card/index.html'].includes(location.pathname) ||
      navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;

  const allowed = new Set(['worksheet-start', 'worksheet-complete', 'worksheet-help-click']);
  const counted = new Set();
  const page = {
    website: '44c99229-67f0-49a1-ad58-b3fba34ebf05',
    hostname: 'fqadulting.com',
    url: pagePath,
    title: '儲蓄保單整理表',
  };

  function send(payload) {
    // Never include query strings, the incoming referrer, or a visitor identifier.
    fetch('https://gateway.umami.is/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'event', payload }),
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {});
  }

  window.fqWorksheetEvent = name => {
    if (!allowed.has(name) || counted.has(name)) return;
    counted.add(name);
    send({ ...page, name });
  };
  send(page);
})();
