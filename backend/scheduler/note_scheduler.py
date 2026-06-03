"""
SageNoteScheduler v2 (2026-05-26)
note.com draft generation scheduler.

Flow:
1. Daily JST 10:00 trigger
2. Generate draft via Groq (Japanese, half-nonfiction)
3. Save to note.com as 'draft' (NOT published)
4. Send LINE Notify preview
5. Save locally to note_drafts.json
6. Nao manually reviews and publishes on note.com

Content strategy:
- 60% marketing learning output (Notion lecture topics x past work)
- 40% Growl story (future / past / present angles)
- Style: declarative past-tense, honest numbers, scene-first
- Privacy: all company/brand names anonymized

Voice reference (from actual published article n6c8621f787a2):
- Opens with a scene, not an explanation
- Short declarative sentences ending in "だった。" "だけだ。"
- Bold (**) for key numbers and turning-point phrases
- Dialogue quoted from memory, no quotation marks
- Framework/concept name appears AFTER the story, not before
- Ends with a quiet insight, not a loud CTA
"""

import os
import json
import logging
import random
import requests
import threading
import time
from datetime import datetime, date, timezone, timedelta
from groq import Groq

logger = logging.getLogger(__name__)

JST = timezone(timedelta(hours=9))
PROJECT_START_DATE = date(2025, 6, 1)

NOTE_API_BASE = "https://note.com/api"
NOTE_CLIENT_CODE = os.getenv("NOTE_CLIENT_CODE", "")
NOTE_USER_URLNAME = os.getenv("NOTE_USER_URLNAME", "mute_mint5020")
GUMROAD_URL = os.getenv("GUMROAD_PRODUCT_URL", "https://naofumi3.gumroad.com/l/apvbzh")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LINE_NOTIFY_TOKEN = os.getenv("LINE_NOTIFY_TOKEN", "")

POST_HOUR_JST = 10


# -----------------------------------------------------------------------
# Theme lists
# -----------------------------------------------------------------------

