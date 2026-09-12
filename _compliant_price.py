import io, re

results = []

# ========== 中文商店列表页 ==========
f = 'shop/index.html'
s = io.open(f, encoding='utf-8').read()

# CSS: add price-sub styles after .prod-price CSS
css_anchor = '.prod-price{ font-size:14px; color:var(--clay); font-weight:700; }'
if css_anchor in s:
    css_add = css_anchor + '\n.prod-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:2px; }\n.feat-price-sub{ font-size:11px; color:rgba(255,255,255,.8); margin-top:2px; }'
    s = s.replace(css_anchor, css_add, 1)
    results.append(f'{f}: CSS added')

# 1. prod-card price
old = "'<div class=\"prod-price\">MYR '+p.trial+' 起</div>'"
new = "'<div class=\"prod-price\">试用装 RM '+p.trial+' 起</div><div class=\"prod-price-sub\">正装'+(p.trial_per_full||7)+'包 约RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/包</div>'"
assert old in s, f'{f}: prod-price not found'
s = s.replace(old, new, 1)
results.append(f'{f}: prod-card price')

# 2. feat-card price
old2 = "'<div class=\"feat-price\">MYR '+p.trial+' 起</div>'"
new2 = "'<div class=\"feat-price\">试用装 RM '+p.trial+' 起</div><div class=\"feat-price-sub\">正装'+(p.trial_per_full||7)+'包 约RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/包</div>'"
assert old2 in s, f'{f}: feat-price not found'
s = s.replace(old2, new2, 1)
results.append(f'{f}: feat-card price')

io.open(f, 'w', encoding='utf-8').write(s)

# ========== 英文商店列表页 ==========
f = 'en/shop/index.html'
s = io.open(f, encoding='utf-8').read()

css_anchor = '.prod-price{ font-size:14px; color:var(--clay); font-weight:700; }'
if css_anchor in s:
    css_add = css_anchor + '\n.prod-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:2px; }\n.feat-price-sub{ font-size:11px; color:rgba(255,255,255,.8); margin-top:2px; }'
    s = s.replace(css_anchor, css_add, 1)
    results.append(f'{f}: CSS added')

# 3. prod-card price (EN)
old3 = "'<div class=\"prod-price\">MYR '+p.trial+' onwards</div>'"
new3 = "'<div class=\"prod-price\">Trial from RM '+p.trial+'</div><div class=\"prod-price-sub\">Full size '+(p.trial_per_full||7)+' sachets ~RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/sachet</div>'"
assert old3 in s, f'{f}: prod-price not found'
s = s.replace(old3, new3, 1)
results.append(f'{f}: prod-card price')

# 4. feat-card price (EN) - use regex for robustness
m = re.search(r"('<div class=\"feat-price\">MYR '\+p\.trial\+' onwards</div>')", s)
assert m, f'{f}: feat-price not found'
old4 = m.group(1)
new4 = "'<div class=\"feat-price\">Trial from RM '+p.trial+'</div><div class=\"feat-price-sub\">Full size '+(p.trial_per_full||7)+' sachets ~RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/sachet</div>'"
s = s.replace(old4, new4, 1)
results.append(f'{f}: feat-card price')

io.open(f, 'w', encoding='utf-8').write(s)

# ========== 中文商品详情页（相关商品） ==========
f = 'product/index.html'
s = io.open(f, encoding='utf-8').read()

# CSS for related-price-sub
css_anchor2 = '.related-price{ font-size:13px; color:var(--clay); font-weight:700; }'
if css_anchor2 in s:
    css_add2 = css_anchor2 + '\n.related-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:1px; }'
    s = s.replace(css_anchor2, css_add2, 1)
    results.append(f'{f}: CSS added')

old5 = "'<div class=\"related-price\">MYR '+p.trial+' 起</div>'"
new5 = "'<div class=\"related-price\">试用装 RM '+p.trial+' 起</div><div class=\"related-price-sub\">正装'+(p.trial_per_full||7)+'包 约RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/包</div>'"
assert old5 in s, f'{f}: related-price not found'
s = s.replace(old5, new5, 1)
results.append(f'{f}: related-product price')

io.open(f, 'w', encoding='utf-8').write(s)

# ========== 英文商品详情页（相关商品） ==========
f = 'en/product/index.html'
s = io.open(f, encoding='utf-8').read()

css_anchor3 = '.related-price{ font-size:13px; color:var(--clay); font-weight:700; }'
if css_anchor3 in s:
    css_add3 = css_anchor3 + '\n.related-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:1px; }'
    s = s.replace(css_anchor3, css_add3, 1)
    results.append(f'{f}: CSS added')

old6 = "'<div class=\"related-price\">MYR '+p.trial+' onwards</div>'"
new6 = "'<div class=\"related-price\">Trial from RM '+p.trial+'</div><div class=\"related-price-sub\">Full size '+(p.trial_per_full||7)+' sachets ~RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/sachet</div>'"
assert old6 in s, f'{f}: related-price not found'
s = s.replace(old6, new6, 1)
results.append(f'{f}: related-product price')

io.open(f, 'w', encoding='utf-8').write(s)

print('All changes applied:')
for r in results:
    print(' -', r)
