f = open('components/ingot-calculator.tsx', encoding='utf-8')
lines = f.readlines()
f.close()

insert = [
    '  )\n',
    '  return (\n',
    '    <div className={embedded ? "" : "mx-auto max-w-3xl px-4 py-12"}>\n',
    '      {title}\n',
    '\n',
]

# Insert after line 106 (index 105 is blank line, insert after it = index 106)
new_lines = lines[:106] + insert + lines[106:]

f = open('components/ingot-calculator.tsx', 'w', encoding='utf-8')
f.writelines(new_lines)
f.close()
print('Done, total lines:', len(new_lines))