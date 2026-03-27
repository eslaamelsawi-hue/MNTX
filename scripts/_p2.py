f=open('components/gold-pro-page.tsx',encoding='utf-8').read()
f=f.replace('<IngotCalculator />','<IngotCalculator currency="KWD" embedded />')
open('components/gold-pro-page.tsx','w',encoding='utf-8').write(f)
print('Done')