# Changelog — Diário de Cargas // Berzerker Mode

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [2.1.0] — 2026-10-15

### NOVO
- **Armazenamento durável (IndexedDB):** nova camada única em `js/storage.js`;
  migração automática do localStorage com validação e cópia antiga preservada;
  recuperação automática se o navegador limpar o localStorage.
- **Imagens como Blob:** retratos de chefões e fundo do Story Card deixam de
  ser base64 no localStorage (máx. ~1080 px, WebP/JPEG comprimido).
- **Backup melhorado:** exportação com um toque via File System Access API
  (quando o navegador tem), imagens incluídas no backup e restauração de ponta
  a ponta coberta por teste.
- **Painel "Armazenamento" em Config:** estado de persistência e uso/quota.
- **Usabilidade na academia:** botões de treino com alvo mínimo de 44×44 px
  (descanso, ✔ Registrar, navegação, ▲▼), textos ≥ 12 px na aba Treino,
  labels associados aos inputs e aria-label nos botões só com emoji.
- **Aba Hoje reordenada:** sessão ativa e registro rápido primeiro; mapa de
  prontidão e cardio recolhidos por padrão.

### CORRIGIDO
- "Fadiga real"/"Prontidão real" → **"Prontidão estimada"**, com aviso visível
  de que é estimativa (tempo desde o último treino + volume semanal).
- Alerta de Lombar com aviso de estimativa e "não substitui orientação
  profissional"; horas de recuperação apresentadas como aproximação.
- Importação de backup não restaurava os treinos salvos.
- Janelas de recuperação e faixas de séries centralizadas em
  `RECOVERY_CONSTANTS` (js/catalogo.js).

### REMOVIDO
- `planilha_diario.csv` (dados reais) saiu do repositório; entrou
  `planilha_diario.exemplo.csv` com dados fictícios.

## [2.0.0] e anteriores
Veja o histórico no README e nos commits do repositório.
