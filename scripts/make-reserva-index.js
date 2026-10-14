#!/usr/bin/env node
/* ============================================================
   MANIFESTO DAS RESERVAS DE CHEFÃO
   ------------------------------------------------------------
   Varre images/bosses/reserva/*.webp e escreve index.json com as
   reservas agrupadas por tema (prefixo do arquivo) e um rótulo
   legível. O Estúdio de Retratos do painel do Boss lê esse JSON —
   assim adicionar uma reserva nova não exige tocar no app.
     uso: node scripts/make-reserva-index.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'images', 'bosses', 'reserva');
const OUT = path.join(DIR, 'index.json');

// prefixo do arquivo -> tema do app (os que não batem com tema ficam de fora)
const TEMAS = ['classico', 'zodiaco', 'hercules', 'acao', 'folclore', 'nordica', 'roma', 'rpg', 'galactica', 'aneis'];

const slugLabel = slug => slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const arquivos = fs.readdirSync(DIR).filter(f => f.endsWith('.webp')).sort();
const temas = {};
let soltos = 0;
for (const f of arquivos) {
    const prefixo = f.replace(/\.webp$/, '').split('-')[0];
    if (!TEMAS.includes(prefixo)) { soltos++; continue; }
    const slug = f.replace(/\.webp$/, '').slice(prefixo.length + 1);
    (temas[prefixo] = temas[prefixo] || []).push({
        file: `images/bosses/reserva/${f}`,
        slug,
        label: slugLabel(slug)
    });
}

const manifest = {
    descricao: 'Reservas de retrato de chefão por tema, usadas pelo Estúdio de Retratos do painel do Boss.',
    total: arquivos.length,
    temas
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');

const porTema = Object.entries(temas).map(([t, v]) => `${t}:${v.length}`).join(' · ');
console.log(`✅ ${OUT.replace(path.join(__dirname, '..') + path.sep, '')} — ${arquivos.length} reservas (${porTema})${soltos ? ` · ${soltos} fora de tema` : ''}`);
