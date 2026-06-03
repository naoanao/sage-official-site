"""
pdf_generator.py — Sage AI PDF自動生成モジュール

2種類のPDFを生成する:
1. 商品PDF (product_pdf): デジタル商品の内容をPDF化 (Whop/Gumroad販売用)
2. SNSレポートPDF (sns_report_pdf): sns_evidence.jsonlを元に週次SNSレポートを生成

依存: reportlab
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger("PDFGenerator")

# ── Path constants ─────────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).parent.parent.parent
_PDF_OUTPUT_DIR = _BASE_DIR / "backend" / "data" / "pdfs"
_EVIDENCE_PATH = _BASE_DIR / "backend" / "data" / "sns_evidence.jsonl"
_FONT_DIR = Path(__file__).parent.parent / "assets" / "fonts"

# ── Color palette (Sage AI brand) ──────────────────────────────────────────────
COLOR_PRIMARY = (0.10, 0.10, 0.30)      # ダークネイビー
COLOR_ACCENT = (0.20, 0.55, 0.90)       # ブルー
COLOR_LIGHT_BG = (0.96, 0.97, 1.00)    # 薄いブルーグレー
COLOR_TEXT = (0.15, 0.15, 0.15)        # ほぼ黒
COLOR_MUTED = (0.50, 0.50, 0.60)       # グレー
COLOR_SUCCESS = (0.13, 0.70, 0.40)     # グリーン
COLOR_ERROR = (0.85, 0.25, 0.25)       # レッド


def _ensure_output_dir() -> Path:
    _PDF_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return _PDF_OUTPUT_DIR


# ══════════════════════════════════════════════════════════════════════════════
# 1. 商品PDF生成
# ══════════════════════════════════════════════════════════════════════════════

def generate_product_pdf(
    title: str,
    content_sections: list[dict],
    author: str = "Nao / Sage AI",
    product_url: str = "sage-official-site.pages.dev",
    output_filename: Optional[str] = None,
    price_str: str = "",
    tagline: str = "",
) -> Optional[str]:
    """
    デジタル商品のPDFを生成する。

    Args:
        title: 商品タイトル
        content_sections: [{"heading": str, "body": str}, ...] 形式のセクションリスト
        author: 著者名
        product_url: 商品URL
        output_filename: 出力ファイル名（省略時は自動生成）
        price_str: 価格表示文字列 (例: "$6.99")
        tagline: キャッチコピー

    Returns:
        生成されたPDFのパス文字列、失敗時はNone
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
            Table, TableStyle, PageBreak
        )
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError:
        logger.error("reportlab not installed. Run: pip install reportlab")
        return None

    _ensure_output_dir()

    if not output_filename:
        safe_title = "".join(c for c in title if c.isalnum() or c in " _-")[:40].strip().replace(" ", "_")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_filename = f"product_{safe_title}_{timestamp}.pdf"

    output_path = _PDF_OUTPUT_DIR / output_filename

    # ── フォント設定 ────────────────────────────────────────────────────────
    # 日本語対応: IPAexGothicがあれば使用、なければデフォルト（英語のみ）
    jp_font_name = "Helvetica"
    try:
        jp_font_candidates = [
            str(_FONT_DIR / "ipaexg.ttf"),
            "/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.otf",
            "/usr/share/fonts/truetype/ipafont-gothic/ipagp.ttf",
        ]
        for font_path in jp_font_candidates:
            if os.path.exists(font_path):
                pdfmetrics.registerFont(TTFont("IPAGothic", font_path))
                jp_font_name = "IPAGothic"
                logger.info(f"[PDF] Japanese font loaded: {font_path}")
                break
    except Exception:
        pass

    # ── ドキュメント設定 ────────────────────────────────────────────────────
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=25*mm, rightMargin=25*mm,
        topMargin=20*mm, bottomMargin=20*mm,
        title=title,
        author=author,
    )

    # ── スタイル定義 ────────────────────────────────────────────────────────
    r, g, b = COLOR_PRIMARY
    primary_color = colors.Color(r, g, b)
    r, g, b = COLOR_ACCENT
    accent_color = colors.Color(r, g, b)
    r, g, b = COLOR_MUTED
    muted_color = colors.Color(r, g, b)
    r, g, b = COLOR_TEXT
    text_color = colors.Color(r, g, b)

    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        "ProductTitle",
        parent=styles["Heading1"],
        fontName=jp_font_name,
        fontSize=24,
        textColor=primary_color,
        spaceAfter=4*mm,
        leading=30,
    )
    style_tagline = ParagraphStyle(
        "Tagline",
        parent=styles["Normal"],
        fontName=jp_font_name,
        fontSize=13,
        textColor=accent_color,
        spaceAfter=6*mm,
        leading=18,
    )
    style_meta = ParagraphStyle(
        "Meta",
        parent=styles["Normal"],
        fontName=jp_font_name,
        fontSize=9,
        textColor=muted_color,
        spaceAfter=3*mm,
    )
    style_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName=jp_font_name,
        fontSize=14,
        textColor=primary_color,
        spaceBefore=6*mm,
        spaceAfter=2*mm,
        borderPad=2,
    )
    style_body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName=jp_font_name,
        fontSize=10,
        textColor=text_color,
        leading=16,
        spaceAfter=3*mm,
    )
    style_footer = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName=jp_font_name,
        fontSize=8,
        textColor=muted_color,
        alignment=1,  # center
    )

    # ── コンテンツ構築 ──────────────────────────────────────────────────────
    story = []

    # ヘッダー帯（カラーテーブルで代用）
    header_data = [[title]]
    header_table = Table(header_data, colWidths=[160*mm])
    r, g, b = COLOR_PRIMARY
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.Color(r, g, b)),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), jp_font_name),
        ("FONTSIZE", (0, 0), (-1, -1), 22),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 5*mm))

    if tagline:
        story.append(Paragraph(tagline, style_tagline))

    meta_parts = []
    if price_str:
        meta_parts.append(f"💰 {price_str}")
    meta_parts.append(f"✍️ {author}")
    meta_parts.append(f"📅 {datetime.now().strftime('%Y-%m-%d')}")
    if product_url:
        meta_parts.append(f"🔗 {product_url}")
    story.append(Paragraph("  |  ".join(meta_parts), style_meta))

    story.append(HRFlowable(width="100%", thickness=1, color=accent_color, spaceAfter=5*mm))

    # セクション
    for section in content_sections:
        heading = section.get("heading", "")
        body = section.get("body", "")

        if heading:
            story.append(Paragraph(f"▌ {heading}", style_heading))
        if body:
            # 改行を<br/>に変換
            body_html = body.replace("\n", "<br/>")
            story.append(Paragraph(body_html, style_body))

        story.append(Spacer(1, 2*mm))

    # フッター
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=muted_color))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"Generated by Sage AI | {product_url} | © {datetime.now().year} {author}",
        style_footer
    ))

    # ── PDF生成 ─────────────────────────────────────────────────────────────
    doc.build(story)
    logger.info(f"[PDF] ✅ Product PDF generated: {output_path}")
    return str(output_path)


