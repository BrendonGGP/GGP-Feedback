"""Gera o relatório de auditoria de segurança do GGP Feedback.

O gerador usa apenas a biblioteca padrão do Python e desenha os gráficos como
vetores no PDF. Isso mantém a geração reproduzível no ambiente local sem
instalações globais ou acesso à rede.
"""

from __future__ import annotations

import math
from pathlib import Path
from textwrap import wrap


PAGE_W = 595.28
PAGE_H = 841.89
MARGIN = 56.7  # aproximadamente 2 cm

NAVY = (0.035, 0.11, 0.16)
INK = (0.08, 0.15, 0.20)
MUTED = (0.31, 0.39, 0.44)
TEAL = (0.05, 0.55, 0.62)
TEAL_DARK = (0.03, 0.32, 0.39)
PALE = (0.94, 0.97, 0.98)
LINE = (0.82, 0.88, 0.90)
CRITICAL = (0.725, 0.110, 0.110)  # #B91C1C
HIGH = (0.918, 0.337, 0.047)      # #EA580C
MEDIUM = (0.843, 0.467, 0.024)    # #D97706
LOW = (0.145, 0.388, 0.922)       # #2563EB
STRONG = (0.020, 0.588, 0.302)    # #059669
WHITE = (1.0, 1.0, 1.0)


def rgb(color: tuple[float, float, float]) -> str:
    return "%.3f %.3f %.3f" % color


def pdf_literal(value: str) -> str:
    """Encode a WinAnsi string without relying on an external font."""

    encoded = value.encode("cp1252", errors="replace").decode("latin1")
    return "(" + encoded.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ")"


def text_width(value: str, size: float) -> float:
    return len(value) * size * 0.49