MARKETING_THEMES = [
    # Phase 1: カラオケ館 町田店（2002）
    {
        "category": "marketing",
        "concept": "AIDA",
        "hook": "カラオケ店のキャッチで覚えた、人が足を止める瞬間の法則",
        "lecture_ref": "Attention→Interest→Desire→Actionの購買行動モデル。路上キャッチは究極のAIDA実践だった",
        "career_phase": "カラオケ館 町田店",
    },
    {
        "category": "marketing",
        "concept": "funnel_basics",
        "hook": "平日10組、休日15組。キャッチの数字を振り返ったら、ファネルそのものだった",
        "lecture_ref": "認知→興味→検討→行動のファネル構造。声をかけた人数と入店率の関係",
        "career_phase": "カラオケ館 町田店",
    },
    {
        "category": "marketing",
        "concept": "psychology_persuasion",
        "hook": "「今なら空いてますよ」が効く理由を、あとから心理学で知った話",
        "lecture_ref": "希少性・社会的証明・アンカリングなど購買心理の基本。講座4/22「心理学」より",
        "career_phase": "カラオケ館 町田店",
    },
    # Phase 2: SPANKY (2002-2006)
    {
        "category": "marketing",
        "concept": "STP",
        "hook": "25席のバーに80人集めたイベント。誰に届けるか決めたら、全部変わった",
        "lecture_ref": "セグメンテーション・ターゲティング・ポジショニング。講座4/28「マーケティング概論」より",
        "career_phase": "SPANKY",
    },
    {
        "category": "marketing",
        "concept": "4P_event",
        "hook": "クラブイベントを企画して気づいた、4Pは現場で自然にやっていたこと",
        "lecture_ref": "Product（体験）・Price（チャージ）・Place（会場）・Promotion（告知）を無意識に設計していた",
        "career_phase": "SPANKY",
    },
    {
        "category": "marketing",
        "concept": "community_marketing",
        "hook": "常連客がイベントを手伝ってくれた。コミュニティマーケティングの原点だった",
        "lecture_ref": "既存ファンを軸に売上と顧客層を広げる手法。講座5/6「コミュニティマーケティング」より",
        "career_phase": "SPANKY",
    },
    # Phase 3: Uncle Sam (2008-2011)
    {
        "category": "marketing",
        "concept": "3C",
        "hook": "バーガーショップで売上が落ちたとき、競合・顧客・自社を初めて並べてみた",
        "lecture_ref": "Customer・Competitor・Companyの3軸で市場を整理。講座5/13-15「3C分析」より",
        "career_phase": "Uncle Sam",
    },
    {
        "category": "marketing",
        "concept": "SWOT",
        "hook": "ファストフードにバーの接客を持ち込んだら、強みと弱みが逆転した話",
        "lecture_ref": "強み・弱み・機会・脅威を整理する状況分析フレームワーク",
        "career_phase": "Uncle Sam",
    },
    {
        "category": "marketing",
        "concept": "7Ps_service",
        "hook": "ハンバーガー屋なのに「人」で差がついた。7Psを後から知って腑に落ちた",
        "lecture_ref": "People（スタッフの接客力）・Process（提供の流れ）・Physical Evidence（店の雰囲気）まで含めた設計",
        "career_phase": "Uncle Sam",
    },
    {
        "category": "marketing",
        "concept": "cohort_rfm",
        "hook": "リピーターが増えた理由を数字で追ったら、接客スタイルの差だった",
        "lecture_ref": "コホート分析・RFM分析で継続やLTVを数字で追う手法",
        "career_phase": "Uncle Sam",
    },
    # Phase 4: SHOTBAR Aspara (2012-2015)
    {
        "category": "marketing",
        "concept": "PEST",
        "hook": "地元食材のハンバーガーを作ったとき、無意識にPEST分析をしていた",
        "lecture_ref": "Politics（地方創生政策）・Economy（地元食材コスト）・Society（食の安全志向）・Technology（SNS拡散）の外部環境分析",
        "career_phase": "SHOTBAR Aspara",
    },
    {
        "category": "marketing",
        "concept": "usp",
        "hook": "「地元食材だけで作ったバーガー」。USPを決めたら、メディアが来た",
        "lecture_ref": "自社の強み×競合の弱み×顧客ニーズが交わる「真の提供価値」。講座5/16-17「4P分析」より",
        "career_phase": "SHOTBAR Aspara",
    },
    {
        "category": "marketing",
        "concept": "4P_local",
        "hook": "ご当地バーガーグランプリに出た。Product以外の3Pが全部足りなかった話",
        "lecture_ref": "Product（地産地消バーガー）・Price（原価率）・Place（フェス出店）・Promotion（地域メディア等）の設計",
        "career_phase": "SHOTBAR Aspara",
    },
    {
        "category": "marketing",
        "concept": "branding",
        "hook": "間借り営業から始めて、ブランドって何かを体で覚えた話",
        "lecture_ref": "一貫したイメージと価値の積み重ねで信頼を作る考え方。講座5/7「ブランド戦略」より",
        "career_phase": "SHOTBAR Aspara",
    },
    {
        "category": "marketing",
        "concept": "customer_voice",
        "hook": "海の家でアンケートを取った。お客さんの声で商品が変わった体験",
        "lecture_ref": "購買動機・離脱理由の把握。現場のアンケートとレビュー分析。講座5/13-15「3C分析」より",
        "career_phase": "SHOTBAR Aspara",
    },
    # Phase 5: Will (2022-2023)
    {
        "category": "marketing",
        "concept": "STP_senior",
        "hook": "40代〜90代にスマホを教えた。ターゲットの解像度が全然足りなかった話",
        "lecture_ref": "シニア世代のセグメンテーションは年齢だけでは不十分。経験値・理解度で再分割する必要がある",
        "career_phase": "株式会社Will",
    },
    {
        "category": "marketing",
        "concept": "4C",
        "hook": "シニアのオンラインサポートで学んだ、売り手目線を捨てる瞬間",
        "lecture_ref": "Customer Value（顧客価値）・Cost（顧客コスト）・Convenience（利便性）・Communication（対話）。4Pの顧客視点版",
        "career_phase": "株式会社Will",
    },
    {
        "category": "marketing",
        "concept": "design_thinking",
        "hook": "90代の受講者に寄り添ったら、デザイン思考の「共感」が分かった",
        "lecture_ref": "共感→定義→発想→試作→テストのプロセス。講座5/8「デザイン思考」より",
        "career_phase": "株式会社Will",
    },
    {
        "category": "marketing",
        "concept": "persona",
        "hook": "ペルソナを作ったら、シニアの「困りごと」が全然違って見えた",
        "lecture_ref": "架空の具体的人物像でターゲットを可視化するフレームワーク。講座5/21「ペルソナ分析」より",
        "career_phase": "株式会社Will",
    },
    # Phase 6: Kanagawa TABLE (2014-)
    {
        "category": "marketing",
        "concept": "3C_brand",
        "hook": "海外飲料ブランドの日本代理店をやって、3C分析を本気でやり直した話",
        "lecture_ref": "海外飲料の日本展開。顧客（日本の男女）・競合（大手エナジードリンク等）・自社（代理店としての強み）を整理",
        "career_phase": "神奈川TABLE",
    },
    {
        "category": "marketing",
        "concept": "STP_event",
        "hook": "エナジードリンクのイベントで、ターゲットを男女両方にした理由",
        "lecture_ref": "セグメンテーション・ターゲティング・ポジショニング。イベント出店から流通までを実現した戦略設計",
        "career_phase": "神奈川TABLE",
    },
    {
        "category": "marketing",
        "concept": "4P_digital",
        "hook": "LP・公式LINE・Facebook広告。デジタルの4Pを初めて全部自分で回した話",
        "lecture_ref": "Product（イベント体験）・Price（チケット設計）・Place（LINE→LP→会場）・Promotion（FB広告→当日ローンチ）",
        "career_phase": "神奈川TABLE",
    },
    {
        "category": "marketing",
        "concept": "7Ps_event",
        "hook": "食フェスの出店で、商品以外の「体験設計」が売上を左右した話",
        "lecture_ref": "People（スタッフ配置）・Process（オペレーション）・Physical Evidence（ブース装飾）。フェスでの実践",
        "career_phase": "神奈川TABLE",
    },
    {
        "category": "marketing",
        "concept": "customer_journey",
        "hook": "イベント当日までの導線を可視化したら、LINEの使い方が変わった",
        "lecture_ref": "認知→興味→検討→購入の4フェーズとタッチポイント設計。講座5/21「カスタマージャーニー」より",
        "career_phase": "神奈川TABLE",
    },
    {
        "category": "marketing",
        "concept": "AEO",
        "hook": "AI検索に自分の記事が引用される仕組み。AEOを初めて意識した話",
        "lecture_ref": "Answer Engine Optimization。AI検索で拾われる構造化コンテンツの設計",
        "career_phase": "神奈川TABLE",
    },
    # Cross-phase themes
    {
        "category": "marketing",
        "concept": "email_open",
        "hook": "メールを開封してもらうって、こんなに難しいのかと思い知らされた話",
        "lecture_ref": "件名・差出人・送信タイミングで開封率が変わる。講座4/22「メールの開封させる」より",
        "career_phase": "横断",
    },
    {
        "category": "marketing",
        "concept": "marketing_value",
        "hook": "マーケティングの価値って何か、飲食店経営で迷子になっていたときの話",
        "lecture_ref": "売れる仕組みを作り、買い続けてもらう仕組みを作ること。講座4/24「マーケティングの価値」より",
        "career_phase": "横断",
    },
    {
        "category": "marketing",
        "concept": "effect_verification",
        "hook": "施策を打ったあとに何を見ればいいのか、ずっと分からなかった",
        "lecture_ref": "KPI・効果測定・PDCAの回し方。講座4/24「効果検証の考え方」より",
        "career_phase": "横断",
    },
    {
        "category": "marketing",
        "concept": "benefit_copywriting",
        "hook": "機能じゃなくベネフィットで書くと何が変わるか、試してみた",
        "lecture_ref": "顧客が得る価値・変化を伝える言葉の作り方",
        "career_phase": "横断",
    },
    {
        "category": "marketing",
        "concept": "sns_strategy",
        "hook": "SNSで発信しているとマーケティングしているは全然違うと気づいた話",
        "lecture_ref": "目標・ターゲット・投稿設計・分析を一貫させるSNS運用の考え方",
        "career_phase": "横断",
    },
    {
        "category": "marketing",
        "concept": "data_decision",
        "hook": "感覚じゃなくて数字で判断する習慣を、Growlを作って初めて身につけた",
        "lecture_ref": "KPI設計・データ分析・仮説検証のサイクル",
        "career_phase": "横断",
    },
    {
        "category": "marketing",
        "concept": "value_proposition",
        "hook": "バリュープロポジションを考えたら、Growlを作り直したくなった話",
        "lecture_ref": "自社の強み・競合の弱み・顧客ニーズが交わる「真の提供価値」。講座5/21「バリュープロポジション」より",
        "career_phase": "横断",
    },
]

