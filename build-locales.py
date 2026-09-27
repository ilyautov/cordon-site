"""Build static, crawlable locale pages from one template and one English catalog."""
from pathlib import Path
import html, json, re
root = Path(__file__).resolve().parent
catalog = json.loads((root / 'locales/en.json').read_text())
template = (root / 'template.html').read_text()
missing = set()
def translate(value):
    decoded = html.unescape(value)
    key = decoded.strip()
    if re.search('[А-Яа-яЁё]', key) and key not in catalog:
        missing.add(key)
    return html.escape(decoded.replace(key, catalog.get(key, key)) if key else decoded, quote=False)
def switch(language):
    return '<span class="language-switch" role="group" aria-label="'+('Язык' if language=='ru' else 'Language')+'">'+''.join(f'<a href="../{target}/" data-language="{target}" lang="{target}" hreflang="{target}"'+(' aria-current="true"' if target==language else '')+f'>{target.upper()}</a>' for target in ['ru','en'])+'</span>'
for language in ['ru', 'en']:
    source = template
    if language == 'en':
        source = re.sub(r'>([^<>]+)<', lambda m: '>'+translate(m[1])+'<', source)
        source = re.sub(r'(alt|aria-label|content)="([^"]*)"', lambda m: m[1]+'="'+translate(m[2]).replace('"','&quot;')+'"', source)
        source = source.replace('lang="ru"','lang="en"',1)
        source = source.replace('1 ₽','RUB 1').replace('1 990 ₽','RUB 1,990')
    # Locale documents are one directory below shared CSS, scripts and images.
    source = re.sub(r'(href|src)="(\.[^"#]*)"', lambda m: m[1]+'="../'+m[2]+'"', source)
    source = source.replace('</head>', '<link rel="stylesheet" href="../language.css"><link rel="stylesheet" href="../product.css"><link rel="stylesheet" href="../checkpoint.css">\n<link rel="canonical" href="https://cordon.aifrontier.tech/'+language+'/">\n<link rel="alternate" hreflang="ru" href="https://cordon.aifrontier.tech/ru/">\n<link rel="alternate" hreflang="en" href="https://cordon.aifrontier.tech/en/">\n<link rel="alternate" hreflang="x-default" href="https://cordon.aifrontier.tech/">\n<meta property="og:url" content="https://cordon.aifrontier.tech/'+language+'/">\n<meta property="og:locale" content="'+('ru_RU' if language=='ru' else 'en_US')+'">\n</head>')
    github = '<a href="https://github.com/ilyautov/cordon" target="_blank" rel="noopener noreferrer">GitHub ↗</a>'
    source = source.replace(github, '<div class="masthead-links">'+switch(language)+'<a href="https://t.me/gorilla_under_hood" target="_blank" rel="noopener noreferrer">Telegram ↗</a>'+github+'</div>', 1)
    source = source.replace('<span class="nav-progress"', switch(language)+'<span class="nav-progress"',1)
    target = 'en' if language=='ru' else 'ru'
    # The suggestion speaks the proposed language, without stealing keyboard focus.
    question, change, keep = ('Prefer English?', 'Switch to English', 'Оставить русский') if language=='ru' else ('Переключить на русский?', 'Переключить', 'Keep English')
    banner = f'<aside class="language-suggestion" aria-label="{question}" hidden><p lang="{target}">{question}</p><div><a href="../{target}/" data-language="{target}" lang="{target}">{change}</a><button type="button" id="keep-language">{keep}</button></div></aside>'
    source = source.replace('</body>',banner+'</body>')
    if language=='en':
        source = source.replace('<pre id="proof-task">', '<pre id="proof-task" lang="ru">')
        source = source.replace('».', '”.')
        source = source.replace('model behavior was not tested here.', 'model behavior was not tested here. English scenario text is a translation; the expandable evidence preserves the original Russian test inputs and recorded results.')
    target_dir=root/language;target_dir.mkdir(exist_ok=True);(target_dir/'index.html').write_text(source)
if missing:
    raise SystemExit('Missing translations: '+repr(sorted(missing)))
(root/'index.html').write_text('''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cordon · Language / Язык</title><style>body{background:#111814;color:#eeece1;font:20px system-ui;display:grid;place-content:center;min-height:90vh}a{color:#e8b979;padding:16px;display:inline-block}a:focus-visible{outline:2px solid currentColor}</style><script src="./route.js" type="module"></script></head><body><main><h1>CORDON</h1><p><a href="./en/" lang="en">English</a><a href="./ru/" lang="ru">Русский</a></p></main></body></html>''')
print('Built ru/ and en/ with full static copy, metadata and language controls.')
