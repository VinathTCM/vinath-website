import io

css = '.pd-img-disclaimer{ text-align:center; font-size:11px; color:var(--espresso-soft); opacity:.7; padding:6px 0 0; }'

# === 中文商品详情页 ===
f = 'product/index.html'
s = io.open(f, encoding='utf-8').read()

# Add disclaimer after pd-dots
old_zh = "'<div class=\"pd-dots\">'+dots+'</div></div>'"
new_zh = "'<div class=\"pd-dots\">'+dots+'</div><div class=\"pd-img-disclaimer\">图片仅供参考，实物以实际商品为准</div></div>'"
assert old_zh in s, f'{f}: pd-dots not found'
s = s.replace(old_zh, new_zh, 1)

# Add CSS before </style>
if '.pd-img-disclaimer{' not in s:
    idx = s.find('</style>')
    s = s[:idx] + '\n' + css + '\n' + s[idx:]

io.open(f, 'w', encoding='utf-8').write(s)
print(f'{f}: done')

# === 英文商品详情页 ===
f = 'en/product/index.html'
s = io.open(f, encoding='utf-8').read()

old_en = "'<div class=\"pd-dots\">'+dots+'</div></div>'"
new_en = "'<div class=\"pd-dots\">'+dots+'</div><div class=\"pd-img-disclaimer\">Images are for reference only. Actual product may vary.</div></div>'"
assert old_en in s, f'{f}: pd-dots not found'
s = s.replace(old_en, new_en, 1)

if '.pd-img-disclaimer{' not in s:
    idx = s.find('</style>')
    s = s[:idx] + '\n' + css + '\n' + s[idx:]

io.open(f, 'w', encoding='utf-8').write(s)
print(f'{f}: done')