GROWL_THEMES = [
    {
        "category": "growl",
        "angle": "future",
        "hook": "なぜGrowlを作っているのか。5年後に何がしたいかから逆算した話",
        "context": "中小企業がマーケをもっと簡単に使えるようにしたい。その出発点",
    },
    {
        "category": "growl",
        "angle": "past",
        "hook": "Growlを作る前の自分。マーケをまったく知らなかった話",
        "context": "バーガーは作れた。でもどうやって集客するかが分からなかった",
    },
    {
        "category": "growl",
        "angle": "present",
        "hook": "今のGrowlは何ができて、何ができないか。正直に書く",
        "context": "3C分析・STP・競合調査を自動化中。まだ荒削りだけど動いている",
    },
    {
        "category": "growl",
        "angle": "future",
        "hook": "Growlが完成したら、中小企業のマーケはどう変わるか仮説を書く",
        "context": "経営者が自分でマーケを回せるようになる。Growlはその道具",
    },
    {
        "category": "growl",
        "angle": "past",
        "hook": "エンジニアじゃない自分が、AIを使ってツールを作ったらどうなったか",
        "context": "毎日3時間。失敗を繰り返しながら、少しずつ動くようになった",
    },
    {
        "category": "growl",
        "angle": "present",
        "hook": "Sage AIにGrowlのマーケを全部任せた。2ヶ月後の正直な数字",
        "context": "フォロワーも売上も小さい。でも続けている。その記録",
    },
]

