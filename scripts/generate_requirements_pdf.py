from __future__ import annotations

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import registerFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, PageBreak


SOURCE_PATH = Path("docs/jasmine-requirements-analysis.md")
OUTPUT_PATH = Path("output/pdf/jasmine-requirements-analysis.pdf")


def register_fonts() -> None:
    font_path = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
    if not font_path.exists():
        raise FileNotFoundError(f"Missing required font: {font_path}")
    registerFont(TTFont("ArialUnicode", str(font_path)))


def build_styles():
    styles = getSampleStyleSheet()
    base_font = "ArialUnicode"

    return {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=styles["Title"],
            fontName=base_font,
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#0f2740"),
            alignment=TA_CENTER,
            spaceAfter=8 * mm,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=styles["Normal"],
            fontName=base_font,
            fontSize=12,
            leading=18,
            textColor=colors.HexColor("#4d6278"),
            alignment=TA_CENTER,
            spaceAfter=4 * mm,
        ),
        "heading1": ParagraphStyle(
            "Heading1CN",
            parent=styles["Heading1"],
            fontName=base_font,
            fontSize=16,
            leading=22,
            textColor=colors.HexColor("#123b63"),
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
        ),
        "heading2": ParagraphStyle(
            "Heading2CN",
            parent=styles["Heading2"],
            fontName=base_font,
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#1d4f7b"),
            spaceBefore=4 * mm,
            spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "BodyCN",
            parent=styles["BodyText"],
            fontName=base_font,
            fontSize=10.5,
            leading=18,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1e2d3a"),
            firstLineIndent=2 * 10.5,
            spaceAfter=2 * mm,
        ),
        "meta": ParagraphStyle(
            "MetaCN",
            parent=styles["BodyText"],
            fontName=base_font,
            fontSize=10.5,
            leading=16,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#34495e"),
            leftIndent=4 * mm,
            bulletIndent=0,
            spaceAfter=1.5 * mm,
        ),
        "bullet": ParagraphStyle(
            "BulletCN",
            parent=styles["BodyText"],
            fontName=base_font,
            fontSize=10.5,
            leading=16,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#243746"),
            leftIndent=8 * mm,
            firstLineIndent=0,
            bulletIndent=0,
            spaceAfter=1.5 * mm,
        ),
        "footer": ParagraphStyle(
            "FooterCN",
            parent=styles["Normal"],
            fontName=base_font,
            fontSize=8.5,
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#667788"),
        ),
    }


def escape_text(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def markdown_to_story(styles):
    lines = SOURCE_PATH.read_text(encoding="utf-8").splitlines()
    story = []
    title = "Jasmine 项目需求分析"
    info_lines: list[str] = []
    in_info = False
    body_started = False

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if body_started:
                story.append(Spacer(1, 2 * mm))
            continue

        if raw_line.startswith("# "):
            title = line[2:].strip()
            continue

        if line == "## 文档信息":
            in_info = True
            continue

        if in_info and line.startswith("- "):
            info_lines.append(line[2:].strip())
            continue

        if in_info and not line.startswith("- "):
            story.extend(build_cover(title, info_lines, styles))
            in_info = False
            body_started = True

        if raw_line.startswith("## "):
            story.append(Paragraph(escape_text(line[3:].strip()), styles["heading1"]))
            body_started = True
        elif raw_line.startswith("### "):
            story.append(Paragraph(escape_text(line[4:].strip()), styles["heading2"]))
            body_started = True
        elif line.startswith("- "):
            content = escape_text(line[2:].strip())
            story.append(Paragraph(content, styles["meta"] if not body_started else styles["bullet"], bulletText="•"))
        else:
            content = convert_inline_formatting(escape_text(line))
            story.append(Paragraph(content, styles["body"]))
            body_started = True

    if in_info:
        story.extend(build_cover(title, info_lines, styles))

    return story


def build_cover(title: str, info_lines: list[str], styles):
    story = [
        Spacer(1, 45 * mm),
        Paragraph(escape_text(title), styles["cover_title"]),
        Paragraph("毕业设计风格正式文档", styles["cover_subtitle"]),
        Spacer(1, 10 * mm),
    ]

    for item in info_lines:
        story.append(Paragraph(escape_text(item), styles["cover_subtitle"]))

    story.extend([
        Spacer(1, 16 * mm),
        Paragraph("内容方向：论文结构与汇报可读性结合", styles["cover_subtitle"]),
        Spacer(1, 40 * mm),
        PageBreak(),
    ])
    return story


def convert_inline_formatting(text: str) -> str:
    return re.sub(r"`([^`]+)`", r"<font color='#0f4c81'>\1</font>", text)


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d7e0ea"))
    canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
    canvas.setFont("ArialUnicode", 8.5)
    canvas.setFillColor(colors.HexColor("#667788"))
    canvas.drawCentredString(A4[0] / 2, 9 * mm, f"Jasmine 项目需求分析  |  第 {doc.page} 页")
    canvas.restoreState()


def main():
    register_fonts()
    styles = build_styles()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="Jasmine 项目需求分析",
        author="OpenAI Codex",
    )

    story = markdown_to_story(styles)
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(str(OUTPUT_PATH))


if __name__ == "__main__":
    sys.exit(main())
