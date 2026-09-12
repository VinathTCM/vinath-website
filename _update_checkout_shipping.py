import io

old_func = '''  function getShippingSettings(){
    try {
      var raw = localStorage.getItem('vinath_shipping_settings');
      if(raw) return JSON.parse(raw);
    } catch(e){}
    return {west:8, east:18, freeThreshold:100};
  }
  var SHIP_FEE = (function(){ var s = getShippingSettings(); return {west:s.west, east:s.east}; })();'''

new_func = '''  var _apiShipSettings = null;
  var _apiShipLoaded = false;
  // 从后端API加载运费设置（后台可配置），失败则用localStorage或默认值
  function loadShippingSettingsFromAPI(){
    fetch('https://api.vinathtcm.com/api/site-settings/shipping_settings')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data && typeof data.west === 'number'){
          _apiShipSettings = data;
          _apiShipLoaded = true;
          try{ localStorage.setItem('vinath_shipping_settings', JSON.stringify(data)); }catch(e){}
          // 重新渲染运费（如果结算摘要已渲染）
          if(typeof renderSummary === 'function') renderSummary();
        }
      })
      .catch(function(){ /* API失败时用本地缓存 */ });
  }
  loadShippingSettingsFromAPI();
  function getShippingSettings(){
    if(_apiShipSettings) return _apiShipSettings;
    try {
      var raw = localStorage.getItem('vinath_shipping_settings');
      if(raw) return JSON.parse(raw);
    } catch(e){}
    return {west:8, east:18, freeThreshold:100};
  }
  var SHIP_FEE = (function(){ var s = getShippingSettings(); return {west:s.west, east:s.east}; })();'''

for f in ['checkout/index.html', 'en/checkout/index.html']:
    s = io.open(f, encoding='utf-8').read()
    if old_func in s and '_apiShipSettings' not in s:
        s = s.replace(old_func, new_func, 1)
        io.open(f, 'w', encoding='utf-8').write(s)
        print(f'{f}: updated to load from API')
    elif '_apiShipSettings' in s:
        print(f'{f}: already updated')
    else:
        print(f'{f}: pattern not found')