# 60:40 ratio — marketing x3, growl x2
ALL_THEMES = (MARKETING_THEMES * 3) + (GROWL_THEMES * 2)


def get_project_day() -> int:
    return (date.today() - PROJECT_START_DATE).days + 1


def _pick_theme(day: int) -> dict:
    """Pick theme by day seed (reproducible)."""
    rng = random.Random(day)
    return rng.choice(ALL_THEMES)


# -----------------------------------------------------------------------
# Content generation
# -----------------------------------------------------------------------

def generate_note_draft(project_day: int) -> dict:
    """Generate a note.com draft article via Groq (Japanese, half-nonfiction)."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")

    client = Groq(api_key=GROQ_API_KEY)
    theme = _pick_theme(project_day)
    category = theme["category"]
    hook = theme["hook"]

    CAREER_DETAILS = {
        "カラオケ館 町田店": "2002年。18歳。町田のカラオケ店の路上キャッチ（客引き）。18〜24時勤務で、平日10組、休日10〜15組を必死に捌いていた。声をかけても7割は無視される中で、接客と集客の原体験を積んだ。",
        "SPANKY": "2002〜2006年。クラブ・バーの店長・イベント主催。25席の小箱に80人を集めるなど、クローズドな空間でのコミュニティ作りと集客を泥臭く実践。常連客に助けられながらイベントを回していた。",
        "Uncle Sam": "2008〜2011年。バーガーショップの運営。従業員が7名から4名に減る過酷な状況下で、ファストフードにバーの「人と深く繋がる接客」を持ち込みリピーターを獲得。商品開発や人材教育も担当。",
        "SHOTBAR Aspara": "2012〜2015年。間借り営業からスタート。地元食材を使った地産地消の「ご当地バーガー」を開発。海の家でのアンケート調査、ご当地グランプリ出店、地域メディア露出（FM、タウンニュース等）を経験。",
        "株式会社Will": "2022〜2023年。シニア（40代〜90代）向けのオンライン支援・スマホ講座運営。ITリテラシーの異なる層に対し、徹底的に顧客視点（共感）に立ったサポートを実施し、売り手目線を捨てる重要性を学んだ。",
        "神奈川TABLE": "2014年〜現在。数名のチームで商品企画、LP・公式LINE・Facebook広告の作成から当日ローンチまで一気通貫で担当。海外エナジードリンクブランドの販促や、食フェスなどのイベント運営を実施。",
        "横断": "カラオケキャッチからバーガー店経営、イベント企画、シニア向けIT支援まで、リアルとデジタルを横断した多様な実務経験を持つ。",
    }

    rng = random.Random(project_day)  # 再現性のため日をシードにする

    career_phase = theme.get("career_phase", "")
    career_context = ""
    if career_phase and career_phase in CAREER_DETAILS:
        career_context = f"- この記事の舞台となる実体験：{CAREER_DETAILS[career_phase]}\n"

    if category == "marketing":
        concept = theme.get("concept", "")
        lecture_ref = theme.get("lecture_ref", "")

        # 構成パターン（マーケティング向け）— 実際の記事スタイルに基づく
        marketing_styles = [
            # パターンA: 場面→失敗→転換点→フレームワーク後出し（n6c8621f787a2の構成）
            "【構成A：場面先行×フレームワーク後出し】\n"
            "1. 具体的な場面を1〜2文で書く（時代背景・場所・行動を即出し。「〜していた。」で始める）\n"
            "2. 現実の壁（「けれど現実は甘くない。〜だった」）。数字で補強。\n"
            "3. 転換点となった出来事。記憶の中の会話や一言を引用する。\n"
            "4. そこから学んだこと（「そこで初めて〜と分かった」）\n"
            "5. フレームワーク登場（「後になって〇〇という考え方に出会って、やっていたことの意味が見えた」）\n"
            "6. フレームワークの各要素を箇条書きで短く（- **Attention**で〜\n- **Interest**で〜 など）\n"
            "7. 現在への応用（「今の仕事でも、この感覚はそのまま生きている」）",

            # パターンB: 結論先行×現場補強
            "【構成B：結論先行×現場補強】\n"
            "1. 冒頭で結論を言い切る（「〜を〜した。正直、〜だった」）\n"
            "2. 当時の現場の状況を絵が浮かぶように描写。数字を**太字**で強調。\n"
            "3. 失敗か勘違いを正直に書く（「最初は〜と思っていた。でも実際は逆だった」）\n"
            "4. フレームワーク名を自然に登場させて、現場の体験と接続する\n"
            "5. 読者が今日試せる一歩（「まず〜から始めてみる」）",

            # パターンC: 時系列ビフォーアフター
            "【構成C：ビフォーアフター×気づき】\n"
            "1. 「以前の自分」の状態を正直に書く（「全然分かっていなかった」「感覚でやっていた」）\n"
            "2. きっかけとなった出来事・数字の変化（具体的な場面を短く描写）\n"
            "3. 気づき・転換点（感情ごと書く。「スッキリした」「悔しかった」など）\n"
            "4. フレームワーク名を後から紹介（「これが〇〇という考え方だったと後で知った」）\n"
            "5. 今の自分から読者へ（静かな問いかけで締める）",
        ]
        chosen_style = rng.choice(marketing_styles)

        body_instruction = (
            f"今日のテーマ（背景知識のみ。直接説明しない）：{concept} — {lecture_ref}\n\n"
            "【絶対に守るルール】\n"
            f"❌ NG：冒頭で「{concept}とは〜のことで」と定義から入る\n"
            "❌ NG：教科書・ハウツー・解説記事にする\n"
            "❌ NG：「〜だと思うんですよね」「〜かもしれませんね」などの曖昧な語尾\n"
            "❌ NG：フレームワーク名を記事冒頭・タイトル直後に出す\n"
            "✅ OK：具体的な場面から入る。「〜していた。」で始める\n"
            "✅ OK：失敗・恥・小さな数字を先に正直に書く\n"
            "✅ OK：記憶の中の会話や一言を引用する（鍵括弧で）\n"
            "✅ OK：重要な数字・フレーズを**太字**にする\n"
            "✅ OK：フレームワーク名は物語の中盤〜後半で初めて登場させる\n\n"
            "【本文の流れ】\n"
            f"{chosen_style}\n\n"
            "【文末の締め（CTA）】\n"
            "最後の1〜2文のみ。Gumroadへの誘導は任意。なくてもよい。\n"
            "入れる場合は「存在を知らせる程度」で。「ぜひ！」などの押し売りは絶対NG。\n"
            f"例：GrowlとSage AIのブループリントをGumroadで公開中。$49。→ {GUMROAD_URL}\n\n"
            "【ハッシュタグ（本文末に必須）】\n"
            "#マーケティング #中小企業 #個人事業主 #AI活用"
        )
    else:
        angle = theme.get("angle", "present")
        context = theme.get("context", "")
        angle_label = {"future": "未来視点", "past": "過去視点", "present": "現在進行形"}.get(angle, angle)

        # 構成パターン（Growlストーリー向け）
        story_styles = [
            # パターンA: 日常の一幕×普遍的気づき
            "【構成A：日常の一幕×静かな気づき】\n"
            "1. 具体的な作業中の一幕から静かに入る（「深夜に数字を眺めていた」「エラーを直していたとき」）\n"
            "2. 感情の揺れをそのまま書く（焦り、小さな喜び、恥、あきらめそうになった瞬間）\n"
            "3. 普遍的な気づきへの広がり（「これって、一人で何かを作ることそのものだと思う」）\n"
            "4. 静かな余韻（結論を押し付けず、息を吐くように終わる。読者に委ねる）",

            # パターンB: 正直な進捗報告
            "【構成B：正直な進捗報告×共感】\n"
            "1. 今のGrowlの状況を数字で正直に書く（フォロワー数、試用者数、収益など。**太字**で強調。盛らない）\n"
            "2. 上手くいっていないことを素直に認める（「思ってたより全然ダメだった」「想定の半分も進んでない」）\n"
            "3. それでも続けている理由（打算抜きで、感情ベースで書く）\n"
            "4. 読者への静かなエール（「同じように続けている人がいたら」）",

            # パターンC: 作った理由×現在地
            "【構成C：作った理由×現在地】\n"
            "1. Growlを作り始めたきっかけとなる原体験を一つ取り出す（バーガー屋での具体的な出来事を短く描写）\n"
            "2. 当時の課題と感情（お金も知識もなかった。だから動いた。その生々しさを書く）\n"
            "3. 今のGrowlと当時の自分がつながる瞬間（できてきたこと、まだ全然足りないこと）\n"
            "4. 静かな共鳴（「同じ悩みを抱えている人がいたら、この記録が何かの参考になれば」）",
        ]
        chosen_style = rng.choice(story_styles)

        body_instruction = (
            "カテゴリ：Growlストーリー\n"
            f"視点：{angle_label}\n"
            f"コンテキスト：{context}\n\n"
            "【本文の構成】\n"
            f"{chosen_style}\n\n"
            "【必須事項】\n"
            "- 実体験と正直な数字（フォロワー数・売上等）をどこかに**太字**で含める\n"
            "- 「〜だった。」「〜だけだ。」の断言で締める段落を意識する\n\n"
            "【ハッシュタグ（本文末に必須）】\n"
            "#Growl #AI活用 #個人事業主 #中小企業"
        )

    # ── メインプロンプト ──────────────────────────────────────────────
    prompt = (
        "あなたはnote.comのライター「なお」として記事を書く。\n\n"
        "【キャラクター設定】\n"
        "- 20代から泥臭く現場を渡り歩いてきた実務家。カラオケキャッチ、バーガー店経営、クラブイベント企画、シニア向けITサポート、イベントプロデュース。\n"
        "- 華やかなインフルエンサーになりたいわけではなく、スモールビジネスのリアルな痛みがわかる裏方気質。\n"
        f"{career_context}"
        "- 現在は中小企業向けマーケティングツール「Growl」をAIで自作中（非エンジニア）\n"
        "- AI自動収益化システム「Sage AI」も構築中\n"
        f"- 現在 Day {project_day}（2025年6月1日スタート）\n"
        "- 毎日3時間しか作業できない制約がある\n\n"
        "【プライバシールール（厳守）】\n"
        "- 実在する企業名・ブランド名・店名は使わない\n"
        "- 「某有名飲料メーカー」「地産地消バーガー店」「フードイベント」など一般的表現に置き換える\n"
        "- 地域を特定できる固有名（グランプリ名・フェス名等）は書かない\n\n"
        "【半ノンフィクション方針】\n"
        "- 指定された実体験ベースに、情景が浮かぶよう自然な詳細を補完してよい\n"
        "- 特定できる固有情報は入れない\n\n"
        f"【テーマ】\nフック：{hook}\n\n"
        f"{body_instruction}\n\n"
        "【文体の絶対ルール（実際の記事から抽出）】\n"
        "- 1文を極力短く。基本1文1行。\n"
        "- 語尾は断言調：「〜だった。」「〜だけだ。」「〜分かった。」\n"
        "- 「〜だと思うんですよね」「〜かもしれません」などの曖昧語尾は使わない\n"
        "- 重要な数字・フレーズは**太字**にする（例：**7割は無視される**）\n"
        "- 記憶の中の会話・一言は鍵括弧で引用する（例：終電間に合わないから行こうよと彼女が言った）\n"
        "- フレームワーク名は物語の中盤以降に自然に出す\n"
        "- 「AI」「テクノロジー」の話を無理やり入れない\n\n"
        "【タイトルのルール（重要）】\n"
        "パターン1（体験×学び）：「〜で学んだ、〇〇のこと　△△という考え方」（体験　概念名 の形。全角スペースで区切る）\n"
        "  例：「路上キャッチで学んだ、人が足を止める瞬間　AIDAという考え方」\n"
        "パターン2（体験×検証）：「〜を〜した。正直、〜だった」\n"
        "  例：「3C分析をバーガー屋に当てはめてみた。正直、びっくりした。」\n"
        "パターン3（結論先出し）：「〜を〜していた。〜だった話」\n"
        "  例：「STPをスキップしていた。バーガー屋がそれで失敗した話」\n"
        "❌ 禁止：「〜のすすめ」「〜完全ガイド」「〜5選」などのハウツー系タイトル\n\n"
        "【記事構成（1500〜2500文字）】\n"
        "1. タイトル：上記パターンのどれかを使う（Day番号不要）\n"
        "2. 書き出し（見出し形式 ###）：場面から入る。「〜していた。」で始める。\n"
        "3. 本文：上記の構成パターンに従う\n"
        "4. 締め：静かな気づきで終わる。CTAは任意（最後の1〜2文のみ可）\n\n"
        "【返却形式（JSONのみ）】\n"
        '{"title": "タイトル", "body": "マークダウン本文（改行は\\nで）",'
        '"category": "' + category + '", "theme_hook": "' + hook + '"}\n\n'
        "JSONのみ返答してください。"
    )

    system_msg = (
        "あなたは日本語のnote.comライター。以下のルールを絶対に守る。\n"
        "絶対禁止：「〜とは〜のことです」から始まる教科書的な書き出し。\n"
        "絶対禁止：マーケ用語の解説・ハウツー記事。\n"
        "絶対禁止：「革命」「人生が変わる」「必見」などの煽り表現。\n"
        "絶対禁止：AIが書いたと分かる不自然な語尾（「〜することができます」「〜という点においては」）。\n"
        "絶対禁止：フレームワーク名を冒頭で説明する。\n"
        "必須：飲食店経営者・AI自作ツール開発者の一人称の体験談として書く。\n"
        "必須：失敗・小さな数字・正直な感情を含める。数字は誇張しない。\n"
        "必須：断言調の語尾（「〜だった。」「〜だけだ。」）を多用する。\n"
        "必須：重要な数字・フレーズを**太字**にする。\n"
        "必須：1500〜2500文字。JSONのみ返す。マークダウン記法でbodyを書く。"
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        temperature=0.8,
        max_tokens=3500,
    )

    content = response.choices[0].message.content.strip()
    start = content.find("{")
    end = content.rfind("}") + 1
    if start == -1:
        raise ValueError("JSON not found in Groq response")
    raw_json = content[start:end]
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError:
        # Fix unescaped literal newlines inside JSON string values
        lines = raw_json.split("\n")
        cleaned = "\\n".join(lines)
        return json.loads(cleaned)


# -----------------------------------------------------------------------
# note.com API — save as draft
# -----------------------------------------------------------------------

def save_draft_to_note(title: str, body: str) -> dict:
    """Save to note.com as draft (NOT published). Nao publishes manually."""
    if not NOTE_CLIENT_CODE:
        logger.warning("[NoteScheduler] NOTE_CLIENT_CODE not set — skipping API call")
        return {"status_code": 0, "response": "NOTE_CLIENT_CODE not configured"}

    headers = {
        "x-note-client-code": NOTE_CLIENT_CODE,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://note.com/",
        "Origin": "https://note.com",
    }
    payload = {"title": title, "body": body, "status": "draft", "note_type": "TextNote"}

    res = requests.post(f"{NOTE_API_BASE}/v2/notes", headers=headers, json=payload, timeout=30)
    if res.status_code not in (200, 201):
        res = requests.post(
            f"{NOTE_API_BASE}/v1/text_notes",
            headers=headers,
            json={"title": title, "body": body, "publish": False},
            timeout=30,
        )

    is_json = res.headers.get("content-type", "").startswith("application/json")
    return {"status_code": res.status_code, "response": res.json() if is_json else res.text[:300]}


# -----------------------------------------------------------------------
# LINE Notify
# -----------------------------------------------------------------------

def notify_line(title: str, body_preview: str, category: str = "") -> bool:
    """Send LINE Notify when draft is ready."""
    if not LINE_NOTIFY_TOKEN:
        logger.info("[NoteScheduler] LINE_NOTIFY_TOKEN not set — skipping")
        return False

    preview = body_preview[:300] if body_preview else ""
    message = (
        f"\n[noteドラフト完成 {category}]\n"
        "--------------------------------\n"
        f"タイトル：{title}\n"
        "--------------------------------\n"
        f"{preview}...\n"
        "--------------------------------\n"
        "note.comで確認して公開してください"
    )

    try:
        res = requests.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {LINE_NOTIFY_TOKEN}"},
            data={"message": message},
            timeout=10,
        )
        if res.status_code == 200:
            logger.info("[NoteScheduler] LINE Notify sent")
            return True
        logger.warning(f"[NoteScheduler] LINE Notify failed: {res.status_code}")
        return False
    except Exception as e:
        logger.warning(f"[NoteScheduler] LINE Notify error: {e}")
        return False


# -----------------------------------------------------------------------
# Local save
# -----------------------------------------------------------------------

def _save_draft_locally(day: int, title: str, body: str, category: str, note_result: dict) -> None:
    """Save draft to backend/data/note_drafts.json for review."""
    drafts_path = os.path.join(os.path.dirname(__file__), "..", "data", "note_drafts.json")
    try:
        os.makedirs(os.path.dirname(drafts_path), exist_ok=True)
        if os.path.exists(drafts_path):
            with open(drafts_path, "r", encoding="utf-8") as f:
                drafts = json.load(f)
        else:
            drafts = []

        drafts.append({
            "day": day,
            "title": title,
            "body": body,
            "category": category,
            "note_api_result": note_result,
            "created_at": datetime.now(JST).isoformat(),
            "status": "pending_review",
        })
        drafts = drafts[-50:]

        with open(drafts_path, "w", encoding="utf-8") as f:
            json.dump(drafts, f, ensure_ascii=False, indent=2)
        logger.info("[NoteScheduler] Draft saved locally")
    except Exception as e:
        logger.warning(f"[NoteScheduler] Local save failed: {e}")


# -----------------------------------------------------------------------
# Main runner
# -----------------------------------------------------------------------

def run_note_draft() -> dict:
    """Main flow: generate -> draft -> LINE notify -> local save."""
    day = get_project_day()
    logger.info(f"[NoteScheduler] Starting draft — Day {day}")

    try:
        content = generate_note_draft(day)
        title = content.get("title", f"Day {day}. Sage AI開発日記")
        body = content.get("body", "")
        category = content.get("category", "")

        if not body:
            raise ValueError("Empty body generated")

        logger.info(f"[NoteScheduler] Generated [{category}]: {title[:60]}")

        pub_result = None
        status = 0
        try:
            from backend.integrations.note_publisher import post_note_draft as _pub
            pub_result = _pub(title, body, publish=False)
            if pub_result.get("key"):
                logger.info(f"[NoteScheduler] auto-posted: {pub_result.get('url')}")
                note_result = {"status_code": 201, "response": pub_result}
                status = 201
            else:
                raise RuntimeError(pub_result.get("error", "unknown"))
        except Exception as pub_err:
            logger.warning(f"[NoteScheduler] note_publisher failed, fallback: {pub_err}")
            note_result = save_draft_to_note(title, body)
            status = note_result["status_code"]
            if status in (200, 201):
                logger.info("[NoteScheduler] Draft saved to note.com (fallback API)")
            else:
                logger.info("[NoteScheduler] Saved as pending_review (manual post required)")

        notify_line(title, body, category)
        _save_draft_locally(day, title, body, category, note_result)

        return {
            "day": day,
            "title": title,
            "category": category,
            "note_status": status,
            "auto_published": bool(pub_result and pub_result.get("key")),
            "line_notified": bool(LINE_NOTIFY_TOKEN),
        }

    except Exception as e:
        logger.error(f"[NoteScheduler] Exception: {e}", exc_info=True)
        return {"error": str(e)}


# -----------------------------------------------------------------------
# Scheduler class (Flask background thread)
# -----------------------------------------------------------------------

class SageNoteScheduler:
    """Runs as a daemon thread; generates draft daily at JST 10:00."""

    def __init__(self):
        self.running = False
        self._thread = None

    def start(self):
        if not GROQ_API_KEY:
            logger.warning("[NoteScheduler] GROQ_API_KEY not set — skipping")
            return
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="SageNoteScheduler")
        self._thread.start()
        logger.info("[NoteScheduler] Started — drafts daily at JST 10:00")

    def stop(self):
        self.running = False

    def _loop(self):
        while self.running:
            now = datetime.now(JST)
            if now.hour == POST_HOUR_JST and now.minute == 0:
                run_note_draft()
                time.sleep(61)
            else:
                time.sleep(30)


# -----------------------------------------------------------------------
# Standalone entry point
# -----------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    day_arg = int(sys.argv[1]) if len(sys.argv) > 1 else get_project_day()
    print(f"[NoteScheduler] Generating draft for Day {day_arg} ...")
    result = run_note_draft()
    print(json.dumps(result, ensure_ascii=False, indent=2))
