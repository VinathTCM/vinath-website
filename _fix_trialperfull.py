import io, re

results = []

# Pattern to find the normalize mapping line and add trialPerFull
# The mapping line looks like: trial:(typeof p.trial_price === 'number' ? p.trial_price : p.price),
# We add after it: trialPerFull:(p.trialPerFull || 7),

mapping_pattern = r"(trial:\(typeof p\.trial_price === 'number' \? p\.trial_price : p\.price\),)"
mapping_replacement = r"\1\n          trialPerFull:(p.trialPerFull || 7),"

# Price display: replace p.trial_per_full with p.trialPerFull (in the 6 price locations + qv-conversion)

files = ['shop/index.html', 'en/shop/index.html', 'product/index.html', 'en/product/index.html']

for f in files:
    s = io.open(f, encoding='utf-8').read()
    original = s

    # 1. Add trialPerFull to normalize mapping
    if 'trialPerFull:(p.trialPerFull || 7)' not in s:
        s2 = re.sub(mapping_pattern, mapping_replacement, s, count=1)
        if s2 != s:
            s = s2
            results.append(f'{f}: added trialPerFull mapping')
        else:
            results.append(f'{f}: WARNING - mapping pattern not found')

    # 2. Replace p.trial_per_full with p.trialPerFull in all price displays
    count = s.count('p.trial_per_full')
    if count > 0:
        s = s.replace('p.trial_per_full', 'p.trialPerFull')
        results.append(f'{f}: replaced {count}x p.trial_per_full -> p.trialPerFull')

    if s != original:
        io.open(f, 'w', encoding='utf-8').write(s)

print('Results:')
for r in results:
    print(' -', r)
