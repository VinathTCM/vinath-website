import io, re

css = """
.prod-thumb .img-ref{ position:absolute; bottom:6px; right:8px; background:rgba(255,255,255,.82); color:var(--espresso-soft); font-size:9px; padding:2px 6px; border-radius:8px; font-weight:500; z-index:2; }
.feat-card .img-ref{ position:absolute; bottom:8px; right:10px; background:rgba(0,0,0,.45); color:#fff; font-size:9px; padding:2px 6px; border-radius:8px; font-weight:500; z-index:3; }"""

def add_card_disclaimer(f, label_zh, label_en, is_en):
    s = io.open(f, encoding='utf-8').read()
    label = label_en if is_en else label_zh

    # 1. prod-card: add after img in prod-thumb
    # Pattern: '<div class="prod-thumb">' + (hasImg ? '<img ...>' : ...)
    old_prod = "'<div class=\"prod-thumb\">' + (hasImg ? '<img src=\"'+p.imgs[0]+'\" loading=\"lazy\" decoding=\"async\" alt=\"'+p.name+'\">' : '<div class=\"pt-icon\">'+(ICON[p.type]||GENERIC_CAT_ICON)+'</div>')"
    new_prod = "'<div class=\"prod-thumb\">' + (hasImg ? '<img src=\"'+p.imgs[0]+'\" loading=\"lazy\" decoding=\"async\" alt=\"'+p.name+'\"><span class=\"img-ref\">'+%s+'</span>' : '<div class=\"pt-icon\">'+(ICON[p.type]||GENERIC_CAT_ICON)+'</div>')" % repr(label)
    if old_prod in s:
        s = s.replace(old_prod, new_prod, 1)
        print(f'{f}: prod-card disclaimer added')
    else:
        print(f'{f}: WARNING prod-card pattern not found')

    # 2. feat-card: add after img (before feat-scrim)
    old_feat = "'<img src=\"'+p.imgs[0]+'\" loading=\"lazy\" decoding=\"async\" alt=\"'+p.name+'\"><div class=\"feat-scrim\"></div>'"
    new_feat = "'<img src=\"'+p.imgs[0]+'\" loading=\"lazy\" decoding=\"async\" alt=\"'+p.name+'\"><span class=\"img-ref\">'+%s+'</span><div class=\"feat-scrim\"></div>'" % repr(label)
    if old_feat in s:
        s = s.replace(old_feat, new_feat, 1)
        print(f'{f}: feat-card disclaimer added')
    else:
        print(f'{f}: WARNING feat-card pattern not found')

    # 3. Add CSS
    if '.img-ref{' not in s:
        idx = s.find('</style>')
        if idx > 0:
            s = s[:idx] + '\n' + css + '\n' + s[idx:]
            print(f'{f}: CSS added')

    io.open(f, 'w', encoding='utf-8').write(s)

add_card_disclaimer('shop/index.html', '图片仅供参考', 'Ref. only', False)
add_card_disclaimer('en/shop/index.html', '图片仅供参考', 'Ref. only', True)
