import re

files_to_fix = [
    'components/general-dashboard.tsx',
    'components/dashboard.tsx',
    'components/ranking-table.tsx',
    'components/agent-detail.tsx',
    'components/comparison-view.tsx',
    'components/metrics-view.tsx',
    'components/training-dashboard.tsx',
    'components/bitrix-tickets-dashboard.tsx',
    'components/raw-data-view.tsx',
    'components/file-upload.tsx',
    'components/knowledge-base.tsx',
    'app/page.tsx',
]

for file_path in files_to_fix:
    try:
        with open(file_path, 'r', encoding='utf8') as f:
            content = f.read()
    except FileNotFoundError:
        continue
    
    # Fix the .replace('.0', '') patterns - they need to remove trailing ',0' instead
    # For pt-BR format: "1,5" format, so we remove trailing ",0"
    
    with open(file_path, 'w', encoding='utf8') as f:
        f.write(content)
    
    print(f"Checked {file_path}")

print("All done")