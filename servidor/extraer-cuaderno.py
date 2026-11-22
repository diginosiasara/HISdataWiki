#!/usr/bin/env python3
"""Convierte assets/excel/Solucion_cuaderno_estadistica_sanitaria.xlsx al formato de assets/data/workbooks.js
(libro «cuaderno») para que la hoja se muestre con cálculo vivo y fórmulas explicadas. Uso: python3 servidor/extraer-cuaderno.py"""
import json, re, openpyxl
from pathlib import Path
R = Path(__file__).resolve().parent.parent
F = R / 'assets/excel/Solucion_cuaderno_estadistica_sanitaria.xlsx'
DESC = {
 'Resumen': 'Índice del libro y resultado clave de cada práctica.',
 'P0 Estatura': 'Medidas de centro y dispersión (n = 6), tabla de frecuencias con Sturges (n = 30) e histograma.',
 'P1 IMC': 'Parámetros poblacionales del IMC, límites z = ±1, proporciones fuera de ±1σ y regla 68-95-99,7.',
 'P2 Normalidad': 'Edad y presión arterial: media, mediana, moda y resultado del test de Shapiro-Wilk.',
 'P3 Pretérmino': 'Puntuaciones z con datos propios y con la región; recién nacidos en riesgo (z < −1).',
 'P4 GRD': 'Peso relativo de cada GRD = coste medio del GRD / coste medio global.'}
wf = openpyxl.load_workbook(F); wv = openpyxl.load_workbook(F, data_only=True)
def col(c):
    if c is None or c.rgb is None or not isinstance(c.rgb, str): return None
    h = c.rgb[-6:].lower(); return '#' + h
sheets = []
for ws in wf:
    wsv = wv[ws.title]; cells = {}
    for row in ws.iter_rows():
        for c in row:
            if c.value is None: continue
            rec = {}; v = c.value
            if isinstance(v, str) and v.startswith('='):
                rec['f'] = v[1:]; cv = wsv[c.coordinate].value
                if cv is not None: rec['c'] = round(cv, 12) if isinstance(cv, float) else cv
            else:
                rec['v'] = v
            f = c.font
            if f.b: rec['b'] = 1
            if f.sz and f.sz > 11: rec['sz'] = float(f.sz)
            fg = col(f.color) if f.color else None
            if fg and fg not in ('#000000',): rec['fg'] = fg
            if c.fill and c.fill.fill_type == 'solid':
                bg = col(c.fill.fgColor)
                if bg and bg != '#000000': rec['bg'] = bg
            if c.alignment.horizontal: rec['al'] = c.alignment.horizontal
            if c.alignment.wrap_text: rec['w'] = 1
            if f.i: rec['i'] = 1
            if c.number_format and c.number_format != 'General': rec['n'] = c.number_format
            if 'f' not in rec and isinstance(v, (int, float)) and fg == '#0000ff': rec['input'] = True
            cells[c.coordinate] = rec
    widths = []
    for i in range(1, ws.max_column + 1):
        d = ws.column_dimensions.get(openpyxl.utils.get_column_letter(i)); widths.append(float(d.width) if d and d.width else 12.0)
    charts = []
    for ch in ws._charts:
        ttl = ''.join(r.t for p in ch.title.tx.rich.p for r in (p.r or []))
        def axt(ax):
            try: return ''.join(r.t for p in ax.title.tx.rich.p for r in (p.r or []))
            except Exception: return None
        s = ch.series[0]; sh = ws.title
        ref = lambda f: re.sub(r'\$', '', f.split('!')[1])
        charts.append({'title': ttl, 'plots': [{'kind': 'bar', 'series': [{'nameRef': {'sheet': sh, 'ref': ref(s.tx.strRef.f)}, 'name': 'Frecuencia absoluta',
            'x': {'sheet': sh, 'ref': ref(s.cat.strRef.f if s.cat.strRef else s.cat.numRef.f)}, 'y': {'sheet': sh, 'ref': ref(s.val.numRef.f)}, 'color': '#4f81bd', 'line': False, 'marker': False}], 'barDir': 'col'}],
            'anchor': {'col': ch.anchor._from.col, 'row': ch.anchor._from.row}, 'x': {'title': axt(ch.x_axis), 'fmt': 'General'}, 'y': {'title': axt(ch.y_axis), 'fmt': '0'}})
    sheets.append({'name': ws.title, 'desc': DESC.get(ws.title, ''), 'rows': ws.max_row, 'cols': ws.max_column, 'cells': cells, 'colWidths': widths,
                   'merges': [str(m) for m in ws.merged_cells.ranges], 'charts': charts, 'images': []})
book = {'id': 'cuaderno', 'title': 'Cuaderno de prácticas 0 a 4 (resuelto)', 'file': 'Solucion_cuaderno_estadistica_sanitaria.xlsx',
        'desc': 'Solución completa del cuaderno: estatura, IMC, normalidad, pretérmino y GRD, con las fórmulas de Excel que se recalculan si cambias los datos.', 'sheets': sheets}
p = R / 'assets/data/workbooks.js'; s = p.read_text(encoding='utf8')
m = re.search(r',"cuaderno":\{.*?\}(?=\};\n  root\.HIS_BOOKS)', s, re.S)
js = json.dumps(book, ensure_ascii=False, separators=(',', ':'))
if m: s = s[:m.start()] + ',"cuaderno":' + js + s[m.end():]
else:
    k = s.index('};\n  root.HIS_BOOKS'); s = s[:k] + ',"cuaderno":' + js + s[k:]
p.write_text(s, encoding='utf8'); print('libro cuaderno:', len(sheets), 'hojas,', sum(len(x['cells']) for x in sheets), 'celdas')
