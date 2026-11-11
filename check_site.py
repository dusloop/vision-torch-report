"""Check local assets and HTML IDs without browser dependencies."""
from html.parser import HTMLParser
from pathlib import Path
root = Path(__file__).parent
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f"Duplicate ID: {a['id']}"
            self.ids.add(a['id'])
        for key in ('href', 'src'):
            val = a.get(key, '')
            if val.startswith('./'):
                assert (root / val.split('?', 1)[0]).is_file(), f'Missing asset: {val}'
p = Page()
p.feed((root / 'index.html').read_text())
css = (root / 'style.css').read_text()
assert css.strip() and css.count('{') == css.count('}'), 'CSS brace mismatch'
assert 'prefers-reduced-motion' in css
assert '@media print' in css
print('PASS: local assets, unique HTML IDs, CSS brace balance, reduced-motion and print rules')
