import io, os, re

# Pages to update (Chinese + English)
pages = [
    'shop/index.html', 'about/index.html', 'support/index.html',
    'orders/index.html', 'bookings/index.html', 'checkout/index.html',
    'en/shop/index.html', 'en/about/index.html', 'en/consult/index.html',
    'en/support/index.html', 'en/orders/index.html', 'en/bookings/index.html',
    'en/checkout/index.html', 'product/index.html', 'en/product/index.html',
]

# Patterns to find the last quick link before </ul> in footer
# Chinese: 预约追踪
# English: Track Booking
zh_pattern = re.compile(r'(<li><a[^>]*>预约追踪</a></li>)')
en_pattern = re.compile(r'(<li><a[^>]*>Track Booking</a></li>)')
# Also try data-i18n patterns
zh_i18n = re.compile(r'(<li><a[^>]*data-i18n="footer\.track_booking"[^>]*>[^<]*</a></li>)')
en_i18n = re.compile(r'(<li><a[^>]*data-i18n="footer\.track_booking"[^>]*>[^<]*</a></li>)')

for p in pages:
    if not os.path.exists(p):
        print(f'{p}: not found, skip')
        continue
    s = io.open(p, encoding='utf-8').read()
    if '/policy/' in s:
        print(f'{p}: already has policy link, skip')
        continue
    
    # Determine if this is English page
    is_en = p.startswith('en/')
    
    # Try to find the booking tracking link in footer
    link_added = False
    
    # Try i18n pattern first
    m = zh_i18n.search(s)
    if not m:
        m = en_i18n.search(s)
    if not m:
        m = zh_pattern.search(s)
    if not m:
        m = en_pattern.search(s)
    
    if m:
        if is_en:
            new_link = m.group(1) + '\n    <li><a href="/policy/" data-i18n="footer.policy">Policies & Terms</a></li>'
        else:
            new_link = m.group(1) + '\n        <li><a href="/policy/" data-i18n="footer.policy">政策与条款</a></li>'
        s = s[:m.start()] + new_link + s[m.end():]
        io.open(p, 'w', encoding='utf-8').write(s)
        print(f'{p}: policy link added')
        link_added = True
    
    if not link_added:
        print(f'{p}: could not find booking link, manual check needed')
