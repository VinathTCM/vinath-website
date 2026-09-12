import io

# New CSS: absolute positioned on image bottom-right, same style as card badges
css_new = '.pd-img-disclaimer{ position:absolute; bottom:12px; right:12px; background:rgba(255,255,255,.88); color:var(--espresso); font-size:11px; padding:4px 10px; border-radius:10px; font-weight:500; z-index:5; }'

# Old CSS patterns to remove (there may be multiple versions)
old_patterns = [
    '.pd-img-disclaimer{ text-align:center; font-size:12px; color:var(--espresso); background:rgba(243,239,230,.6); padding:8px 12px; border-radius:8px; margin:8px auto 0; max-width:80%; font-weight:500; }',
    '.pd-img-disclaimer{ text-align:center; font-size:11px; color:var(--espresso-soft); opacity:.7; padding:6px 0 0; }',
]

for f in ['product/index.html', 'en/product/index.html']:
    s = io.open(f, encoding='utf-8').read()
    replaced = False
    for old in old_patterns:
        if old in s:
            s = s.replace(old, css_new, 1)
            replaced = True
            print(f'{f}: replaced old CSS')
            break
    if not replaced:
        if '.pd-img-disclaimer{' in s:
            # Find and replace whatever is there
            import re
            s = re.sub(r'\.pd-img-disclaimer\{[^}]*\}', css_new, s, count=1)
            print(f'{f}: replaced via regex')
        else:
            # Add before </style>
            idx = s.find('</style>')
            s = s[:idx] + '\n' + css_new + '\n' + s[idx:]
            print(f'{f}: added new CSS')
    io.open(f, 'w', encoding='utf-8').write(s)
