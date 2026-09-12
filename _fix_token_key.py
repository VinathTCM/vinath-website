import io
f = 'admin/orders/index.html'
s = io.open(f, encoding='utf-8').read()
s = s.replace("localStorage.getItem('vinath_admin_token')", "sessionStorage.getItem('vinath_auth_token')")
io.open(f, 'w', encoding='utf-8').write(s)
print('Fixed token key')
