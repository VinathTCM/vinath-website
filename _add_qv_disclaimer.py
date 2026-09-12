import io

css = '.qv-img-disclaimer{ position:absolute; bottom:10px; right:10px; background:rgba(255,255,255,.88); color:var(--espresso); font-size:10px; padding:3px 8px; border-radius:8px; font-weight:500; z-index:5; }'

# Chinese: add after qv-dots div
old_zh = '<div class="qv-dots" id="qvDots"></div>'
new_zh = '<div class="qv-dots" id="qvDots"></div><div class="qv-img-disclaimer">图片仅供参考</div>'

f = 'shop/index.html'
s = io.open(f, encoding='utf-8').read()
if old_zh in s and 'qv-img-disclaimer' not in s:
    s = s.replace(old_zh, new_zh, 1)
    # Add CSS
    idx = s.find('</style>')
    s = s[:idx] + '\n' + css + '\n' + s[idx:]
    io.open(f, 'w', encoding='utf-8').write(s)
    print(f'{f}: added qv disclaimer')
else:
    print(f'{f}: already has or pattern not found')

# English
old_en = '<div class="qv-dots" id="qvDots"></div>'
new_en = '<div class="qv-dots" id="qvDots"></div><div class="qv-img-disclaimer">Ref. only</div>'

f = 'en/shop/index.html'
s = io.open(f, encoding='utf-8').read()
if old_en in s and 'qv-img-disclaimer' not in s:
    s = s.replace(old_en, new_en, 1)
    idx = s.find('</style>')
    s = s[:idx] + '\n' + css + '\n' + s[idx:]
    io.open(f, 'w', encoding='utf-8').write(s)
    print(f'{f}: added qv disclaimer')
else:
    print(f'{f}: already has or pattern not found')
