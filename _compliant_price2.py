import io, re

results = []

def add_css(s, anchor, css_add):
    if anchor in s:
        return s.replace(anchor, css_add, 1), True
    return s, False

# ========== 中文商店列表页 ==========
f = 'shop/index.html'
s = io.open(f, encoding='utf-8').read()

# CSS
s, ok = add_css(s, '.prod-price{ font-size:14px; color:var(--clay); font-weight:700; }',
    '.prod-price{ font-size:14px; color:var(--clay); font-weight:700; }\n.prod-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:2px; }\n.feat-price-sub{ font-size:11px; color:rgba(255,255,255,.8); margin-top:2px; }')
if ok: results.append(f'{f}: CSS added')

# 1. prod-card price (has own quotes)
s = s.replace(
    "'<div class=\"prod-price\">MYR '+p.trial+' 起</div>'",
    "'<div class=\"prod-price\">试用装 RM '+p.trial+' 起</div><div class=\"prod-price-sub\">正装'+(p.trial_per_full||7)+'包 约RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/包</div>'",
    1)
results.append(f'{f}: prod-card price')

# 2. feat-card price (embedded in larger string, no outer quotes - use regex)
s = re.sub(
    r'<div class="feat-price">MYR \'\+p\.trial\+\' 起</div>',
    lambda m: '<div class="feat-price">试用装 RM \'+p.trial+\' 起</div><div class="feat-price-sub">正装\'+(p.trial_per_full||7)+\'包 约RM\'+(p.price/(p.trial_per_full||7)).toFixed(2)+\'/包</div>',
    s, count=1)
results.append(f'{f}: feat-card price')

io.open(f, 'w', encoding='utf-8').write(s)

# ========== 英文商店列表页 ==========
f = 'en/shop/index.html'
s = io.open(f, encoding='utf-8').read()

s, ok = add_css(s, '.prod-price{ font-size:14px; color:var(--clay); font-weight:700; }',
    '.prod-price{ font-size:14px; color:var(--clay); font-weight:700; }\n.prod-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:2px; }\n.feat-price-sub{ font-size:11px; color:rgba(255,255,255,.8); margin-top:2px; }')
if ok: results.append(f'{f}: CSS added')

# 3. prod-card price (EN)
s = s.replace(
    "'<div class=\"prod-price\">MYR '+p.trial+' onwards</div>'",
    "'<div class=\"prod-price\">Trial from RM '+p.trial+'</div><div class=\"prod-price-sub\">Full size '+(p.trial_per_full||7)+' sachets ~RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/sachet</div>'",
    1)
results.append(f'{f}: prod-card price')

# 4. feat-card price (EN) - regex
s = re.sub(
    r'<div class="feat-price">MYR \'\+p\.trial\+\' onwards</div>',
    lambda m: '<div class="feat-price">Trial from RM \'+p.trial+\'</div><div class="feat-price-sub">Full size \'+(p.trial_per_full||7)+\' sachets ~RM\'+(p.price/(p.trial_per_full||7)).toFixed(2)+\'/sachet</div>',
    s, count=1)
results.append(f'{f}: feat-card price')

io.open(f, 'w', encoding='utf-8').write(s)

# ========== 中文商品详情页 ==========
f = 'product/index.html'
s = io.open(f, encoding='utf-8').read()

s, ok = add_css(s, '.related-price{ font-size:13px; color:var(--clay); font-weight:700; }',
    '.related-price{ font-size:13px; color:var(--clay); font-weight:700; }\n.related-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:1px; }')
if ok: results.append(f'{f}: CSS added')

# 5. related price (ZH) - check if embedded or standalone
if "'<div class=\"related-price\">MYR '+p.trial+' 起</div>'" in s:
    s = s.replace(
        "'<div class=\"related-price\">MYR '+p.trial+' 起</div>'",
        "'<div class=\"related-price\">试用装 RM '+p.trial+' 起</div><div class=\"related-price-sub\">正装'+(p.trial_per_full||7)+'包 约RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/包</div>'",
        1)
else:
    s = re.sub(
        r'<div class="related-price">MYR \'\+p\.trial\+\' 起</div>',
        lambda m: '<div class="related-price">试用装 RM \'+p.trial+\' 起</div><div class="related-price-sub">正装\'+(p.trial_per_full||7)+\'包 约RM\'+(p.price/(p.trial_per_full||7)).toFixed(2)+\'/包</div>',
        s, count=1)
results.append(f'{f}: related-product price')

io.open(f, 'w', encoding='utf-8').write(s)

# ========== 英文商品详情页 ==========
f = 'en/product/index.html'
s = io.open(f, encoding='utf-8').read()

s, ok = add_css(s, '.related-price{ font-size:13px; color:var(--clay); font-weight:700; }',
    '.related-price{ font-size:13px; color:var(--clay); font-weight:700; }\n.related-price-sub{ font-size:11px; color:var(--espresso-soft); opacity:.75; margin-top:1px; }')
if ok: results.append(f'{f}: CSS added')

# 6. related price (EN)
if "'<div class=\"related-price\">MYR '+p.trial+' onwards</div>'" in s:
    s = s.replace(
        "'<div class=\"related-price\">MYR '+p.trial+' onwards</div>'",
        "'<div class=\"related-price\">Trial from RM '+p.trial+'</div><div class=\"related-price-sub\">Full size '+(p.trial_per_full||7)+' sachets ~RM'+(p.price/(p.trial_per_full||7)).toFixed(2)+'/sachet</div>'",
        1)
else:
    s = re.sub(
        r'<div class="related-price">MYR \'\+p\.trial\+\' onwards</div>',
        lambda m: '<div class="related-price">Trial from RM \'+p.trial+\'</div><div class="related-price-sub">Full size \'+(p.trial_per_full||7)+\' sachets ~RM\'+(p.price/(p.trial_per_full||7)).toFixed(2)+\'/sachet</div>',
        s, count=1)
results.append(f'{f}: related-product price')

io.open(f, 'w', encoding='utf-8').write(s)

print('All changes applied:')
for r in results:
    print(' -', r)
