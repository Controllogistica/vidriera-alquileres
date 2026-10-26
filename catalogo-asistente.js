// Asistente del catálogo: recomienda equipos equivalentes y los agrega a "Mi pedido".
// Habla con https://tabiasound.com.ar/api/catalogo-chat. Se comunica con la página
// mediante window.__tsCatalogo (contexto) y el evento "tsbot:agregar" (agregar al pedido).
(function () {
  var API = 'https://tabiasound.com.ar/api/catalogo-chat/'; // con barra final: sin ella hay una redirección que rompe CORS
  var AVATAR = 'https://tabiasound.com.ar/img/microman-cara.svg';
  var lang = (navigator.language || 'es').slice(0, 2);
  if (['es', 'en', 'pt', 'ar', 'zh'].indexOf(lang) < 0) lang = 'es';
  var T = {
    es: { open: '¿No encontrás un equipo? Preguntale a Microman', title: 'Microman', sub: 'Asistente del catálogo', hello: '¡Hola! Soy Microman. Contame qué equipo buscás o para qué lo necesitás, y te muestro lo que tenemos en el catálogo. Si no lo tenemos, te sugiero una alternativa.',
          ph: 'Ej: una consola de 16 canales…', send: 'Enviar', close: 'Cerrar', add: 'Agregar al pedido', added: 'Agregado ✓', wa: 'Seguir por WhatsApp',
          err: 'Hubo un problema. Probá de nuevo o escribinos por WhatsApp al +54 9 11 4474-0856.', note: 'Asistente con IA. No confirma disponibilidad ni precios: eso lo confirma el equipo con tu pedido.', typing: 'Buscando…' },
    en: { open: "Can't find a piece of gear? Ask Microman", title: 'Microman', sub: 'Catalog assistant', hello: "Hi! I'm Microman. Tell me what gear you're looking for or what you need it for, and I'll show you what we have. If we don't have it, I'll suggest an alternative.",
          ph: 'e.g. a 16-channel mixer…', send: 'Send', close: 'Close', add: 'Add to order', added: 'Added ✓', wa: 'Continue on WhatsApp',
          err: 'Something went wrong. Try again or message us on WhatsApp at +54 9 11 4474-0856.', note: 'AI assistant. It does not confirm availability or prices: our team confirms them with your order.', typing: 'Searching…' },
    pt: { open: 'Não encontrou um equipamento? Pergunte ao Microman', title: 'Microman', sub: 'Assistente do catálogo', hello: 'Olá! Sou o Microman. Conte qual equipamento você procura ou para que precisa, e eu mostro o que temos no catálogo. Se não tivermos, sugiro uma alternativa.',
          ph: 'Ex.: uma mesa de 16 canais…', send: 'Enviar', close: 'Fechar', add: 'Adicionar ao pedido', added: 'Adicionado ✓', wa: 'Continuar no WhatsApp',
          err: 'Houve um problema. Tente de novo ou fale pelo WhatsApp +54 9 11 4474-0856.', note: 'Assistente com IA. Não confirma disponibilidade nem preços: a equipe confirma com o seu pedido.', typing: 'Buscando…' },
    ar: { open: 'لا تجد جهازًا؟ اسأل Microman', title: 'Microman', sub: 'مساعد الكتالوج', hello: 'مرحبًا! أنا Microman. أخبرني بالجهاز الذي تبحث عنه أو بما تحتاجه، وسأعرض عليك ما لدينا في الكتالوج. وإن لم يكن متوفرًا، أقترح عليك بديلًا.',
          ph: 'مثال: مكسر صوت بـ 16 قناة…', send: 'إرسال', close: 'إغلاق', add: 'أضف إلى الطلب', added: 'تمت الإضافة ✓', wa: 'تابع عبر واتساب',
          err: 'حدثت مشكلة. حاول مرة أخرى أو راسلنا عبر واتساب على ‎+54 9 11 4474-0856.', note: 'مساعد بالذكاء الاصطناعي. لا يؤكد التوفر ولا الأسعار: يؤكدها فريقنا مع طلبك.', typing: 'جارٍ البحث…' },
    zh: { open: '找不到设备？问问 Microman', title: 'Microman', sub: '目录助手', hello: '您好！我是 Microman。告诉我您要找的设备或用途，我会为您展示目录中的设备。如果我们没有，我会推荐替代方案。',
          ph: '例如：16路调音台…', send: '发送', close: '关闭', add: '加入订单', added: '已加入 ✓', wa: '通过 WhatsApp 继续',
          err: '出了点问题。请重试，或通过 WhatsApp 联系我们：+54 9 11 4474-0856。', note: 'AI 助手，不确认库存和价格：我们的团队会根据您的订单确认。', typing: '正在查找…' }
  }[lang];

  var css = '' +
    '.cab-btn{position:fixed;right:18px;bottom:18px;z-index:50;display:flex;align-items:center;gap:8px;background:var(--amber,#1FC3B8);color:#0C0E11;border:0;border-radius:999px;padding:12px 16px;font-weight:700;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.45);cursor:pointer}' +
    '.cab-btn img{flex:none;width:34px;height:34px;margin:-6px 0 -6px -4px;background:#0C0E11;border-radius:50%;padding:1px}' +
    '.cab-id{display:flex;align-items:center;gap:10px}.cab-id img{flex:none;background:#0C0E11;border-radius:50%}.cab-id b{display:block;line-height:1.1}.cab-id small{display:block;font-size:11.5px;color:var(--ink-2,#8C95A4)}' +
    '.cab-panel{position:fixed;right:18px;bottom:76px;z-index:58;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 110px));background:var(--panel,#14171C);border:1px solid var(--line-hi,#39424F);border-radius:14px;display:flex;flex-direction:column;box-shadow:0 18px 50px rgba(0,0,0,.6);overflow:hidden}' +
    '.cab-panel[hidden]{display:none}' +
    '.cab-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line,#262C35)}' +
    '.cab-head b{font-family:"Space Grotesk",sans-serif;font-size:15px}' +
    '.cab-x{background:none;border:0;color:var(--ink-2,#8C95A4);font-size:22px;line-height:1;cursor:pointer}' +
    '.cab-log{flex:1 1 auto;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}' +
    '.cab-msg{max-width:88%;padding:9px 11px;border-radius:10px;font-size:13.5px;line-height:1.45;white-space:pre-wrap}' +
    '.cab-msg.bot{background:var(--panel-2,#1A1E25);align-self:flex-start;border:1px solid var(--line,#262C35)}' +
    '.cab-msg.me{background:var(--amber-dim,#155E56);align-self:flex-end;color:#fff}' +
    '.cab-msg.typing{color:var(--ink-3,#5C6675);font-style:italic}' +
    '.cab-cards{display:flex;flex-direction:column;gap:8px;align-self:stretch}' +
    '.cab-card{display:flex;gap:10px;align-items:center;background:var(--panel-2,#1A1E25);border:1px solid var(--line,#262C35);border-radius:10px;padding:8px}' +
    '.cab-card .im{width:52px;height:52px;flex:none;border-radius:7px;background:#0C0E11;overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--ink-3,#5C6675);font-size:9px}' +
    '.cab-card .im img{width:100%;height:100%;object-fit:contain}' +
    '.cab-card .tx{flex:1;min-width:0}' +
    '.cab-card .nm{font-weight:600;font-size:13px;line-height:1.25}' +
    '.cab-card .mt{font-family:var(--mono,monospace);font-size:10px;color:var(--ink-3,#5C6675);margin-top:2px}' +
    '.cab-card button{flex:none;border:1px solid var(--line-hi,#39424F);background:var(--panel,#14171C);color:var(--ink,#E9ECF1);border-radius:7px;padding:7px 9px;font-size:11.5px;font-weight:700;cursor:pointer}' +
    '.cab-card button:hover{border-color:var(--amber,#1FC3B8);color:var(--amber,#1FC3B8)}' +
    '.cab-card button.ok{border-color:var(--live,#35D07F);color:var(--live,#35D07F)}' +
    '.cab-wa{align-self:flex-start;background:#25D366;color:#0C0E11;font-weight:700;text-decoration:none;padding:9px 12px;border-radius:8px;font-size:13px}' +
    '.cab-note{flex:none;margin:0;padding:6px 12px;font-size:10.5px;color:var(--ink-3,#5C6675);border-top:1px solid var(--line,#262C35)}' +
    '.cab-form{flex:none;display:flex;gap:8px;padding:10px 12px;align-items:flex-end}' +
    '.cab-form textarea{flex:1;resize:none;height:42px;background:var(--panel-2,#1A1E25);border:1px solid var(--line,#262C35);color:var(--ink,#E9ECF1);border-radius:8px;padding:10px;font:inherit;font-size:13.5px;outline:none}' +
    '.cab-form textarea:focus{border-color:var(--amber,#1FC3B8)}' +
    '.cab-form button{height:42px;background:var(--amber,#1FC3B8);color:#0C0E11;border:0;border-radius:8px;padding:0 14px;font-weight:700;cursor:pointer}' +
    '.cab-form button:disabled{opacity:.5}' +
    '@media(max-width:520px){.cab-btn span{display:none}.cab-btn{padding:13px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  var history = [], busy = false;
  var btn = el('button', { type: 'button', class: 'cab-btn', 'aria-expanded': 'false' });
  btn.innerHTML = '<img src="' + AVATAR + '" alt="" width="34" height="34">';
  btn.appendChild(el('span', null, T.open));
  var panel = el('section', { class: 'cab-panel', role: 'dialog', 'aria-label': T.title, hidden: '', dir: lang === 'ar' ? 'rtl' : 'ltr' });
  var head = el('div', { class: 'cab-head' });
  var hid = el('div', { class: 'cab-id' }); hid.innerHTML = '<img src="' + AVATAR + '" alt="" width="36" height="36">';
  var hn = el('div'); hn.appendChild(el('b', null, T.title)); hn.appendChild(el('small', null, T.sub)); hid.appendChild(hn); head.appendChild(hid);
  var closeB = el('button', { type: 'button', class: 'cab-x', 'aria-label': T.close }, '×'); head.appendChild(closeB);
  var log = el('div', { class: 'cab-log', 'aria-live': 'polite' });
  var note = el('p', { class: 'cab-note' }, T.note);
  var form = el('form', { class: 'cab-form' });
  var input = el('textarea', { rows: '1', maxlength: '1000', placeholder: T.ph, 'aria-label': T.ph });
  var sendB = el('button', { type: 'submit' }, T.send);
  form.appendChild(input); form.appendChild(sendB);
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(note); panel.appendChild(form);
  document.body.appendChild(panel); document.body.appendChild(btn);

  function scroll() { log.scrollTop = log.scrollHeight; }
  function add(role, text) { var m = el('div', { class: 'cab-msg ' + (role === 'user' ? 'me' : 'bot') }, text); log.appendChild(m); scroll(); return m; }
  function cards(list) {
    if (!list || !list.length) return;
    var box = el('div', { class: 'cab-cards' });
    list.forEach(function (p) {
      var c = el('div', { class: 'cab-card' });
      var im = el('div', { class: 'im' });
      if (p.imagen_url) { var i = el('img', { src: p.imagen_url, alt: '', loading: 'lazy' }); im.appendChild(i); } else im.textContent = 'SIN FOTO';
      var tx = el('div', { class: 'tx' });
      tx.appendChild(el('div', { class: 'nm' }, p.nombre));
      tx.appendChild(el('div', { class: 'mt' }, [p.tipo || p.subcategoria, p.area].filter(Boolean).join(' · ')));
      var b = el('button', { type: 'button' }, T.add);
      b.addEventListener('click', function () {
        window.dispatchEvent(new CustomEvent('tsbot:agregar', { detail: p }));
        b.textContent = T.added; b.classList.add('ok');
        setTimeout(function () { b.textContent = T.add; b.classList.remove('ok'); }, 1800);
      });
      c.appendChild(im); c.appendChild(tx); c.appendChild(b); box.appendChild(c);
    });
    log.appendChild(box); scroll();
  }

  function open() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); if (!log.childNodes.length) add('assistant', T.hello); setTimeout(function () { input.focus(); }, 50); }
  function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  btn.addEventListener('click', function () { panel.hidden ? open() : close(); });
  closeB.addEventListener('click', close);
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true; sendB.disabled = true; input.value = '';
    add('user', text);
    history.push({ role: 'user', content: text });
    var typing = add('assistant', T.typing); typing.classList.add('typing');
    fetch(API, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history, lang: lang, contexto: window.__tsCatalogo || null })
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        typing.remove();
        var reply = (d.reply || '').trim() || T.err;
        add('assistant', reply);
        cards(d.productos);
        // El historial guarda también qué tarjetas se mostraron, para que el asistente lo recuerde.
        var mem = reply + ((d.productos && d.productos.length) ? '\n[Tarjetas mostradas: ' + d.productos.map(function (p) { return p.nombre; }).join('; ') + ']' : '');
        history.push({ role: 'assistant', content: mem });
        if (d.whatsapp) { var a = el('a', { class: 'cab-wa', href: d.whatsapp, target: '_blank', rel: 'noopener' }, T.wa); log.appendChild(a); scroll(); }
      })
      .catch(function () { typing.remove(); add('assistant', T.err); history.pop(); })
      .then(function () { busy = false; sendB.disabled = false; input.focus(); });
  });
})();
