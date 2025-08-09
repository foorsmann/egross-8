const fs = require('fs').promises;
const path = require('path');

const MAP = {
  'ă':'a','Ă':'A','â':'a','Â':'A','î':'i','Î':'I',
  'ș':'s','Ș':'S','ş':'s','Ş':'S',
  'ț':'t','Ț':'T','ţ':'t','Ţ':'T'
};

function timestamp() {
  const d = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

(async () => {
  const localesDir = path.join(__dirname, '..', 'locales');
  const entries = await fs.readdir(localesDir, { withFileTypes: true });
  const summary = [];

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name) !== '.json') continue;
    const filePath = path.join(localesDir, entry.name);
    const original = await fs.readFile(filePath, 'utf8');
    let modified = original;
    let count = 0;

    for (const [src, dest] of Object.entries(MAP)) {
      const regex = new RegExp(src, 'g');
      const matches = original.match(regex);
      if (matches) {
        count += matches.length;
        modified = modified.replace(regex, dest);
      }
    }

    if (count > 0) {
      const backupPath = `${filePath}.bak-${timestamp()}`;
      await fs.writeFile(backupPath, original, 'utf8');
      await fs.writeFile(filePath, modified, 'utf8');
      summary.push(`${entry.name}: ${count}`);
    }
  }

  if (summary.length === 0) {
    console.log('No replacements made.');
  } else {
    console.log('Replacements made:');
    summary.forEach(line => console.log(line));
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
