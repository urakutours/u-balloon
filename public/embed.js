(function() {
  'use strict';

  // Auto-detect base URL from the script src
  var scripts = document.querySelectorAll('script[src*="embed.js"]');
  var scriptSrc = scripts.length ? scripts[scripts.length - 1].src : '';
  var UBALLOON_BASE = scriptSrc ? scriptSrc.replace(/\/embed\.js.*$/, '') : '';

  function init() {
    var widgets = document.querySelectorAll('[data-uballoon-product]');
    for (var i = 0; i < widgets.length; i++) {
      loadProduct(widgets[i]);
    }
  }

  function loadProduct(el) {
    var productId = el.getAttribute('data-uballoon-product');
    var theme = el.getAttribute('data-theme') || 'light';
    if (!productId) return;

    el.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">読み込み中...</div>';

    fetch(UBALLOON_BASE + '/api/embed/' + productId)
      .then(function(res) { return res.json(); })
      .then(function(product) {
        if (product.error) {
          el.innerHTML = '<div style="text-align:center;padding:20px;color:#e53e3e;">商品が見つかりません</div>';
          return;
        }
        render(el, product, theme);
      })
      .catch(function() {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#e53e3e;">読み込みに失敗しました</div>';
      });
  }

  function render(el, product, theme) {
    var bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    var textColor = theme === 'dark' ? '#ffffff' : '#333333';
    var subColor = theme === 'dark' ? '#cccccc' : '#666666';

    var stockHtml = '';
    if (!product.available) {
      stockHtml = '<span style="color:#e53e3e;font-size:12px;">品切れ</span>';
    }

    el.innerHTML =
      '<div style="border:1px solid ' + (theme === 'dark' ? '#333' : '#e2e8f0') + ';border-radius:12px;overflow:hidden;max-width:320px;font-family:sans-serif;background:' + bgColor + ';">' +
        (product.imageUrl ? '<a href="' + product.productUrl + '" target="_blank" rel="noopener"><img src="' + product.imageUrl + '" alt="' + product.title + '" style="width:100%;height:200px;object-fit:cover;display:block;" /></a>' : '') +
        '<div style="padding:16px;">' +
          '<a href="' + product.productUrl + '" target="_blank" rel="noopener" style="text-decoration:none;color:' + textColor + ';font-weight:bold;font-size:16px;">' + product.title + '</a>' +
          '<div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;">' +
            '<span style="font-size:20px;font-weight:bold;color:' + textColor + ';">&yen;' + product.price.toLocaleString() + '</span>' +
            stockHtml +
          '</div>' +
          '<a href="' + product.productUrl + '" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:12px;padding:10px;background:#e91e8c;color:#fff;text-decoration:none;border-radius:24px;font-weight:bold;font-size:14px;">' +
            '詳細を見る' +
          '</a>' +
          '<p style="text-align:center;margin-top:8px;font-size:10px;color:' + subColor + ';">Powered by uballoon</p>' +
        '</div>' +
      '</div>';
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
