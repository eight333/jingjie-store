// Minimal static cart/checkout for GitHub Pages
(function () {
  const CART_KEY = 'jj_cart_v1';
  const PRODUCTS = window.JJ_PRODUCTS || [];
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const money = n => 'NT$' + (n||0).toLocaleString('zh-Hant-TW');

  const cart = {
    read(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch(e){ return []; } },
    write(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); updateCount(); },
    add(id){
      const items = cart.read();
      const found = items.find(i => i.id === id);
      if(found){ found.qty += 1; } else { items.push({ id, qty: 1 }); }
      cart.write(items);
    },
    remove(id){
      const items = cart.read().filter(i => i.id !== id);
      cart.write(items);
    },
    setQty(id, qty){
      const items = cart.read();
      const it = items.find(i => i.id === id);
      if(!it) return;
      it.qty = Math.max(1, qty|0);
      cart.write(items);
    },
    clear(){ cart.write([]); }
  };

  function getProduct(id){ return PRODUCTS.find(p => p.id === id); }

  function updateCount(){
    const count = cart.read().reduce((a,b) => a + b.qty, 0);
    const el = $('#cartCount');
    if(el) el.textContent = count;
  }

  // ---------- Catalog ----------
  function renderCatalog(filter='all'){
    const container = $('#catalog');
    if(!container) return;
    const list = (filter==='all') ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
    container.innerHTML = '';
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card product';
      card.innerHTML = `
        <div class="thumb">${p.category.split('').slice(0,2).join('')} · ${p.id}</div>
        <div class="cat">${p.category}</div>
        <h3 class="p-title">${p.name}</h3>
        <p class="p-meta">型號：${p.id}</p>
        <div class="price">${money(p.price)}</div>
        <div class="p-actions">
          <button class="primary" data-add="${p.id}">加入購物車</button>
          <button class="ghost" data-buy="${p.id}">直接購買</button>
        </div>
      `;
      container.appendChild(card);
    });

    // bind
    $$('#catalog [data-add]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-add');
        cart.add(id);
        openCart();
        renderCart();
      });
    });
    $$('#catalog [data-buy]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-buy');
        cart.add(id);
        location.href = './checkout.html';
      });
    });
  }

  // ---------- Cart Panel ----------
  const panel = $('#cartPanel');
  const overlay = $('#overlay');
  function openCart(){ if(panel){ panel.classList.add('open'); } if(overlay){ overlay.classList.add('show'); } }
  function closeCart(){ if(panel){ panel.classList.remove('open'); } if(overlay){ overlay.classList.remove('show'); } }
  $('#cartBtn') && $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart') && $('#closeCart').addEventListener('click', closeCart);
  overlay && overlay.addEventListener('click', closeCart);

  function renderCart(){
    const items = cart.read();
    const list = $('#cartItems');
    if(!list) return;
    list.innerHTML = '';
    if(items.length === 0){
      list.innerHTML = '<p class="muted">您的購物車是空的。</p>';
    }else{
      items.forEach(it => {
        const p = getProduct(it.id); if(!p) return;
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
          <div>
            <div class="title">${p.name}</div>
            <div class="meta">${p.id}｜${p.category}</div>
            <div class="meta">${money(p.price)}</div>
          </div>
          <div class="qty">
            <button aria-label="減少數量" data-dec="${p.id}">−</button>
            <span>${it.qty}</span>
            <button aria-label="增加數量" data-inc="${p.id}">＋</button>
            <button class="icon-btn" style="margin-left:8px" aria-label="移除" data-del="${p.id}">移除</button>
          </div>
        `;
        list.appendChild(row);
      });
    }

    const subtotal = items.reduce((sum, it) => {
      const p = getProduct(it.id); return sum + (p ? p.price * it.qty : 0);
    }, 0);
    const ship = subtotal === 0 ? 0 : (subtotal >= 2000 ? 0 : 80);
    const total = subtotal + ship;
    $('#subtotal') && ($('#subtotal').textContent = money(subtotal));
    $('#shipping') && ($('#shipping').textContent = money(ship));
    $('#grandTotal') && ($('#grandTotal').textContent = money(total));

    // bind qty buttons
    $$('#cartItems [data-dec]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-dec');
        const items = cart.read();
        const it = items.find(i => i.id === id);
        if(it){ it.qty = Math.max(1, it.qty - 1); localStorage.setItem(CART_KEY, JSON.stringify(items)); }
        renderCart(); updateCount();
      });
    });
    $$('#cartItems [data-inc]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-inc');
        const items = cart.read();
        const it = items.find(i => i.id === id);
        if(it){ it.qty += 1; localStorage.setItem(CART_KEY, JSON.stringify(items)); }
        renderCart(); updateCount();
      });
    });
    $$('#cartItems [data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-del');
        cart.remove(id); renderCart();
      });
    });
  }

  // ---------- Checkout ----------
  function renderCheckout(){
    // set nav state
    $$('.nav-link').forEach(a => a.classList.remove('active'));

    // render items
    const items = cart.read();
    const box = $('#orderItems');
    if(box){
      box.innerHTML = items.length ? '' : '<p class="muted">購物車為空，請回首頁選購。</p>';
      items.forEach(it => {
        const p = getProduct(it.id); if(!p) return;
        const row = document.createElement('div');
        row.className = 'order-item';
        row.innerHTML = `
          <div>
            <div class="title">${p.name}</div>
            <div class="meta">${p.id}｜${p.category} × ${it.qty}</div>
          </div>
          <div>${money(p.price * it.qty)}</div>
        `;
        box.appendChild(row);
      });
    }

    // totals
    const subtotal = items.reduce((sum, it) => {
      const p = getProduct(it.id); return sum + (p ? p.price * it.qty : 0);
    }, 0);
    const ship = subtotal === 0 ? 0 : (subtotal >= 2000 ? 0 : 80);
    const total = subtotal + ship;
    $('#sumSubtotal') && ($('#sumSubtotal').textContent = money(subtotal));
    $('#sumShipping') && ($('#sumShipping').textContent = money(ship));
    $('#sumGrand') && ($('#sumGrand').textContent = money(total));

    // form submit
    const form = $('#checkoutForm');
    if(form){
      form.addEventListener('submit', e => {
        e.preventDefault();
        if(items.length === 0){ alert('購物車為空，請先選購商品。'); return; }
        const fd = new FormData(form);
        for (const key of ['name','phone','email','address']) {
          if(!fd.get(key)){ alert('請完整填寫收件資訊。'); return; }
        }
        // create order object
        const orderNo = 'JJ' + Date.now();
        const data = {
          orderNo,
          createdAt: new Date().toISOString(),
          contact: {
            name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
            address: fd.get('address')
          },
          shipping: fd.get('shipping'),
          payment: fd.get('payment'),
          note: fd.get('note') || '',
          items: items.map(it => ({...it})),
          totals: { subtotal, shipping: ship, total }
        };
        // Save file locally (as data URL, then download)
        const payload = [
          '競界有限公司 訂單收據',
          '公司統一編號：60773118',
          `訂單編號：${orderNo}`,
          `成立時間：${new Date().toLocaleString('zh-TW')}`,
          `收件人：${data.contact.name}`,
          `電話：${data.contact.phone}`,
          `Email：${data.contact.email}`,
          `地址：${data.contact.address}`,
          `配送：${data.shipping}　付款：${data.payment}`,
          `備註：${data.note || '（無）'}`,
          '— 明細 —',
          ...items.map(it => {
            const p = getProduct(it.id);
            return `${p.id} ${p.name} × ${it.qty} ＝ ${money(p.price*it.qty)}`;
          }),
          `小計：${money(subtotal)}`,
          `運費：${money(ship)}`,
          `合計：${money(total)}`,
          '',
          '※ 本網站為靜態示範。'
        ].join('\n');

        const blob = new Blob([payload], {type:'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${orderNo}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        alert('訂單已建立：' + orderNo + '\\n已下載收據TXT。');
        cart.clear();
        location.href = './index.html';
      });
    }
  }

  // expose for checkout page
  window.JJ = { renderCheckout };

  // initial on index
  if($('#catalog')){
    renderCatalog('all');
    // filter nav
    $$('.nav-link').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const f = a.getAttribute('data-filter') || 'all';
        $$('.nav-link').forEach(x => x.classList.toggle('active', x===a));
        renderCatalog(f);
      });
    });
  }

  renderCart();
  updateCount();
})();