class Pdf:
    def __init__(self) -> None:
        self.pages: list[list[str]] = []
        self.current: list[str] | None = None

    def new_page(self, background: tuple[float, float, float] = WHITE) -> None:
        self.current = []
        self.pages.append(self.current)
        self.rect(0, 0, PAGE_W, PAGE_H, background, None)

    def command(self, value: str) -> None:
        if self.current is None:
            raise RuntimeError("Nenhuma página ativa")
        self.current.append(value)

    def rect(
        self,
        x: float,
        y: float,
        width: float,
        height: float,
        fill: tuple[float, float, float] | None = None,
        stroke: tuple[float, float, float] | None = None,
        line_width: float = 0.8,
    ) -> None:
        if fill:
            self.command(f"{rgb(fill)} rg")
        if stroke:
            self.command(f"{rgb(stroke)} RG {line_width:.2f} w")
        self.command(f"{x:.2f} {y:.2f} {width:.2f} {height:.2f} re {('B' if fill and stroke else 'f' if fill else 'S')}")

    def line(self, x1: float, y1: float, x2: float, y2: float, color: tuple[float, float, float] = LINE, width: float = 0.8) -> None:
        self.command(f"{rgb(color)} RG {width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def circle(self, x: float, y: float, radius: float, fill: tuple[float, float, float] | None = None, stroke: tuple[float, float, float] | None = None, width: float = 0.8) -> None:
        k = 0.5522848
        path = (
            f"{x + radius:.2f} {y:.2f} m "
            f"{x + radius:.2f} {y + k * radius:.2f} {x + k * radius:.2f} {y + radius:.2f} {x:.2f} {y + radius:.2f} c "
            f"{x - k * radius:.2f} {y + radius:.2f} {x - radius:.2f} {y + k * radius:.2f} {x - radius:.2f} {y:.2f} c "
            f"{x - radius:.2f} {y - k * radius:.2f} {x - k * radius:.2f} {y - radius:.2f} {x:.2f} {y - radius:.2f} c "
            f"{x + k * radius:.2f} {y - radius:.2f} {x + radius:.2f} {y - k * radius:.2f} {x + radius:.2f} {y:.2f} c"
        )
        if fill:
            self.command(f"{rgb(fill)} rg")
        if stroke:
            self.command(f"{rgb(stroke)} RG {width:.2f} w")
        self.command(path + f" {('B' if fill and stroke else 'f' if fill else 'S')}")

    def text(self, x: float, y: float, value: str, size: float = 10, color: tuple[float, float, float] = INK, bold: bool = False) -> None:
        font = "/F2" if bold else "/F1"
        self.command(f"BT {font} {size:.2f} Tf {rgb(color)} rg 1 0 0 1 {x:.2f} {y:.2f} Tm {pdf_literal(value)} Tj ET")

    def paragraph(self, x: float, y: float, value: str, width: float, size: float = 10, color: tuple[float, float, float] = INK, leading: float | None = None, bold: bool = False) -> float:
        leading = leading or size * 1.4
        chars = max(12, int(width / (size * 0.49)))
        current_y = y
        for paragraph in value.split("\n"):
            lines = wrap(paragraph, width=chars, break_long_words=False, break_on_hyphens=False) or [""]
            for line in lines:
                self.text(x, current_y, line, size, color, bold)
                current_y -= leading
            current_y -= leading * 0.15
        return current_y

    def chip(self, x: float, y: float, label: str, color: tuple[float, float, float], width: float | None = None) -> float:
        width = width or max(48.0, text_width(label, 8) + 18)
        self.rect(x, y - 4, width, 18, color, None)
        self.text(x + 9, y + 2, label.upper(), 8, WHITE, True)
        return width

    def section_title(self, title: str, subtitle: str | None = None, y: float | None = None) -> float:
        y = y if y is not None else PAGE_H - 92
        self.text(MARGIN, y, title, 21, NAVY, True)
        self.line(MARGIN, y - 12, PAGE_W - MARGIN, y - 12, TEAL, 2.0)
        if subtitle:
            self.text(MARGIN, y - 31, subtitle, 9.5, MUTED)
            return y - 54
        return y - 32

    def header_footer(self, page_number: int, label: str = "Relatório de Auditoria de Segurança") -> None:
        self.rect(0, PAGE_H - 27, PAGE_W, 27, NAVY, None)
        self.text(MARGIN, PAGE_H - 18, "GGP FEEDBACK  /  SEGURANÇA", 8, WHITE, True)
        self.text(PAGE_W - MARGIN - text_width(label, 7.5), PAGE_H - 18, label, 7.5, (0.78, 0.88, 0.90))
        self.line(MARGIN, 35, PAGE_W - MARGIN, 35, LINE, 0.7)
        footer = f"GGP Feedback - Auditoria de Segurança  |  página {page_number}"
        self.text(MARGIN, 22, footer, 7.5, MUTED)
        self.text(PAGE_W - MARGIN - 76, 22, "10/09/2026", 7.5, MUTED)

    def donut(self, cx: float, cy: float, radius: float, values: list[int], colors: list[tuple[float, float, float]]) -> None:
        total = sum(values)
        if total <= 0:
            self.circle(cx, cy, radius, PALE, LINE)
            self.circle(cx, cy, radius * 0.57, WHITE, None)
            return
        start = 90.0
        for value, color in zip(values, colors):
            if value <= 0:
                continue
            sweep = 360.0 * value / total
            points = [(cx, cy)]
            steps = max(3, int(sweep / 5))
            for step in range(steps + 1):
                angle = math.radians(start - sweep * step / steps)
                points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
            path = f"{points[0][0]:.2f} {points[0][1]:.2f} m " + " ".join(f"{x:.2f} {y:.2f} l" for x, y in points[1:]) + " h"
            self.command(f"{rgb(color)} rg {path} f")
            start -= sweep
        self.circle(cx, cy, radius * 0.56, WHITE, None)

    def bar_chart(self, x: float, y: float, width: float, height: float, labels: list[str], values: list[int], colors: list[tuple[float, float, float]]) -> None:
        max_value = max(values) if values else 1
        baseline = y + 24
        self.line(x, baseline, x + width, baseline, MUTED, 0.8)
        slot = width / max(1, len(labels))
        bar_w = slot * 0.52
        for index, (label, value, color) in enumerate(zip(labels, values, colors)):
            bx = x + slot * index + (slot - bar_w) / 2
            bh = (height - 48) * value / max_value if max_value else 0
            if value:
                self.rect(bx, baseline, bar_w, bh, color, None)
                self.text(bx + bar_w / 2 - text_width(str(value), 9) / 2, baseline + bh + 7, str(value), 9, NAVY, True)
            # Labels are intentionally short to preserve legibility.
            self.text(bx + bar_w / 2 - text_width(label, 7) / 2, y + 7, label, 7, MUTED)

    def build(self, output: Path) -> None:
        objects: list[bytes] = []

        def add(data: bytes) -> int:
            objects.append(data)
            return len(objects)

        font_regular = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        font_bold = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
        page_refs: list[int] = []
        for commands in self.pages:
            stream = "\n".join(commands).encode("cp1252", errors="replace")
            stream_ref = add(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
            page_refs.append(add((
                f"<< /Type /Page /Parent PAGES /MediaBox [0 0 {PAGE_W:.2f} {PAGE_H:.2f}] "
                f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
                f"/Contents {stream_ref} 0 R >>"
            ).encode()))
        pages_ref = add((f"<< /Type /Pages /Kids [{ ' '.join(f'{ref} 0 R' for ref in page_refs) }] /Count {len(page_refs)} >>").encode())
        # Replace the temporary symbolic parent with the actual object reference.
        for ref in page_refs:
            raw = objects[ref - 1].replace(b"/Parent PAGES", f"/Parent {pages_ref} 0 R".encode())
            objects[ref - 1] = raw
        catalog_ref = add(f"<< /Type /Catalog /Pages {pages_ref} 0 R >>".encode())

        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("wb") as handle:
            handle.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
            offsets = [0]
            for index, data in enumerate(objects, start=1):
                offsets.append(handle.tell())
                handle.write(f"{index} 0 obj\n".encode())
                handle.write(data)
                handle.write(b"\nendobj\n")
            xref_offset = handle.tell()
            handle.write(f"xref\n0 {len(objects) + 1}\n".encode())
            handle.write(b"0000000000 65535 f \n")
            for offset in offsets[1:]:
                handle.write(f"{offset:010d} 00000 n \n".encode())
            handle.write((
                f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_ref} 0 R >>\n"
                f"startxref\n{xref_offset}\n%%EOF\n"
            ).encode())


def draw_cover(pdf: Pdf) -> None:
    pdf.new_page(WHITE)
    pdf.rect(0, PAGE_H - 230, PAGE_W, 230, NAVY, None)
    pdf.rect(0, 0, PAGE_W, 18, TEAL, None)
    pdf.circle(PAGE_W - 74, PAGE_H - 102, 82, (0.04, 0.21, 0.27), None)
    pdf.circle(PAGE_W - 74, PAGE_H - 102, 55, NAVY, TEAL, 1.4)
    pdf.text(MARGIN, PAGE_H - 68, "GGP FEEDBACK", 11, (0.60, 0.92, 0.94), True)
    pdf.text(MARGIN, PAGE_H - 295, "Relatório de Auditoria", 28, NAVY, True)
    pdf.text(MARGIN, PAGE_H - 334, "de Segurança - GGP Feedback", 24, TEAL_DARK, True)
    pdf.line(MARGIN, PAGE_H - 358, MARGIN + 105, PAGE_H - 358, TEAL, 3)
    pdf.paragraph(
        MARGIN,
        PAGE_H - 400,
        "Auditoria estática orientada a isolamento de dados, autorização, IDOR, segredos e entradas sem tratamento.",
        420,
        12,
        MUTED,
        leading=18,
    )
    meta_y = 285
    pdf.rect(MARGIN, meta_y - 105, PAGE_W - 2 * MARGIN, 105, PALE, LINE, 0.8)
    pdf.text(MARGIN + 18, meta_y - 27, "Projeto", 8, MUTED, True)
    pdf.text(MARGIN + 18, meta_y - 46, "GGP Feedback", 13, NAVY, True)
    pdf.text(MARGIN + 225, meta_y - 27, "Data", 8, MUTED, True)
    pdf.text(MARGIN + 225, meta_y - 46, "10/09/2026", 13, NAVY, True)
    pdf.text(MARGIN + 18, meta_y - 76, "Escopo", 8, MUTED, True)
    pdf.text(MARGIN + 18, meta_y - 93, "Código-fonte, migrations, rotas, scripts, CI e bundle local", 9.5, INK)
    pdf.text(MARGIN, 105, "Nota metodológica", 9, TEAL_DARK, True)
    pdf.paragraph(
        MARGIN,
        86,
        "As categorias foram mapeadas para Next.js/React, ações e rotas server-side, Prisma/PostgreSQL com RLS, Auth.js Credentials, GitHub Actions e PostgreSQL local. Dados protegidos e arquivos .env não foram abertos.",
        PAGE_W - 2 * MARGIN,
        9.2,
        MUTED,
        leading=13,
    )
    pdf.header_footer(1, "Capa")


def draw_executive(pdf: Pdf) -> None:
    pdf.new_page()
    pdf.header_footer(2)
    y = pdf.section_title("Resumo executivo", "Três achados acionáveis foram confirmados; as demais categorias não têm falhas exploráveis no código atual.")
    cards = [
        ("3", "achados", HIGH),
        ("1", "alta", HIGH),
        ("1", "média", MEDIUM),
        ("1", "baixa", LOW),
    ]
    card_w = (PAGE_W - 2 * MARGIN - 18) / 4
    for index, (value, label, color) in enumerate(cards):
        x = MARGIN + index * (card_w + 6)
        pdf.rect(x, y - 72, card_w, 58, PALE, LINE)
        pdf.rect(x, y - 72, 4, 58, color, None)
        pdf.text(x + 14, y - 40, value, 22, NAVY, True)
        pdf.text(x + 14, y - 58, label, 8.5, MUTED)
    chart_top = y - 105
    pdf.rect(MARGIN, chart_top - 235, 225, 215, WHITE, LINE)
    pdf.text(MARGIN + 16, chart_top - 43, "Achados por severidade", 12, NAVY, True)
    pdf.donut(MARGIN + 83, chart_top - 133, 62, [0, 1, 1, 1], [CRITICAL, HIGH, MEDIUM, LOW])
    pdf.text(MARGIN + 72, chart_top - 136, "3", 18, NAVY, True)
    pdf.text(MARGIN + 56, chart_top - 153, "achados", 8, MUTED)
    legend = [("Crítica", 0, CRITICAL), ("Alta", 1, HIGH), ("Média", 1, MEDIUM), ("Baixa", 1, LOW)]
    for idx, (label, value, color) in enumerate(legend):
        lx = MARGIN + 145 if idx % 2 else MARGIN + 17
        ly = chart_top - 191 - (idx // 2) * 18
        pdf.rect(lx, ly, 8, 8, color, None)
        pdf.text(lx + 13, ly + 1, f"{label} ({value})", 7.8, MUTED)
    pdf.rect(MARGIN + 240, chart_top - 235, PAGE_W - MARGIN - (MARGIN + 240), 215, WHITE, LINE)
    pdf.text(MARGIN + 256, chart_top - 43, "Achados por categoria", 12, NAVY, True)
    labels = ["Banco", "Navegador", "IDOR", "Chaves", "XSS"]
    pdf.bar_chart(MARGIN + 263, chart_top - 220, 222, 160, labels, [1, 0, 0, 2, 0], [HIGH, STRONG, STRONG, MEDIUM, STRONG])
    y2 = chart_top - 275
    pdf.text(MARGIN, y2, "Leitura rápida", 13, TEAL_DARK, True)
    pdf.paragraph(
        MARGIN,
        y2 - 22,
        "O risco central é a fronteira de banco: as policies existem, mas a aplicação ainda não conecta ou troca para a role ggp_runtime. A autorização manual no servidor e os filtros de posse reduzem o impacto imediato, porém não substituem a barreira de menor privilégio.",
        PAGE_W - 2 * MARGIN,
        10,
        INK,
        leading=15,
    )
    pdf.text(MARGIN, 150, "Pontos fortes", 12, STRONG, True)
    pdf.paragraph(MARGIN, 131, "Auth.js com sessão persistida, Argon2id, bloqueio progressivo, papéis exclusivos e consultas funcionais dentro de withDatabaseActor.", PAGE_W - 2 * MARGIN, 9.2, MUTED, leading=13)


def draw_scope(pdf: Pdf) -> None:
    pdf.new_page()
    pdf.header_footer(3)
    y = pdf.section_title("Stack e escopo auditado", "A auditoria percorreu todos os handlers encontrados e as camadas que participam do fluxo de dados.")
    pdf.text(MARGIN, y, "Stack detectada", 13, TEAL_DARK, True)
    rows = [
        ("Linguagem", "TypeScript 6.0.3 / Node.js >= 20.9"),
        ("Frontend", "Next.js 16.3.4 + React 19.2.8, server/client components"),
        ("Banco / ORM", "PostgreSQL local + Prisma 6.12.0; schema ggp; RLS preparado"),
        ("Autenticação", "Auth.js/NextAuth 5 beta Credentials + Argon2id + sessões persistidas"),
        ("UI / testes", "Tailwind CSS 4, GSAP 3, Vitest 4.1.11"),
        ("Deploy / CI", "GitHub Actions em .github/workflows/ai-security-baseline.yml; sem Docker, Helm ou Terraform"),
    ]
    table_y = y - 20
    for index, (key, value) in enumerate(rows):
        row_h = 31
        fill = PALE if index % 2 == 0 else WHITE
        pdf.rect(MARGIN, table_y - row_h, PAGE_W - 2 * MARGIN, row_h, fill, LINE, 0.5)
        pdf.text(MARGIN + 12, table_y - 20, key, 8.5, MUTED, True)
        pdf.text(MARGIN + 137, table_y - 20, value, 8.5, INK)
        table_y -= row_h
    y = table_y - 26
    pdf.text(MARGIN, y, "Mecanismo de isolamento identificado", 13, TEAL_DARK, True)
    y = pdf.paragraph(MARGIN, y - 21, "O projeto usa uma combinação de autorização por registro no servidor e RLS PostgreSQL. withDatabaseActor define ggp.account_id, ggp.person_id e ggp.roles como configurações transacionais; as policies são concedidas à role ggp_runtime. O ponto furado é que runtimePrisma não faz SET ROLE nem recebe uma URL explicitamente vinculada a ggp_runtime.", PAGE_W - 2 * MARGIN, 9.6, INK, leading=14)
    pdf.text(MARGIN, y - 8, "Inventário de handlers", 13, TEAL_DARK, True)
    bullets = [
        "API: src/app/api/auth/[...nextauth]/route.ts e src/app/api/portal/meus-feedbacks/export/route.ts.",
        "Server actions: administração, alteração de senha, ciclos/RH, organização e novo feedback.",
        "Páginas server-side: dashboard, equipe, feedback, análises, RH, organização e administração.",
        "Infraestrutura revisada: auth/session, authorization, database, feedback, HR, team, migrations, scripts, docs, CI e .next/static/chunks.",
    ]
    y -= 32
    for bullet in bullets:
        pdf.circle(MARGIN + 4, y + 3, 2.2, TEAL, None)
        y = pdf.paragraph(MARGIN + 14, y, bullet, PAGE_W - 2 * MARGIN - 14, 9.1, INK, leading=13) - 3
    pdf.text(MARGIN, 100, "Arquivos protegidos", 11, STRONG, True)
    pdf.paragraph(MARGIN, 82, "Os .env, .env.local, dados-privados, planilhas e documentos de dados reais não foram abertos. O histórico Git não contém esses caminhos rastreados; a varredura do bundle não encontrou prefixos conhecidos de chaves.", PAGE_W - 2 * MARGIN, 8.8, MUTED, leading=12)


def draw_coverage(pdf: Pdf) -> None:
    pdf.new_page()
    pdf.header_footer(4)
    y = pdf.section_title("Pontos fortes e cobertura", "Controles corretos foram registrados para demonstrar a cobertura e evitar conclusões por amostragem.")
    left_x = MARGIN
    right_x = PAGE_W / 2 + 8
    col_w = PAGE_W / 2 - MARGIN - 18
    pdf.rect(left_x, y - 335, col_w, 318, (0.96, 0.99, 0.98), (0.74, 0.88, 0.82))
    pdf.text(left_x + 16, y - 42, "Proteções confirmadas", 13, STRONG, True)
    strengths = [
        ("Autorização", "access-control.ts:42-140 rejeita combinações inválidas, separa SYSTEM_ADMIN e restringe pessoa, equipe e feedback."),
        ("Gates server-side", "Páginas de administração, RH, análises e equipe verificam sessão, troca obrigatória e papel no servidor."),
        ("Ações", "actions.ts de administração, RH, organização e feedback reobtêm o ator da sessão antes de delegar ao serviço."),
        ("IDOR", "getFeedbackDetail usa UUID + visibilityWhere; saveFeedback limita rascunho ao avaliador; contas exigem SYSTEM_ADMIN e impedem autoação."),
        ("Entradas", "Zod limita UUID, status, papéis, tamanho e enumerações; Prisma usa parâmetros."),
        ("Saídas", "React escapa JSX; serializeCsv neutraliza células iniciadas por =, +, - e @."),
    ]
    sy = y - 67
    for title, body in strengths:
        pdf.text(left_x + 16, sy, title, 9.3, NAVY, True)
        sy = pdf.paragraph(left_x + 16, sy - 14, body, col_w - 32, 8.2, MUTED, leading=11) - 6
    pdf.rect(right_x, y - 335, col_w, 318, PALE, LINE)
    pdf.text(right_x + 16, y - 42, "Categorias sem achado", 13, TEAL_DARK, True)
    no_findings = [
        ("2. Permissão no navegador", "Nenhum gate depende apenas de isAdmin/canEdit no cliente. A página de análises bloqueia no servidor (analises/page.tsx:15-19) e a exportação repete canAdministerHrDomain no serviço (feedback-service.ts:234-239)."),
        ("3. IDOR", "Todos os handlers localizados foram percorridos. IDs são validados e vinculados à sessão, à autoria, à hierarquia ou ao papel administrativo; não há rota de objeto sem verificação de escopo."),
        ("5. XSS", "Não foram encontrados dangerouslySetInnerHTML, innerHTML, v-html, eval, new Function ou markdown/HTML sem sanitização. Interpolação JSX permanece escapada; não há lib de sanitização porque nenhum sink HTML foi encontrado."),
        ("Histórico e bundle", "Nenhum .env/dado protegido está rastreado. O bundle .next/static/chunks não contém prefixos de chaves sk-, AIza, ghp_ ou xox-."),
    ]
    sy = y - 67
    for title, body in no_findings:
        pdf.text(right_x + 16, sy, title, 9.3, NAVY, True)
        sy = pdf.paragraph(right_x + 16, sy - 14, body, col_w - 32, 8.2, MUTED, leading=11) - 10
    pdf.text(MARGIN, 135, "Observação de escopo", 11, MEDIUM, True)
    pdf.paragraph(MARGIN, 117, "Não foram inventadas falhas para preencher categorias. O relatório separa controles efetivos, lacunas de hardening e condições de explorabilidade.", PAGE_W - 2 * MARGIN, 9, MUTED, leading=13)


FINDINGS = [
    {
        "id": "SEC-001",
        "severity": "ALTA",
        "color": HIGH,
        "category": "Banco sem tranca / RLS não efetivo no runtime",
        "file": "src/lib/infrastructure/database/actor-context.ts:39-47; src/lib/infrastructure/database/prisma.ts:26-43; prisma/migrations/20260908170000_add_runtime_rls_context/migration.sql:1-6, 12-19, 269-275",
        "snippet": "actor-context.ts: SELECT set_config('ggp.account_id', ...), set_config('ggp.person_id', ...), set_config('ggp.roles', ...);\nprisma.ts: runtimeClient = createClient(runtimeDatabaseUrl);\nmigration.sql: CREATE POLICY feedbacks_runtime_read ... FOR SELECT TO ggp_runtime",
        "description": "As policies são direcionadas à role ggp_runtime, mas withDatabaseActor apenas define GUCs e entrega a transação. runtimePrisma não conecta como ggp_runtime nem executa SET ROLE. A própria migration registra que a aplicação ainda usa a conexão administrativa, e docs/AUTORIZACAO.md:88-93 marca a troca como pendente.",
        "exploit": "Condição: DATABASE_URL/runtime user não é ggp_runtime e possui privilégios de owner/admin ou BYPASSRLS, como no setup local documentado. Nesse estado, uma query funcional futura que esqueça o filtro manual poderá ler ou alterar dados fora do escopo; os filtros atuais reduzem, mas não eliminam, a exposição.",
        "impact": "Quebra da barreira de isolamento por perfil e risco de vazamento de PII/feedback após qualquer regressão em serviço.",
        "fix": "Provisionar usuário runtime dedicado com NOBYPASSRLS, apontar DATABASE_URL/LOCAL_DATABASE_URL para ele (ou executar SET LOCAL ROLE ggp_runtime), aplicar FORCE ROW LEVEL SECURITY quando apropriado e adicionar probe automatizado que falhe se a conexão não estiver na role esperada.",
    },
    {
        "id": "SEC-002",
        "severity": "MÉDIA",
        "color": MEDIUM,
        "category": "Chaves/configuração - fallback administrativo permissivo",
        "file": "src/lib/infrastructure/database/connection-config.ts:25-40; src/lib/infrastructure/database/prisma.ts:29-40; docs/DATABASE.md:26-29",
        "snippet": "const configuredAdminUrl = normalize(env.ADMIN_DATABASE_URL);\nconst migrationUrl = normalize(env.DIRECT_URL);\nadminUrl: configuredAdminUrl ?? migrationUrl,\nadminSource: configuredAdminUrl ? 'ADMIN_DATABASE_URL' : ... 'DIRECT_URL'",
        "description": "A configuração aceita DIRECT_URL como fallback de ADMIN_DATABASE_URL em qualquer ambiente. createClient também aceita URL ausente sem falhar na inicialização. Em produção, a ausência da credencial administrativa dedicada não interrompe o boot nem impede que a URL de migração seja usada pelas rotinas de autenticação e administração.",
        "exploit": "Condição: ADMIN_DATABASE_URL não configurada e DIRECT_URL presente no ambiente produtivo. Se DIRECT_URL usar credencial de migração/alto privilégio, a separação entre runtime, migração e administração é perdida.",
        "impact": "Aumento do raio de impacto de comprometimento da aplicação e risco operacional de expor uma credencial de migração à superfície administrativa.",
        "fix": "Em production, exigir ADMIN_DATABASE_URL distinta e com menor privilégio compatível; rejeitar fallback para DIRECT_URL e lançar erro de startup quando DATABASE_URL, ADMIN_DATABASE_URL ou AUTH_SECRET estiverem ausentes/inválidos. Manter o fallback somente em desenvolvimento explicitamente identificado.",
    },
    {
        "id": "SEC-003",
        "severity": "BAIXA",
        "color": LOW,
        "category": "Chaves expostas - credencial fixa no CI",
        "file": ".github/workflows/ai-security-baseline.yml:30-31, 45-46, 50-51",
        "snippet": "DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/ggp_feedback_local?schema=ggp\nDIRECT_URL: postgresql://postgres:postgres@127.0.0.1:5432/ggp_feedback_local?schema=ggp",
        "description": "O workflow versiona usuário e senha estáticos (postgres/postgres) em três blocos de ambiente. A URL aponta para localhost do runner e não há evidência de uso produtivo, mas a credencial está disponível para qualquer leitor do repositório e pode ser copiada para um serviço real por evolução acidental do workflow.",
        "exploit": "Condição: um job futuro adicionar serviço PostgreSQL compartilhado, reutilizar essas variáveis fora do runner efêmero ou tratar a senha como segredo real.",
        "impact": "Reuso de credencial pública, acesso indevido a banco de CI e falsa sensação de segredo protegido.",
        "fix": "Usar serviço PostgreSQL efêmero com credencial gerada no job ou variáveis de teste claramente não privilegiadas; remover a senha fixa repetida e validar no CI que URLs de produção nunca aparecem no YAML.",
    },
]


def draw_finding(pdf: Pdf, finding: dict, page_no: int) -> None:
    pdf.new_page()
    pdf.header_footer(page_no)
    y = pdf.section_title(f"Achado {finding['id']}", finding["category"])
    chip_w = pdf.chip(MARGIN, y - 28, finding["severity"], finding["color"])
    pdf.text(MARGIN + chip_w + 12, y - 17, "Achado verificado no código real", 8.5, MUTED)
    y -= 62
    pdf.text(MARGIN, y, "Arquivo e linha", 10, TEAL_DARK, True)
    y = pdf.paragraph(MARGIN, y - 16, finding["file"], PAGE_W - 2 * MARGIN, 8.6, INK, leading=12)
    y -= 7
    pdf.text(MARGIN, y, "Trecho", 10, TEAL_DARK, True)
    code_lines = finding["snippet"].splitlines()
    block_h = 19 + len(code_lines) * 13
    pdf.rect(MARGIN, y - block_h - 7, PAGE_W - 2 * MARGIN, block_h, NAVY, None)
    cy = y - 26
    for line in code_lines:
        pdf.text(MARGIN + 13, cy, line, 8.1, (0.85, 0.94, 0.95))
        cy -= 13
    y -= block_h + 23
    sections = [
        ("Descrição", finding["description"]),
        ("Condição de explorabilidade", finding["exploit"]),
        ("Impacto", finding["impact"]),
        ("Correção recomendada", finding["fix"]),
    ]
    for title, body in sections:
        pdf.text(MARGIN, y, title, 10, TEAL_DARK, True)
        y = pdf.paragraph(MARGIN, y - 16, body, PAGE_W - 2 * MARGIN, 9, INK, leading=13) - 8
    pdf.text(MARGIN, 73, f"Severidade: {finding['severity'].lower()}  |  Categoria auditada: {finding['category']}", 8, finding["color"], True)


def draw_recommendations(pdf: Pdf) -> None:
    pdf.new_page()
    pdf.header_footer(8)
    y = pdf.section_title("Recomendações priorizadas", "Sequência sugerida para fechar os riscos antes de qualquer ambiente produtivo.")
    recs = [
        ("P1", HIGH, "Ativar a fronteira ggp_runtime", "Criar/provisionar a credencial runtime NOBYPASSRLS, apontar o runtime para ela ou executar SET LOCAL ROLE, e provar no CI que consultas fora do escopo retornam zero linhas."),
        ("P2", MEDIUM, "Eliminar fallback administrativo em produção", "Fazer o boot falhar quando ADMIN_DATABASE_URL não existir ou coincidir com DIRECT_URL/DATABASE_URL; separar credenciais de runtime, migração e administração."),
        ("P3", LOW, "Remover credencial fixa do workflow", "Substituir postgres:postgres por serviço efêmero/segredo de teste e adicionar detector de credenciais ao pipeline."),
        ("P4", STRONG, "Preservar os gates existentes", "Manter autorização no servidor, filtros de posse, validação Zod, consultas parametrizadas e testes de isolamento ao adicionar novas rotas."),
        ("P5", STRONG, "Adicionar regressões de segurança", "Testar cada nova rota com identidades SYSTEM_ADMIN, HR_ADMIN, MANAGER e EMPLOYEE; testar IDs de outra pessoa e exportação CSV com fórmulas."),
    ]
    for code, color, title, body in recs:
        pdf.chip(MARGIN, y - 3, code, color, 32)
        pdf.text(MARGIN + 45, y + 3, title, 11, NAVY, True)
        y = pdf.paragraph(MARGIN + 45, y - 14, body, PAGE_W - MARGIN - (MARGIN + 45), 9, MUTED, leading=13) - 18
    pdf.text(MARGIN, y - 4, "Riscos residuais", 13, TEAL_DARK, True)
    y -= 28
    residuals = [
        "A role ggp_runtime e as policies estão versionadas, mas a troca efetiva da conexão ainda é pendência explícita.",
        "Não há MFA/SSO definido no MVP; a autenticação Credentials segue o escopo atual.",
        "Não há frontend com sink HTML perigoso hoje; qualquer futura renderização de markdown/HTML deverá adotar sanitização comprovada.",
        "O PDF não substitui teste dinâmico com conta sem BYPASSRLS e revisão de configuração do ambiente alvo.",
    ]
    for item in residuals:
        pdf.circle(MARGIN + 4, y + 3, 2.2, MEDIUM, None)
        y = pdf.paragraph(MARGIN + 14, y, item, PAGE_W - 2 * MARGIN - 14, 9, INK, leading=13) - 4
    pdf.text(MARGIN, 96, "Critério de encerramento", 11, STRONG, True)
    pdf.paragraph(MARGIN, 78, "SEC-001 e SEC-002 devem estar fechados e revalidados com configuração de produção; SEC-003 deve ser removido do YAML. Depois, repetir a auditoria estática e os probes de isolamento.", PAGE_W - 2 * MARGIN, 9, MUTED, leading=13)


def issue_markdown(finding: dict) -> str:
    return "\n".join([
        f"Título: [Segurança] {finding['category']}",
        f"Labels sugeridas: security, {finding['severity'].lower()}",
        "",
        "## Descrição do problema",
        finding["description"],
        "",
        "## Por que é explorável",
        finding["exploit"],
        "",
        "## Evidência",
        f"- `{finding['file']}`",
        "```text",
        finding["snippet"],
        "```",
        "",
        "## Impacto",
        finding["impact"],
        "",
        "## Sugestão de correção",
        finding["fix"],
        "",
        "## Critérios de aceite",
        "- [ ] A correção está coberta por teste automatizado ou probe reproduzível.",
        "- [ ] A configuração insegura não é aceita silenciosamente em produção.",
        "- [ ] O fluxo autorizado continua funcionando para os papéis previstos.",
        "- [ ] Não há segredo, PII ou credencial real no diff.",
    ])


def draw_issues(pdf: Pdf) -> None:
    pdf.new_page()
    pdf.header_footer(9, "Issues para o GitHub")
    y = pdf.section_title("ISSUES PARA O GITHUB", "Blocos completos em Markdown, prontos para copiar e colar no repositório.")
    for index, finding in enumerate(FINDINGS, start=1):
        block = f"--- ISSUE {index} ---\n{issue_markdown(finding)}\n--- FIM ISSUE {index} ---"
        lines = block.splitlines()
        # Cada issue começa em uma página nova quando não houver espaço seguro.
        needed = 42 + len(lines) * 9.1
        if y - needed < 62:
            page_no = len(pdf.pages) + 1
            pdf.new_page()
            pdf.header_footer(page_no, "Issues para o GitHub")
            y = pdf.section_title("ISSUES PARA O GITHUB", "Continuação")
        block_h = 15 + len(lines) * 9.1
        pdf.rect(MARGIN, y - block_h, PAGE_W - 2 * MARGIN, block_h, (0.97, 0.98, 0.99), LINE, 0.6)
        cy = y - 15
        for line in lines:
            color = TEAL_DARK if line.startswith("---") else INK
            bold = line.startswith("Título:") or line.startswith("## ")
            pdf.text(MARGIN + 10, cy, line[:100], 7.1, color, bold)
            cy -= 9.1
        y -= block_h + 16


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    output = root / "docs" / "security-audit" / "relatorio-auditoria-seguranca.pdf"
    pdf = Pdf()
    draw_cover(pdf)
    draw_executive(pdf)
    draw_scope(pdf)
    draw_coverage(pdf)
    draw_finding(pdf, FINDINGS[0], 5)
    draw_finding(pdf, FINDINGS[1], 6)
    draw_finding(pdf, FINDINGS[2], 7)
    draw_recommendations(pdf)
    draw_issues(pdf)
    pdf.build(output)
    print(f"PDF gerado: {output}")
    print(f"Páginas: {len(pdf.pages)}")


if __name__ == "__main__":
    main()
