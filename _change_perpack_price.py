import io

changes = []

# === 中文商店列表页 ===
f = 'shop/index.html'
s = io.open(f, encoding='utf-8').read()

# 1. 商品卡片 prod-price
old1 = "'<div class=\"prod-price\">MYR '+p.trial+' 起</div>'"
new1 = "'<div class=\"prod-price\">每包 RM '+(p.price/(p.trial_per_full||7)).toFixed(2)+'</div>'"
assert old1 in s, f'{f}: prod-price not found'
s = s.replace(old1, new1, 1)
changes.append(f'{f}: prod-card price -> per-pack')

# 2. 精选商品 feat-price
old2 = "'<div class=\"feat-price\">MYR '+p.trial+' 起</div>'"
new2 = "'<div class=\"feat-price\">每包 RM '+(p.price/(p.trial_per_full||7)).toFixed(2)+'</div>'"
assert old2 in s, f'{f}: feat-price not found'
s = s.replace(old2, new2, 1)
changes.append(f'{f}: feat-card price -> per-pack')

io.open(f, 'w', encoding='utf-8').write(s)

# === 英文商店列表页 ===
f = 'en/shop/index.html'
s = io.open(f, encoding='utf-8').read()

# 3. 商品卡片 prod-price
old3 = "'<div class=\"prod-price\">MYR '+p.trial+' onwards</div>'"
new3 = "'<div class=\"prod-price\">RM '+(p.price/(p.trial_per_full||7)).toFixed(2)+' / sachet</div>'"
assert old3 in s, f'{f}: prod-price not found'
s = s.replace(old3, new3, 1)
changes.append(f'{f}: prod-card price -> per-pack')

# 4. 精选商品 feat-price (need to find exact text)
import re
m = re.search(r"('<div class=\"feat-price\">MYR '\+p\.trial\+' onwards</div>')", s)
assert m, f'{f}: feat-price not found'
old4 = m.group(1)
new4 = "'<div class=\"feat-price\">RM '+(p.price/(p.trial_per_full||7)).toFixed(2)+' / sachet</div>'"
s = s.replace(old4, new4, 1)
changes.append(f'{f}: feat-card price -> per-pack')

io.open(f, 'w', encoding='utf-8').write(s)

# === 中文商品详情页（相关商品推荐） ===
f = 'product/index.html'
s = io.open(f, encoding='utf-8').read()

old5 = "'<div class=\"related-price\">MYR '+p.trial+' 起</div>'"
new5 = "'<div class=\"related-price\">每包 RM '+(p.price/(p.trial_per_full||7)).toFixed(2)+'</div>'"
assert old5 in s, f'{f}: related-price not found'
s = s.replace(old5, new5, 1)
changes.append(f'{f}: related-product price -> per-pack')

io.open(f, 'w', encoding='utf-8').write(s)

# === 英文商品详情页（相关商品推荐） ===
f = 'en/product/index.html'
s = io.open(f, encoding='utf-8').read()

old6 = "'<div class=\"related-price\">MYR '+p.trial+' onwards</div>'"
new6 = "'<div class=\"related-price\">RM '+(p.price/(p.trial_per_full||7)).toFixed(2)+' / sachet</div>'"
assert old6 in s, f'{f}: related-price not found'
s = s.replace(old6, new6, 1)
changes.append(f'{f}: related-product price -> per-pack')

io.open(f, 'w', encoding='utf-8').write(s)

print('All changes applied:')
for c in changes:
    print(' -', c)
