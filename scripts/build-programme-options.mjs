import fs from 'node:fs/promises';

const PROGRAMMES_PATH = new URL('../src/data/programmes.json', import.meta.url);
const OPTIONS_PATH = new URL('../src/data/programmeOptions.json', import.meta.url);

const programmes = JSON.parse(await fs.readFile(PROGRAMMES_PATH, 'utf8'));
const options = programmes
  .map(({ id, programmeName, degreeLevel, school }) => ({ id, programmeName, degreeLevel, school }))
  .sort((a, b) => a.degreeLevel.localeCompare(b.degreeLevel) || a.programmeName.localeCompare(b.programmeName));

await fs.writeFile(OPTIONS_PATH, `${JSON.stringify(options, null, 2)}\n`);
console.log(`Wrote ${options.length} programme options to src/data/programmeOptions.json`);
