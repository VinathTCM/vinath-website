import io

css_old = '.pd-img-disclaimer{ text-align:center; font-size:11px; color:var(--espresso-soft); opacity:.7; padding:6px 0 0; }'
css_new = '.pd-img-disclaimer{ text-align:center; font-size:12px; color:var(--espresso); background:rgba(243,239,230,.6); padding:8px 12px; border-radius:8px; margin:8px auto 0; max-width:80%; font-weight:500; }'

for f in ['product/index.html', 'en/product/index.html']:
    s = io.open(f, encoding='utf-8').read()
    if css_old in s:
        s = s.replace(css_old, css_new, 1)
        io.open(f, 'w', encoding='utf-8').write(s)
        print(f'{f}: disclaimer style updated')
    elif css_new in s:
        print(f'{f}: already updated')
    else:
        print(f'{f}: pattern not found')
