const fs = require('fs');
const txt = fs.readFileSync('src/services/ai.service.js', 'utf8');

let ticks = 0;
let line = 1;
for (let i = 0; i < txt.length; i++) {
  if (txt[i] === '\n') line++;
  if (txt[i] === '`') {
    let escapeCount = 0;
    let j = i - 1;
    while (j >= 0 && txt[j] === '\\') {
      escapeCount++;
      j--;
    }
    if (escapeCount % 2 === 0) {
      ticks++;
      console.log(`Tick ${ticks} at line ${line}`);
    }
  }
}
