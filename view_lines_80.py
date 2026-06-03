with open('SAGE_MASTER_CONTEXT.md', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
for i, line in enumerate(lines[80:140]):
    print(f"{i+80}: {line.strip()}")
