import io

css_shop = """
.prod-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:2px; }
.feat-price-sub{ font-size:11px; color:rgba(255,255,255,.8); margin-top:2px; }"""

css_product = """
.related-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:1px; }"""

files = [
    ('shop/index.html', css_shop),
    ('en/shop/index.html', css_shop),
    ('product/index.html', css_product),
    ('en/product/index.html', css_product),
]

for f, css in files:
    s = io.open(f, encoding='utf-8').read()
    if 'price-sub' in s:
        print(f'{f}: already has price-sub CSS, skip')
        continue
    # insert before first </style>
    idx = s.find('</style>')
    if idx == -1:
        print(f'{f}: no </style> found!')
        continue
    s = s[:idx] + css + '\n' + s[idx:]
    io.open(f, 'w', encoding='utf-8').write(s)
    print(f'{f}: CSS inserted')
