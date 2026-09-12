import io

f = 'admin/orders/index.html'
s = io.open(f, encoding='utf-8').read()

# 1. Add button in toolbar (after filters div)
old_toolbar = '<div class="filters" id="orderFilters"></div>\n    </div>'
new_toolbar = '<div class="filters" id="orderFilters"></div>\n      <button type="button" class="btn-secondary" id="shippingSettingsBtn" style="padding:6px 14px;font-size:13px;white-space:nowrap;">运费设置</button>\n    </div>'
if old_toolbar in s and 'shippingSettingsBtn' not in s:
    s = s.replace(old_toolbar, new_toolbar, 1)
    print('1. Button added')
else:
    print('1. Button already exists or pattern not found')

# 2. Add modal HTML before </body>
modal_html = '''
<!-- 运费设置弹窗 -->
<div class="shipping-modal-overlay" id="shippingModalOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;">
  <div class="shipping-modal" style="background:#fff;border-radius:16px;padding:28px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="margin:0;font-size:18px;color:#332A21;">运费与包邮设置</h3>
      <button type="button" id="shippingModalClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;line-height:1;">&times;</button>
    </div>
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;">西马运费（RM）</label>
      <input type="number" id="shipWestInput" step="0.01" min="0" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;">
    </div>
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;">东马运费（RM）</label>
      <input type="number" id="shipEastInput" step="0.01" min="0" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;">
    </div>
    <div style="margin-bottom:24px;">
      <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;">满多少包邮（RM，填0表示不包邮）</label>
      <input type="number" id="shipFreeInput" step="0.01" min="0" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;">
    </div>
    <div style="display:flex;gap:10px;">
      <button type="button" id="shippingSaveBtn" style="flex:1;background:#332A21;color:#fff;border:none;padding:12px;border-radius:10px;font-size:15px;cursor:pointer;">保存</button>
      <button type="button" id="shippingCancelBtn" style="flex:1;background:#f0f0f0;color:#333;border:none;padding:12px;border-radius:10px;font-size:15px;cursor:pointer;">取消</button>
    </div>
    <div id="shippingMsg" style="margin-top:12px;font-size:13px;text-align:center;display:none;"></div>
  </div>
</div>
'''
if 'shipping-modal-overlay' not in s:
    s = s.replace('</body>', modal_html + '\n</body>', 1)
    print('2. Modal HTML added')
else:
    print('2. Modal already exists')

# 3. Add JS logic before </script> of the main script
js_logic = '''
// ===== 运费设置弹窗 =====
(function(){
  var overlay = document.getElementById('shippingModalOverlay');
  if(!overlay) return;
  var btn = document.getElementById('shippingSettingsBtn');
  var closeBtn = document.getElementById('shippingModalClose');
  var cancelBtn = document.getElementById('shippingCancelBtn');
  var saveBtn = document.getElementById('shippingSaveBtn');
  var msg = document.getElementById('shippingMsg');
  var westIn = document.getElementById('shipWestInput');
  var eastIn = document.getElementById('shipEastInput');
  var freeIn = document.getElementById('shipFreeInput');

  function showMsg(text, isError){
    msg.textContent = text;
    msg.style.color = isError ? '#c0392b' : '#27ae60';
    msg.style.display = 'block';
    setTimeout(function(){ msg.style.display = 'none'; }, 3000);
  }
  function openModal(){
    overlay.style.display = 'flex';
    // Load current settings
    fetch(API_BASE + '/site-settings/shipping_settings')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data){
          westIn.value = data.west != null ? data.west : 8;
          eastIn.value = data.east != null ? data.east : 18;
          freeIn.value = data.freeThreshold != null ? data.freeThreshold : 100;
        } else {
          westIn.value = 8; eastIn.value = 18; freeIn.value = 100;
        }
      })
      .catch(function(){ westIn.value = 8; eastIn.value = 18; freeIn.value = 100; });
  }
  function closeModal(){ overlay.style.display = 'none'; }
  function saveSettings(){
    var token = localStorage.getItem('vinath_admin_token');
    var payload = {
      west: parseFloat(westIn.value) || 0,
      east: parseFloat(eastIn.value) || 0,
      freeThreshold: parseFloat(freeIn.value) || 0
    };
    fetch(API_BASE + '/admin/site-settings/shipping_settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    })
    .then(function(r){
      if(r.ok){ showMsg('保存成功！前台结算页将自动使用新运费', false); }
      else { showMsg('保存失败，请确认已登录大管理员', true); }
    })
    .catch(function(){ showMsg('网络错误', true); });
  }
  if(btn) btn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if(saveBtn) saveBtn.addEventListener('click', saveSettings);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
})();
'''
# Find the last </script> before </body> and insert before it
if 'shippingSettingsBtn' in s and '// ===== 运费设置弹窗 =====' not in s:
    idx = s.rfind('</script>')
    if idx > 0:
        s = s[:idx] + js_logic + '\n' + s[idx:]
        print('3. JS logic added')
    else:
        print('3. Could not find script tag')
else:
    print('3. JS already exists or button not found')

io.open(f, 'w', encoding='utf-8').write(s)
print('Done:', f)
