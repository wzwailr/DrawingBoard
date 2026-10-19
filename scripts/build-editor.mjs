import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const sha = 'e1b7aacb356a492aa1e0fc6eb57b8896124027f0';
const archiveHash = '87da5287759d85c59caff316ec59a18719a64e4baa900d73c89dbecfce1aabd4';
const source = path.resolve('vendor/excalidraw');
function run(exe, args, cwd = process.cwd()) {
  const result = spawnSync(exe, args, { cwd, stdio: 'inherit', windowsHide: true, env: { ...process.env, HUSKY: '0' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${exe} ${args.join(' ')} exited ${result.status}`);
}
async function hash(file) { return createHash('sha256').update(await readFile(file)).digest('hex'); }

if (!existsSync(path.join(source, 'package.json'))) {
  await mkdir('.cache', { recursive: true });
  const archive = path.resolve('.cache', `excalidraw-${sha}.zip`);
  if (!existsSync(archive)) {
    const response = await fetch(`https://codeload.github.com/excalidraw/excalidraw/zip/${sha}`);
    if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
    await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
  }
  if (await hash(archive) !== archiveHash) throw new Error('Source archive checksum mismatch');
  await mkdir(source, { recursive: true });
  run('tar', ['-xf', archive, '-C', source, '--strip-components=1']);
}
const packageJson = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
if (packageJson.packageManager !== 'yarn@1.22.22') throw new Error('Unexpected upstream package manager');
const lockBefore = await hash(path.join(source, 'yarn.lock'));
const fontPatch = JSON.parse(await readFile('vendor/patches/local-fonts.json', 'utf8'));
const fontSource = path.join(source, fontPatch.file);
const contents = (await readFile(fontSource, 'utf8')).replaceAll('\r\n', '\n');
if (!contents.includes(fontPatch.after)) {
  if (!contents.includes(fontPatch.before)) throw new Error('Pinned font patch no longer matches upstream');
  await writeFile(fontSource, contents.replace(fontPatch.before, fontPatch.after));
}
const yarn = path.resolve('node_modules/yarn/bin/yarn.js');
if (!process.argv.includes('--build-only')) {
  run(process.execPath, [yarn, 'install', '--frozen-lockfile', '--ignore-scripts', '--network-concurrency', '3', '--network-timeout', '20000'], source);
}
run(process.execPath, [yarn, 'build:packages'], source);
if (await hash(path.join(source, 'yarn.lock')) !== lockBefore) throw new Error('Upstream lockfile changed');
await mkdir('public/engine-assets/fonts', { recursive: true });
await cp(path.join(source, 'packages/excalidraw/fonts'), 'public/engine-assets/fonts', {
  recursive: true, filter: (file) => statSync(file).isDirectory() || /\.(woff2?|txt|md)$/i.test(file),
});
await writeFile(path.join(source, '.drawingboard-source.json'), JSON.stringify({ sha, archiveHash, yarnLockSha256: lockBefore, patches: ['local-fonts.json'] }, null, 2));
console.log(`Built pinned Excalidraw ${sha}; unchanged upstream lock ${lockBefore}`);
