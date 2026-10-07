# Identidade visual do portal

O portal segue o design system do Grupo Gomes Pires (o mesmo padrão do
GGPost), adaptado à marca GGP. **Os tokens em `src/app/globals.css` são a fonte
da verdade**: se este documento e o código discordarem, o código vence e este
arquivo deve ser corrigido no mesmo commit.

## Princípios

- Ferramenta de trabalho, não vitrine: densidade alta, tipografia sóbria e cor
  com intenção. A cor entra pelos dados (status, item ativo, seleção), nunca por
  blocos decorativos.
- **Tema claro único.** Não existe tema escuro; não crie um.
- Proibido: gradiente decorativo, glow, sombra preta, emoji na interface, uma cor
  diferente por item "para ficar alegre", tarja lateral colorida em cartão,
  hero de marketing dentro do portal, caixa alta em botão ou texto corrido.

## Cor

| Token | Valor | Papel |
| --- | --- | --- |
| `--marca-azul` | `#00295d` | Primária: botão principal, item ativo, foco, avatar |
| `--marca-petroleo` | `#37809D` | Destaque: rótulos de marca, seleção, contadores |
| `--marca-verde` | `#29cd68` | Só significado (ponto de status). Nunca texto nem borda |

- Neutros frios (`--color-bg`, `--color-surface`, `--color-border`,
  `--color-text*`, `--color-nav-hover`, `--color-primary-bg`), nunca cinza puro.
- Semânticas com contraste AA: `--color-danger`, `--color-atencao`,
  `--color-sucesso` e seus fundos `-bg`.
- Status: ativo/enviado/aberto = sucesso; rascunho/pendente = atenção;
  bloqueado/erro = perigo; encerrado/inativo = neutro.
- Nunca escreva hex, `rgb()` ou cor do Tailwind em componente. Precisa de uma
  cor nova? Adicione o token no `:root`, derivado de um tom existente, com
  comentário dizendo para que serve.

## Tipografia

| Token | Tamanho | Uso |
| --- | --- | --- |
| `--fs-entrada` | 32px | Título da tela de entrada |
| `--fs-metrica` | 24px | Número de métrica |
| `--fs-titulo` | 20px | Título de tela |
| `--fs-secao` | 17px | Título de seção, texto em destaque |
| `--fs-nome` | 15px | Nome, título de cartão |
| `--fs-corpo` | 14px | Corpo, controles, navegação |
| `--fs-meta` | 13px | Metadados, legendas, dicas |
| `--fs-rotulo` | 11px | Badges e rótulo técnico — **piso absoluto** |

- Entrelinhas: `--lh-tight` (títulos e números), `--lh-snug`, `--lh-base`
  (corpo) e `--lh-relaxed` (parágrafos).
- Peso máximo 600 na interface. Números que mudam usam `tabular-nums`.
- Caixa alta só no rótulo técnico (`.rotulo-tec`: fonte mono, 11px, tracking
  0.16em) e na assinatura.
- Fontes previstas: Inter (interface), IBM Plex Mono (rótulo técnico) e Nunito
  (assinatura), sempre auto-hospedadas. Enquanto não forem adicionadas ao
  projeto, o `--font-ui` e o `--font-mono` recaem nas fontes do sistema.

## Forma, superfícies e controles

- Raios: `--radius` 14px (cartões, menus), `--radius-sm` 8px (botões, inputs),
  `--radius-pill` (navegação, badges, avatares), `--radius-folha` 20px (modais).
- Conteúdo: superfície branca + borda de 1px, **sem sombra**. Borda ou sombra,
  nunca as duas. Elevação (`--elev-2`) só como resposta ao ponteiro.
- Navegação (menu lateral, topo) usa vidro fosco; flutuantes (dialog, menu
  mobile) usam vidro denso com `--elev-3`. Nunca vidro sobre vidro.
- Controles da mesma linha têm a mesma altura: `--control-h` (40px) ou
  `--control-h-compact` (36px).

## Logotipo

- `public/brand/ggp-logo-gray-blue.png`: versão para fundo claro, usada no
  portal. A área visível ocupa `x=424..4376, y=1424..3376` do arquivo de
  4800px; o recorte no CSS depende dessas medidas.
- `public/brand/ggp-logo-white-blue.png`: versão para fundo escuro, sem uso no
  tema claro.
- Não recolorir, rotacionar nem aplicar sombra, contorno ou gradiente. Os
  arquivos oficiais e suas proporções não são modificados.

## Movimento

- Animações de entrada com GSAP usando somente `transform` e opacidade.
- Movimento comunica mudança de estado; nada de animação decorativa em loop.
- Usuários com `prefers-reduced-motion` recebem o estado final sem animação.
