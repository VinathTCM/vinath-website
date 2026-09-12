import io
f = 'admin/orders/index.html'
s = io.open(f, encoding='utf-8').read()
s = s.replace("fetch(API_BASE + '/site-settings/shipping_settings')", "fetch('https://api.vinathtcm.com/api/site-settings/shipping_settings')")
s = s.replace("fetch(API_BASE + '/admin/site-settings/shipping_settings'", "fetch('https://api.vinathtcm.com/api/admin/site-settings/shipping_settings'")
io.open(f, 'w', encoding='utf-8').write(s)
print('Done')