# ══════════════════════════════════════════════════════════════════════════════
# 2. SNSレポートPDF生成
# ══════════════════════════════════════════════════════════════════════════════

def generate_sns_report_pdf(
    days: int = 7,
    output_filename: Optional[str] = None,
) -> Optional[str]:
    """
    sns_evidence.jsonlを読み込み、週次SNSレポートPDFを生成する。

    Args:
        days: 集計対象の日数（デフォルト7日間）
        output_filename: 出力ファイル名（省略時は自動生成）

    Returns:
        生成されたPDFのパス文字列、失敗時はNone
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
            Table, TableStyle
        )
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError:
        logger.error("reportlab not installed.")
        return None

    _ensure_output_dir()

    # ── sns_evidence.jsonl を読み込む ───────────────────────────────────────
    records = []
    if _EVIDENCE_PATH.exists():
        try:
            with open(_EVIDENCE_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        records.append(json.loads(line))
        except Exception as e:
            logger.error(f"[PDF] Failed to read sns_evidence.jsonl: {e}")
            return None
    else:
        logger.warning("[PDF] sns_evidence.jsonl not found — creating empty report")

    # 期間フィルタ
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    filtered = []
    for r in records:
        try:
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
            if ts >= cutoff:
                filtered.append(r)
        except Exception:
            pass

    # 集計
    total = len(filtered)
    bs_posted = sum(1 for r in filtered if r.get("bs_posted"))
    ig_posted = sum(1 for r in filtered if r.get("ig_posted"))
    bs_failed = total - bs_posted
    ig_failed = total - ig_posted

    category_counts: dict[str, int] = {}
    for r in filtered:
        cat = r.get("category", "unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # ── 出力ファイル名 ──────────────────────────────────────────────────────
    if not output_filename:
        week_str = datetime.now().strftime("%Y_W%V")
        output_filename = f"sns_report_{week_str}.pdf"

    output_path = _PDF_OUTPUT_DIR / output_filename

    # ── フォント ────────────────────────────────────────────────────────────
    jp_font_name = "Helvetica"
    try:
        jp_font_candidates = [
            str(_FONT_DIR / "ipaexg.ttf"),
            "/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.otf",
            "/usr/share/fonts/truetype/ipafont-gothic/ipagp.ttf",
        ]
        for font_path in jp_font_candidates:
            if os.path.exists(font_path):
                pdfmetrics.registerFont(TTFont("IPAGothic", font_path))
                jp_font_name = "IPAGothic"
                break
    except Exception:
        pass

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=15*mm, bottomMargin=15*mm,
        title=f"Sage AI SNS Weekly Report",
        author="Sage AI",
    )

    # ── スタイル ────────────────────────────────────────────────────────────
    r_c, g_c, b_c = COLOR_PRIMARY
    primary_color = colors.Color(r_c, g_c, b_c)
    r_c, g_c, b_c = COLOR_ACCENT
    accent_color = colors.Color(r_c, g_c, b_c)
    r_c, g_c, b_c = COLOR_MUTED
    muted_color = colors.Color(r_c, g_c, b_c)
    r_c, g_c, b_c = COLOR_SUCCESS
    success_color = colors.Color(r_c, g_c, b_c)
    r_c, g_c, b_c = COLOR_ERROR
    error_color = colors.Color(r_c, g_c, b_c)
    r_c, g_c, b_c = COLOR_LIGHT_BG
    light_bg = colors.Color(r_c, g_c, b_c)

    styles = getSampleStyleSheet()

    style_title = ParagraphStyle("RTitle", parent=styles["Heading1"],
        fontName=jp_font_name, fontSize=22, textColor=primary_color,
        spaceAfter=2*mm)
    style_subtitle = ParagraphStyle("RSub", parent=styles["Normal"],
        fontName=jp_font_name, fontSize=11, textColor=muted_color,
        spaceAfter=4*mm)
    style_heading = ParagraphStyle("RHead", parent=styles["Heading2"],
        fontName=jp_font_name, fontSize=13, textColor=primary_color,
        spaceBefore=5*mm, spaceAfter=2*mm)
    style_body = ParagraphStyle("RBody", parent=styles["Normal"],
        fontName=jp_font_name, fontSize=9, leading=14, spaceAfter=2*mm)
    style_footer = ParagraphStyle("RFoot", parent=styles["Normal"],
        fontName=jp_font_name, fontSize=7, textColor=muted_color, alignment=1)

    story = []

    # タイトル帯
    period_label = f"Past {days} days | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M JST')}"
    header_data = [["📊 Sage AI — SNS Weekly Report"], [period_label]]
    header_tbl = Table(header_data, colWidths=[170*mm])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("BACKGROUND", (0, 1), (-1, 1), accent_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), jp_font_name),
        ("FONTSIZE", (0, 0), (0, 0), 18),
        ("FONTSIZE", (0, 1), (0, 1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, 0), (0, 0), 10),
        ("TOPPADDING", (0, 1), (0, 1), 4),
        ("BOTTOMPADDING", (0, 1), (0, 1), 4),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 6*mm))

    # ── サマリーカード ──────────────────────────────────────────────────────
    story.append(Paragraph("▌ 投稿サマリー", style_heading))

    summary_data = [
        ["指標", "Bluesky", "Instagram", "合計"],
        ["✅ 投稿成功", str(bs_posted), str(ig_posted), str(max(bs_posted, ig_posted))],
        ["❌ 投稿失敗", str(bs_failed), str(ig_failed), str(max(bs_failed, ig_failed))],
        ["📊 総投稿数", str(total), str(total), str(total)],
    ]
    summary_tbl = Table(summary_data, colWidths=[60*mm, 35*mm, 40*mm, 35*mm])
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), jp_font_name),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, muted_color),
        ("BACKGROUND", (0, 1), (-1, 1), light_bg),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [light_bg, colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_tbl)
    story.append(Spacer(1, 4*mm))

    # ── カテゴリ内訳 ─────────────────────────────────────────────────────────
    story.append(Paragraph("▌ カテゴリ別投稿数", style_heading))

    if category_counts:
        cat_data = [["カテゴリ", "投稿数", "割合"]]
        for cat, cnt in sorted(category_counts.items(), key=lambda x: -x[1]):
            pct = f"{cnt/total*100:.1f}%" if total > 0 else "0%"
            cat_data.append([cat, str(cnt), pct])
        cat_tbl = Table(cat_data, colWidths=[90*mm, 40*mm, 40*mm])
        cat_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), accent_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), jp_font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, muted_color),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [light_bg, colors.white]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(cat_tbl)
    else:
        story.append(Paragraph("（この期間の投稿データなし）", style_body))

    story.append(Spacer(1, 4*mm))

    # ── 直近投稿ログ（最大10件）────────────────────────────────────────────
    story.append(Paragraph("▌ 直近投稿ログ（最新10件）", style_heading))

    recent = sorted(filtered, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]
    if recent:
        log_data = [["日時 (UTC)", "カテゴリ", "Bluesky", "Instagram", "テキスト（抜粋）"]]
        for rec in recent:
            ts_raw = rec.get("timestamp", "")[:16].replace("T", " ")
            cat = rec.get("category", "-")[:15]
            bs_ok = "✅" if rec.get("bs_posted") else "❌"
            ig_ok = "✅" if rec.get("ig_posted") else "❌"
            snippet = rec.get("bs_text", "")[:40].replace("\n", " ")
            log_data.append([ts_raw, cat, bs_ok, ig_ok, snippet])

        log_tbl = Table(log_data, colWidths=[28*mm, 22*mm, 16*mm, 20*mm, 84*mm])
        log_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), jp_font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("ALIGN", (2, 0), (3, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.3, muted_color),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [light_bg, colors.white]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("WORDWRAP", (4, 1), (4, -1), True),
        ]))
        story.append(log_tbl)
    else:
        story.append(Paragraph("（この期間の投稿ログなし）", style_body))

    # フッター
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=muted_color))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f"Sage AI SNS Report | Auto-generated | {datetime.now().strftime('%Y-%m-%d')}",
        style_footer
    ))

    doc.build(story)
    logger.info(f"[PDF] ✅ SNS Report PDF generated: {output_path}")
    return str(output_path)


# ══════════════════════════════════════════════════════════════════════════════
# Flask API / 外部呼び出し用ラッパー
# ══════════════════════════════════════════════════════════════════════════════

def generate_product_pdf_from_job(job: dict) -> Optional[str]:
    """
    jobs_store のジョブ dict から商品PDFを生成するショートカット。
    job keys: topic, ig_caption, bs_text, image_path など
    """
    title = job.get("topic", "Sage AI Product")
    sections = [
        {"heading": "商品概要", "body": job.get("ig_caption", "")},
        {"heading": "詳細", "body": job.get("content", "")},
    ]
    if job.get("bs_text"):
        sections.append({"heading": "SNSキャッチコピー", "body": job["bs_text"]})

    return generate_product_pdf(
        title=title,
        content_sections=sections,
        tagline=job.get("tagline", ""),
        price_str=job.get("price", ""),
    )


# ── CLI テスト実行 ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # 商品PDF テスト
    print("=== Generating Product PDF ===")
    path = generate_product_pdf(
        title="プロンプトエンジニアリング完全チートシート",
        tagline="AIと上手に話す36のテクニック — 今日からすぐ使える実践集",
        price_str="$6.99",
        content_sections=[
            {
                "heading": "はじめに",
                "body": "このチートシートはAIプロンプトを最大限に活用するための実践的なガイドです。\n"
                        "初心者から上級者まで使える36のテクニックを厳選しました。",
            },
            {
                "heading": "Chapter 1: 基本テクニック",
                "body": "1. 役割指定プロンプト（Role Prompting）\n"
                        "2. ステップバイステップ思考（Chain of Thought）\n"
                        "3. 例示プロンプト（Few-Shot Prompting）",
            },
            {
                "heading": "Chapter 2: 応用テクニック",
                "body": "4. 自己検証プロンプト（Self-Consistency）\n"
                        "5. ツリーオブソーツ（Tree of Thoughts）\n"
                        "6. 反事実プロンプト（Counterfactual Prompting）",
            },
        ],
        product_url="sage-official-site.pages.dev",
    )
    print(f"Product PDF: {path}")

    # SNSレポートPDF テスト
    print("\n=== Generating SNS Report PDF ===")
    report_path = generate_sns_report_pdf(days=7)
    print(f"SNS Report PDF: {report_path}")
