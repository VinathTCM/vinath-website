import io

# Fix feat-card img-ref position: move from bottom-right to top-right (below pin badge)
css_old = '.feat-card .img-ref{ position:absolute; bottom:8px; right:10px; background:rgba(0,0,0,.45); color:#fff; font-size:9px; padding:2px 6px; border-radius:8px; font-weight:500; z-index:3; }'
css_new = '.feat-card .img-ref{ position:absolute; top:34px; right:10px; background:rgba(255,255,255,.85); color:var(--espresso-soft); font-size:9px; padding:2px 6px; border-radius:8px; font-weight:500; z-index:3; }'

for f in ['shop/index.html', 'en/shop/index.html']:
    s = io.open(f, encoding='utf-8').read()
    if css_old in s:
        s = s.replace(css_old, css_new, 1)
        io.open(f, 'w', encoding='utf-8').write(s)
        print(f'{f}: feat img-ref moved to top-right')
    elif css_new in s:
        print(f'{f}: already updated')
    else:
        print(f'{f}: pattern not found')
