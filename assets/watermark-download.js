/* VINATH 水印下载工具
 * 用法：VINATH_watermarkDownload(imgSrc, filename)
 * 给图片右下角加半透明 logo + vinathtcm.com 后下载
 * 商品图为 data URL，无跨域问题；logo 同源
 */
(function () {
  var LOGO_URL = '/favicon.webp';
  var SITE_TEXT = 'vinathtcm.com';

  function downloadImageWithWatermark(imgSrc, filename) {
    if (!imgSrc) return;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      var logoH = Math.max(24, Math.round(canvas.height * 0.08));
      var fontSize = Math.max(12, Math.round(canvas.height * 0.035));
      var padding = Math.max(12, Math.round(canvas.height * 0.03));

      function drawWatermark(logo) {
        ctx.globalAlpha = 0.35;
        var logoW = logo ? Math.round(logoH * (logo.naturalWidth / logo.naturalHeight)) : 0;
        ctx.font = '600 ' + fontSize + 'px Arial, "Helvetica Neue", sans-serif';
        ctx.textBaseline = 'middle';
        var textW = ctx.measureText(SITE_TEXT).width;
        var gap = logo ? padding : 0;
        var totalW = logoW + gap + textW;
        var x = canvas.width - totalW - padding;
        var y = canvas.height - logoH - padding;
        // 半透明白底条，提升水印在浅色图上的可见度
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x - padding / 2, y - padding / 3, totalW + padding, logoH + padding * 0.66);
        if (logo) ctx.drawImage(logo, x, y, logoW, logoH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(SITE_TEXT, x + logoW + gap, y + logoH / 2);
        ctx.globalAlpha = 1;

        canvas.toBlob(function (blob) {
          if (!blob) return;
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename || 'vinath-image.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }, 'image/jpeg', 0.92);
      }

      var logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.onload = function () { drawWatermark(logo); };
      logo.onerror = function () { drawWatermark(null); };
      logo.src = LOGO_URL + '?v=wm';
    };
    img.onerror = function () {
      alert('图片加载失败，无法下载');
    };
    img.src = imgSrc;
  }

  window.VINATH_watermarkDownload = downloadImageWithWatermark;
})();
