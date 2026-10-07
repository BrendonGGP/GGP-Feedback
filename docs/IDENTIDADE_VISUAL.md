# Identidade visual do portal

O portal usa a identidade visual do **GGPost** (repositório `businessMH/businessMH`,
`frontend/src/index.css`), adaptada à marca GGP. **Os tokens em
`src/app/globals.css` são a fonte da verdade**: se este documento e o código
discordarem, o código vence e este arquivo deve ser corrigido no mesmo commit.

## Princípios

- Ferramenta de trabalho: densidade alta, tipografia sóbria, cor com intenção.
  A cor entra pelos dados (status, item ativo, seleção), não por blocos
  decorativos.
- **Tema claro e escuro.** A classe `.dark` no `<html>` redefine os mesmos
  tokens; componente nenhum escolhe cor por tema. A escolha fica no aparelho
  (`localStorage`, chave `ggp-feedback:tema`); sem escolha, segue o sistema.
- Vidro só na **camada de navegação** (ilha lateral, cápsulas, menu); conteúdo
  mora em **folhas** sólidas. Nunca vidro sobre vidro.
- Sem gradiente decorativo, glow, emoji na interface ou uma cor por item.

## Cor

| Token | Papel |
| --- | --- |
| `--color-primary` (`#2e7895`) | Ação e estado: botão principal, ícone ativo, foco, avatar |
| `--marca-azul` (`#00295d`), `--marca-petroleo` (`#37809D`), `--marca-grafite` | Só marca e logotipo |
| `--marca-verde` | Só significado (presença, comunicado oficial) |
| `--color-bg` + grade de pontos | Fundo do app |
| `--color-surface` | Folhas de conteúdo |
| `--color-preenchimento(-2/-3)` | Campos, chips e peças dentro de uma folha |
| `--color-sucesso`, `--color-atencao-texto`, `--color-danger` (+ `-bg`) | Status (texto sempre AA) |

Hovers e trilhos usam `rgb(var(--tinta) / X%)`: escurece no claro e clareia no
escuro. Nunca escreva hex solto em componente; derive um token novo.

## Tipografia

Fontes auto-hospedadas em `public/fonts/` (sem CDN): **Inter** (interface),
**Jost** (título da tela de entrada), **Nunito** (assinatura) e **IBM Plex
Mono**.

- Título de tela: `.sobretitulo` (12px, caixa alta, 0.06em) + `.titulo-grande`
  (34/40, 700) + descrição 17px secundária.
- Seção 17px/600; nome 15px/600; corpo 14–15px; metadados 13px; mínimo 11px.
- Escala em tokens `--fs-*` e `--lh-*`. Números que mudam usam `tabular-nums`.

## Forma e superfícies

| Elemento | Raio | Material |
| --- | --- | --- |
| Folha de conteúdo (`.folha`) | 24px (`--raio-cartao`) | `--color-surface` + `--sombra-folha`, **sem borda** |
| Sobreposição (modal, ilha, menu) | 28px (`--radius-folha`) | vidro ou superfície + `--elev-3` |
| Peça interna | 14px (`--radius`) | `--color-preenchimento` |
| Campo | 12px | preenchido, borda transparente; foco com anel `--color-primary-anel` |
| Botão, lente, chip, badge, avatar | pílula | — |

Botões: primário (petróleo), secundário (preenchimento), tint, perigo e
fantasma, nas alturas 32/40/48px.

## Movimento

Vocabulário em `src/components/motion/`:

- **Motion** (`movimento.ts`) para estado: a **lente** da navegação desliza com
  mola (`MOLA_LENTE`) entre os itens; sobreposições usam `SOBREPOSICAO`.
- **GSAP** (`gsap.ts`) para coreografia:
  - **abertura do portal**: a ilha se forma, as cápsulas descem e o conteúdo chega;
  - **revelação por rolagem**: use `<Revelar>` e marque itens com `data-revelar`.
- **Troca de rota**: o painel entra pelo lado da seção (`.painel-entra`, em CSS).
- **Troca de tema**: círculo que se abre a partir do botão (View Transitions).
- **Entrada** (`src/components/auth/entrada/`): grade de pontos interativa, cascata
  `in-up`, sublinhado que se desenha sob o título e colagem ao vivo.
- Tudo respeita `prefers-reduced-motion`; o vidro respeita
  `prefers-reduced-transparency` e `prefers-contrast`.

## Logotipo

`src/components/portal/logo-ggp.tsx` recorta os PNGs oficiais sem alterar a
arte:

- `ggp-logo-gray-blue.png`, no tema claro: área visível `x=424..4376,
  y=1424..3376` de 4800px;
- `ggp-logo-white-blue.png`, no tema escuro: área visível `x=496..4448,
  y=1580..3532`.

Não recolorir, rotacionar nem aplicar sombra ou gradiente.

## Ícones

Hugeicons (estilo stroke rounded), sempre via `src/components/portal/portal-icon.tsx`.
Um conceito equivale a um nome; o item ativo engrossa o traço.
