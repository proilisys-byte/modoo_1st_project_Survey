#!/usr/bin/env python3
"""survey_question_list.txt → survey_question_list.pdf (한 줄·촘촘)"""
from __future__ import annotations

import sys
from pathlib import Path

from fpdf import FPDF

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\malgun.ttf"),
    Path(r"C:\Windows\Fonts\malgunsl.ttf"),
    Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
]


def find_font() -> Path:
    for path in FONT_CANDIDATES:
        if path.exists():
            return path
    raise FileNotFoundError("한글 폰트를 찾을 수 없습니다.")


def txt_to_pdf(txt_path: Path, pdf_path: Path) -> None:
    text = txt_path.read_text(encoding="utf-8")
    font_path = find_font()

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=10)
    pdf.set_margins(left=12, top=10, right=12)
    pdf.add_page()
    pdf.add_font("Body", "", str(font_path))
    pdf.set_font("Body", size=8)

    line_height = 3.8
    page_width = pdf.w - pdf.l_margin - pdf.r_margin

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        pdf.multi_cell(page_width, line_height, line, new_x="LMARGIN", new_y="NEXT")

    pdf.output(str(pdf_path))


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    txt_path = root / "docs" / "survey_question_list.txt"
    pdf_path = root / "docs" / "survey_question_list.pdf"

    if not txt_path.exists():
        print(f"FAIL: {txt_path} 없음", file=sys.stderr)
        return 1

    txt_to_pdf(txt_path, pdf_path)
    print(f"OK: wrote {pdf_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
