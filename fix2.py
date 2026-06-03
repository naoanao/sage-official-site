with open('SAGE_MASTER_CONTEXT.md', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
# Delete lines 140 through 191
del lines[140:192]
with open('SAGE_MASTER_CONTEXT.md', 'w', encoding='utf-8') as f:
    f.writelines(lines)
