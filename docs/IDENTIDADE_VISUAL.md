# Identidade visual do portal

Esta referência registra as decisões visuais usadas na primeira tela do portal
interno. A fonte da paleta é o `Manual de Marca GGP Revisado.pdf`, fornecido
para o projeto e mantido fora do repositório.

## Paleta oficial

| Token CSS | Hex | Uso no portal |
| --- | --- | --- |
| `--brand-aqua` | `#65e7de` | destaque, foco e estados de ação |
| `--brand-blue` | `#00819c` | gradientes, marca e elementos decorativos |
| `--brand-gray` | `#595959` | referência para superfícies e logo alternativa |
| `--brand-black` | `#1a1a1a` | texto escuro sobre ações claras |
| `--brand-white` | `#ffffff` | texto e logo sobre fundos escuros |

O manual orienta preservar contraste, sobriedade, elegância, minimalismo e
contemporaneidade. O logotipo deve manter área de proteção mínima de 50 px em
relação aos demais elementos; a composição da tela reserva esse espaço visual
ao redor da marca.

## Arquivos de marca

- `public/brand/ggp-logo-white-blue.png`: versão para fundos escuros.
- `public/brand/ggp-logo-gray-blue.png`: versão para fundos claros.

As imagens são os arquivos fornecidos pelo responsável, preservados em PNG
com transparência. O manual não é versionado para evitar duplicar um documento
de referência interno.

## Tipografia e movimento

- A interface usa **Plus Jakarta Sans Variable**, auto-hospedada pelo projeto,
  para manter nitidez, consistência e funcionamento sem dependência de fontes
  externas em tempo de execução.
- As entradas de página usam GSAP com movimentos curtos baseados somente em
  `transform` e opacidade. Usuários com `prefers-reduced-motion` recebem o
  estado final sem animação.
- A área transparente original das logos é compensada apenas pelo layout. Os
  arquivos oficiais e suas proporções não são modificados.
