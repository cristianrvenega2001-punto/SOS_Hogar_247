"""Aplica la fase 1 (Ley 21.719 + seguridad) al index.html del sitio SOS Hogar 24/7.

Uso: python3 aplicar_fase1.py ruta/a/index.html
Edita el archivo en su lugar y muestra qué cambió. Falla sin escribir si no encuentra algo.
"""
import re
import sys

CONSENT = '''
            <!-- Ley 21.719: aviso y consentimiento -->
            <input type="text" name="bot-field" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" />
            <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45;color:#9AA0AC;cursor:pointer;">
              <input type="checkbox" name="acepta-privacidad" required style="margin-top:3px;accent-color:#E81010;flex-shrink:0;" />
              <span>Acepto que SOS Hogar 24/7 use estos datos solo para responder mi solicitud y coordinar el servicio, según la <a href="privacidad.html" target="_blank" rel="noopener" style="color:#FF6B6B;">Política de Privacidad</a>. *</span>
            </label>
            <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45;color:#9AA0AC;cursor:pointer;">
              <input type="checkbox" name="acepta-ofertas" style="margin-top:3px;accent-color:#E81010;flex-shrink:0;" />
              <span>(Opcional) Quiero recibir ofertas y recordatorios de mantención por WhatsApp.</span>
            </label>
'''

FOOTER_LINK = '<a href="privacidad.html" style="color:#888;text-decoration:underline;">Política de Privacidad</a>'


def main(path):
    html = open(path, encoding="utf-8").read()
    original = html
    changes = []

    # 1. Quitar el RUT personal del pie de pagina (deja el resto de la linea).
    html, n = re.subn(r'RUT:\s*[\d.]+-[\dkK]\s*·\s*', '', html)
    if n == 0:
        html, n = re.subn(r'\s*·?\s*RUT:\s*[\d.]+-[\dkK]', '', html)
    if n == 0:
        sys.exit("No encontré el RUT en el pie de página.")
    changes.append(f"RUT quitado ({n})")

    # 2. Casillas de consentimiento + honeypot antes del boton de envio del formulario.
    form = re.search(r'<form\b[^>]*>.*?</form>', html, re.S)
    if not form:
        sys.exit("No encontré el formulario.")
    block = form.group(0)
    if 'acepta-privacidad' in block:
        sys.exit("El formulario ya tiene las casillas de consentimiento.")
    submit = re.search(r'\n([ \t]*)<button[^>]*type="submit"', block)
    if not submit:
        submit = re.search(r'\n([ \t]*)<button', block)
    if not submit:
        sys.exit("No encontré el botón de envío del formulario.")
    new_block = block[:submit.start()] + CONSENT.rstrip('\n') + block[submit.start():]
    # Netlify Forms: activar el campo trampa si el formulario usa data-netlify.
    if 'data-netlify' in new_block and 'netlify-honeypot' not in new_block:
        new_block = new_block.replace('data-netlify', 'netlify-honeypot="bot-field" data-netlify', 1)
    html = html.replace(block, new_block)
    changes.append("casillas de consentimiento y campo antispam en el formulario")

    # 3. Si el envio va por JavaScript, ignorar envios de robots.
    m = re.search(r'function handleSubmit\(e\)\s*\{\s*e\.preventDefault\(\);', html)
    if m:
        guard = m.group(0) + "\n    if (e.target.querySelector('[name=\"bot-field\"]').value) return;"
        html = html.replace(m.group(0), guard, 1)
        changes.append("handleSubmit ignora robots")

    # 4. Enlace a la politica en el pie de pagina, junto al copyright.
    m = re.search(r'©\s*20\d\d[^<]*', html)
    if not m:
        sys.exit("No encontré el copyright del pie de página.")
    html = html.replace(m.group(0), m.group(0).rstrip() + ' · ' + FOOTER_LINK, 1)
    changes.append("enlace a Política de Privacidad en el pie")

    if html == original:
        sys.exit("Sin cambios.")
    open(path, "w", encoding="utf-8").write(html)
    print("Cambios aplicados:\n- " + "\n- ".join(changes))


if __name__ == "__main__":
    main(sys.argv[1])
