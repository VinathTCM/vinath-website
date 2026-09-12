import io
for f in ['shop/index.html','en/shop/index.html','product/index.html','en/product/index.html']:
    s = io.open(f, encoding='utf-8').read()
    print(f'=== {f} ===')
    for kw in ['每包 RM', 'prod-price">MYR', 'feat-price">MYR', 'related-price">MYR', 'onwards', ' 起']:
        cnt = s.count(kw)
        if cnt:
            print(f'  "{kw}" x{cnt}')
