const fs = require('fs');
const files = [
  'app/api/admin/subscriptions/route.ts',
  'app/api/admin/coupons/route.ts',
  'app/api/admin/orders/route.ts'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const old = 'cookieStore.get("admin_session")?.value === "authenticated"';
  const rep = '!!cookieStore.get("admin_session")?.value';
  c = c.replace(old, rep);
  fs.writeFileSync(f, c);
  console.log(f, 'patched, size:', fs.statSync(f).size);
});
