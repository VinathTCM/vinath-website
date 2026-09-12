import io

f = 'admin/orders/index.html'
s = io.open(f, encoding='utf-8').read()

# Extract the JS code (lines 5018-5077)
js_start = s.find('// ===== 运费设置弹窗 =====')
js_end = s.find('})();', js_start) + len('})();')
js_code = s[js_start:js_end]

# Remove it from inside the external script tag
s = s[:js_start] + s[js_end:]

# Now find the </script> that closes the i18n script, and add our JS after it
# The </script> should be right after where we removed the code
script_close = s.find('</script>', js_start - 10)
if script_close > 0:
    insert_pos = script_close + len('</script>')
    new_script = '\n<script>\n// ===== 运费设置弹窗 =====\ndocument.addEventListener(\'DOMContentLoaded\', function(){\n' + js_code.replace('(function(){', '').replace('})();', '') + '\n});\n</script>\n'
    s = s[:insert_pos] + new_script + s[insert_pos:]
    io.open(f, 'w', encoding='utf-8').write(s)
    print('Fixed: JS moved to independent script tag with DOMContentLoaded')
else:
    print('Could not find </script>')
