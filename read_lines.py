with open('SAGE_MASTER_CONTEXT.md', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Instagram運用はフラグ整合性の確認が必要" in line or "---" in line or "音楽生成系自律アセット" in line or "ドキュメント・eBook自律生成" in line:
        print(f"{i}: {line.strip()}")
