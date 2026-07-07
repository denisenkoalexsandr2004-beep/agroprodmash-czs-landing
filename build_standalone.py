# -*- coding: utf-8 -*-
"""Собирает один самодостаточный HTML-файл (CSS + JS встроены) из раздельных файлов.
Открывается двойным кликом без сервера."""
import io, os, re

base = os.path.dirname(os.path.abspath(__file__))
def read(p):
    with io.open(os.path.join(base, p), encoding="utf-8") as f:
        return f.read()

html = read("index.html")
css  = read(os.path.join("css", "styles.css"))
i18n = read(os.path.join("js", "i18n.js"))
main = read(os.path.join("js", "main.js"))

# Встраиваем CSS вместо <link rel="stylesheet" href="css/styles.css">
html = html.replace(
    '<link rel="stylesheet" href="css/styles.css">',
    "<style>\n" + css + "\n</style>"
)

# Встраиваем JS вместо двух <script src=...>
html = html.replace(
    '<script src="js/i18n.js"></script>\n<script src="js/main.js"></script>',
    "<script>\n" + i18n + "\n" + main + "\n</script>"
)

# Встраиваем картинки из img/ как data-URI (если есть), чтобы единый файл был портативным.
import base64, mimetypes
def data_uri(rel):
    path = os.path.join(base, rel)
    if not os.path.isfile(path):
        return None
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    with open(path, "rb") as fh:
        return "data:%s;base64,%s" % (mime, base64.b64encode(fh.read()).decode("ascii"))

# hero.jpg в <img class="hero__bg" src="img/hero.jpg" ...>
hero_uri = data_uri(os.path.join("img", "hero.jpg"))
if hero_uri:
    html = html.replace('src="img/hero.jpg"', 'src="' + hero_uri + '"')

# логотипы partners (logo-gtd / logo-textileexpo / logo-caitme) — прямая подмена src
for _lg in ("logo-gtd.png", "logo-textileexpo.png", "logo-caitme.png", "logo.png"):
    _u = data_uri(os.path.join("img", _lg))
    if _u:
        html = html.replace('src="img/' + _lg + '"', 'src="' + _u + '"')

# Галерея gallery-1..6 рендерится из JS строкой "img/gallery-"+g+".jpg".
# Подставляем карту data-URI прямо в JS, чтобы единый файл не зависел от папки.
gmap = {}
for g in range(1, 7):
    u = data_uri(os.path.join("img", "gallery-%d.jpg" % g))
    if u:
        gmap[str(g)] = u
if gmap:
    inject = "window.__GALLERY__=" + str(gmap).replace("'", '"') + ";\n"
    html = html.replace("window.I18N = {", inject + "window.I18N = {", 1)
    # переключаем источник: если есть встроенная карта — берём из неё
    html = html.replace(
        'img.src = "img/gallery-" + g + ".jpg";',
        'img.src = (window.__GALLERY__ && window.__GALLERY__[g]) ? window.__GALLERY__[g] : "img/gallery-" + g + ".jpg";'
    )

# Фото контактов contact-1..3 — main.js сам читает window.__CONTACTS__, поэтому
# достаточно вставить карту data-URI (без подмены строки источника).
cmap = {}
for c in range(1, 4):
    u = data_uri(os.path.join("img", "contact-%d.jpg" % c))
    if u:
        cmap[str(c)] = u
if cmap:
    inject_c = "window.__CONTACTS__=" + str(cmap).replace("'", '"') + ";\n"
    html = html.replace("window.I18N = {", inject_c + "window.I18N = {", 1)

out = os.path.join(os.path.dirname(base), "Лендинг_ЦЗС_Текстиль.html")
with io.open(out, "w", encoding="utf-8") as f:
    f.write(html)

# контрольные проверки
assert "<style>" in html, "CSS не встроен"
assert "window.I18N" in html, "i18n не встроен"
assert 'href="css/styles.css"' not in html, "остался внешний CSS"
assert 'src="js/' not in html, "остался внешний JS"
print("OK ->", out, "(", len(html), "симв. )")
