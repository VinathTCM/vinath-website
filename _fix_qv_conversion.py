import io

# The bug: line 972 ends with ';' which terminates the statement,
# so line 973's '+ <div class="qv-conversion"...' is a dead expression.
# Fix: remove the ';' at end of line 972 so the concatenation continues.

old_pattern = """'<div class="qv-variant" data-v="trial"><div class="vv-lbl">试用装</div><div class="vv-price">MYR '+p.trial+'</div></div>';
      + '<div class="qv-conversion" style="margin-top:8px;font-size:12px;color:var(--espresso-soft);text-align:center;">'+((p.trialPerFull || 7) + ' 个试用装 = 1 个正装')+'</div>';"""

new_pattern = """'<div class="qv-variant" data-v="trial"><div class="vv-lbl">试用装</div><div class="vv-price">MYR '+p.trial+'</div></div>'
      + '<div class="qv-conversion" style="margin-top:8px;font-size:12px;color:var(--espresso-soft);text-align:center;">'+((p.trialPerFull || 7) + ' 个试用装 = 1 个正装')+'</div>';"""

f = 'shop/index.html'
s = io.open(f, encoding='utf-8').read()
if old_pattern in s:
    s = s.replace(old_pattern, new_pattern, 1)
    io.open(f, 'w', encoding='utf-8').write(s)
    print(f'{f}: fixed (removed extra semicolon)')
else:
    print(f'{f}: pattern not found - may already be fixed or different format')

# English version
old_en = """'<div class="qv-variant" data-v="trial"><div class="vv-lbl">Trial</div><div class="vv-price">MYR '+p.trial+'</div></div>';
      + '<div class="qv-conversion" style="margin-top:8px;font-size:12px;color:var(--espresso-soft);text-align:center;">'+((p.trialPerFull || 7) + ' trial packs = 1 full pack')+'</div>';"""
new_en = """'<div class="qv-variant" data-v="trial"><div class="vv-lbl">Trial</div><div class="vv-price">MYR '+p.trial+'</div></div>'
      + '<div class="qv-conversion" style="margin-top:8px;font-size:12px;color:var(--espresso-soft);text-align:center;">'+((p.trialPerFull || 7) + ' trial packs = 1 full pack')+'</div>';"""

f = 'en/shop/index.html'
s = io.open(f, encoding='utf-8').read()
if old_en in s:
    s = s.replace(old_en, new_en, 1)
    io.open(f, 'w', encoding='utf-8').write(s)
    print(f'{f}: fixed (removed extra semicolon)')
else:
    # Try to find the actual pattern in English file
    import re
    m = re.search(r"qv-variant.*?trial.*?</div></div>';\s*\n\s*\+ '<div class=\"qv-conversion\"", s)
    if m:
        print(f'{f}: found similar pattern at pos {m.start()}, context: {s[m.start():m.start()+150]}')
    else:
        print(f'{f}: English pattern not found, checking...')
        # Check if qv-conversion exists
        if 'qv-conversion' in s:
            print(f'{f}: qv-conversion exists in file')
        else:
            print(f'{f}: qv-conversion NOT in file')
