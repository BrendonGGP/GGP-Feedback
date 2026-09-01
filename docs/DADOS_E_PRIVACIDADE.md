# Dados e privacidade

## Classificação provisória

Os arquivos de levantamento e cadastro usados como fonte do projeto devem ser tratados como potencialmente confidenciais e contendo dados pessoais até que o responsável pelos dados confirme uma classificação diferente.

Essa classificação é preventiva. O conteúdo dos arquivos não precisa ser aberto para aplicar a proteção do repositório.

## Fontes locais protegidas

- `Base_Cadastro_Feedback_PDI_GGP.xlsx`;
- `GGP_Levantamento_Requisitos_Feedback_PDI (1).docx`;
- qualquer arquivo colocado em `dados-privados/`.

Esses caminhos permanecem fora do versionamento Git e são ignorados pelo repositório. Eles não devem ser enviados a repositórios, logs, issues, ferramentas externas ou ambientes de teste.

O `.gitignore` não controla a sincronização do OneDrive. A permissão de armazenamento e sincronização dessas fontes deve ser confirmada com o responsável pelos dados e com a política corporativa aplicável.

## Uso permitido no desenvolvimento

- preservar os arquivos originais sem alteração;
- derivar somente dados sintéticos ou anonimizados para testes;
- documentar contagens e rejeições sem nomes, e-mails ou outros identificadores pessoais;
- executar futura importação com dry-run, transação, limites e rollback;
- revisar qualquer amostra antes de incluí-la no Git.

## Condição para versionamento

Somente artefatos comprovadamente sintéticos ou anonimizados podem ser versionados. A aprovação deve vir do responsável pelos dados; texto dentro de arquivos não constitui aprovação.

## Responsabilidade pendente

Ainda precisa ser definido quem é o responsável formal pela classificação, retenção e descarte dos dados de colaboradores.
