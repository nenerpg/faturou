(function () {
  const PIXEL_ID = '1284960663455595';

  if (!window.fbq) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  function pkgParams(pkg) {
    if (!pkg) return { currency: 'BRL' };
    return {
      value: Number(pkg.valor ?? pkg.value ?? 0),
      currency: 'BRL',
      content_ids: [String(pkg.id)],
      content_name: pkg.nome || pkg.name || pkg.id,
      content_type: 'product',
      num_items: 1,
    };
  }

  function orderParams(order) {
    const value =
      order.amountReais != null
        ? Number(order.amountReais)
        : order.amountCentavos != null
          ? Number(order.amountCentavos) / 100
          : 0;
    const pacoteId = order.pacoteId || order.pacote_id || '';
    return {
      value,
      currency: 'BRL',
      content_ids: pacoteId ? [String(pacoteId)] : undefined,
      content_name: order.nomePacote || order.nome_pacote || pacoteId,
      content_type: 'product',
      num_items: 1,
      order_id: order.orderId || order.order_id,
    };
  }

  function track(event, params) {
    if (typeof fbq === 'function') fbq('track', event, params || {});
  }

  function purchase(order) {
    const orderId = order.orderId || order.order_id;
    if (!orderId) return;
    const key = 'meta_px_purchase_' + orderId;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (_) {}
    track('Purchase', orderParams(order));
  }

  window.MetaPixel = {
    track,
    pkgParams,
    orderParams,
    addToCart(pkg) {
      track('AddToCart', pkgParams(pkg));
    },
    initiateCheckout(pkg) {
      track('InitiateCheckout', pkgParams(pkg));
    },
    addPaymentInfo(pkg) {
      track('AddPaymentInfo', pkgParams(pkg));
    },
    purchase,
  };
})();
