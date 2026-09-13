// The retired product name must not reappear in this repo.
//
// The desktop repo has had this check since the rename, but every variant of it
// runs `git grep` over ITS OWN tracked files, so it could never see this one --
// and this is the repo that publishes the npm tarball and the MCP registry
// entry. The gap was not theoretical: the registry served 0.1.1 for months, and
// that tarball's package.json still pointed at the old slug, long after the
// working tree here had been cleaned up. Nothing was watching the published
// artefact, because nothing here was watching at all.
//
// The needle is assembled at runtime so this file is not a hit against itself.
import { execFileSync } from 'node:child_process'

const NEEDLE = ['shell', 'pilot'].join('')

let out = ''
try {
  // -a so a committed binary carrying the old name in its strings is read as
  // text; that is how the rename slipped through the first time.
  out = execFileSync('git', ['grep', '-a', '-i', '-n', NEEDLE], { encoding: 'utf8' })
} catch (err) {
  // git grep exits 1 with no output when there are no matches. That is the pass.
  if (err.status !== 1 || (err.stdout ?? '') !== '') throw err
}

if (out !== '') {
  console.error(`FAIL  the retired product name is back in tracked files:\n${out}`)
  process.exit(1)
}

const paths = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((p) => p.toLowerCase().includes(NEEDLE))
if (paths.length > 0) {
  console.error(`FAIL  the retired product name is in tracked paths:\n${paths.join('\n')}`)
  process.exit(1)
}

console.log('PASS  no trace of the retired product name')
