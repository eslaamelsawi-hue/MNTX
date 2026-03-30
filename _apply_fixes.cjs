const fs = require('fs');

// Fix user-dashboard.tsx
let ud = fs.readFileSync('components/user-dashboard.tsx', 'utf8');

// Add CalendarPlus import and Link
ud = ud.replace(
  'XCircle } from "lucide-react"',
  'XCircle, CalendarPlus } from "lucide-react"\nimport Link from "next/link"'
);

// Add bookSession EN
ud = ud.replace(
  'sessionNotice: "Each session is 1 hour per week',
  'bookSession: "Book Your Session",\n    sessionNotice: "Each session is 1 hour per week'
);

// Add bookSession AR - find line before the final },\n}
const arMarker = '\u0645\u062a\u0639\u062f\u062f\u0629.",';
const arIdx = ud.lastIndexOf(arMarker);
if (arIdx !== -1) {
  const insertPos = arIdx + arMarker.length;
  ud = ud.slice(0, insertPos) + '\n    bookSession: "\u0627\u062d\u062c\u0632 \u062c\u0644\u0633\u062a\u0643",' + ud.slice(insertPos);
}

// Replace subscriptions heading
ud = ud.replace(
  '<h2 className="mb-4 text-xl font-semibold">{l.subscriptions}</h2>',
  '<div className="mb-4 flex items-center justify-between">\n            <h2 className="text-xl font-semibold">{l.subscriptions}</h2>\n            <Link href={' + '//booking' + '}>\n              <Button className="gap-2">\n                <CalendarPlus className="h-4 w-4" />\n                {l.bookSession}\n              </Button>\n            </Link>\n          </div>'
);

fs.writeFileSync('components/user-dashboard.tsx', ud, 'utf8');
console.log('user-dashboard done');
console.log('bookSession:', ud.includes('bookSession'));
console.log('CalendarPlus:', ud.includes('CalendarPlus'));

// Fix admin-dashboard.tsx
let ad = fs.readFileSync('components/admin-dashboard.tsx', 'utf8');

// Count existing 120 min
const existing120 = (ad.match(/120 min/g) || []).length;
console.log('Existing 120 min count:', existing120);

if (existing120 === 0) {
  // Add after each "90 min" SelectItem
  ad = ad.replace(
    /<SelectItem value="90">90 min<\/SelectItem>/g,
    '<SelectItem value="90">90 min</SelectItem>\n                        <SelectItem value="120">120 min</SelectItem>'
  );
}

fs.writeFileSync('components/admin-dashboard.tsx', ad, 'utf8');
console.log('admin-dashboard done');
console.log('120 min count:', (ad.match(/120 min/g) || []).length);
