'use strict'

const fs = require('fs')
const path = require('path')

const angularCoreRoot = path.join(__dirname, 'node_modules', '@airgap', 'angular-core')
const removedPackages = [
  '@airgap/acurast',
  '@airgap/aeternity',
  '@airgap/astar',
  '@airgap/base',
  '@airgap/bnb',
  '@airgap/coreum',
  '@airgap/cosmos',
  '@airgap/ethereum',
  '@airgap/groestlcoin',
  '@airgap/icp',
  '@airgap/moonbeam',
  '@airgap/optimism',
  '@airgap/polkadot',
  '@airgap/stellar',
  '@airgap/tezos',
  '@download/blockies',
  '@ethereumjs/rlp',
  '@ethereumjs/tx',
  '@keystonehq/bc-ur-registry-eth',
  'myetherwallet-blockies'
]

const escapedPackages = removedPackages.map((packageName) => packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const removedImport = new RegExp(`^import .* from ['"](?:${escapedPackages.join('|')})(?:/[^'"]*)?['"];?\\r?\\n`, 'gm')
const defaultModules = /constructor\(modules = \[\s*new BitcoinModule\(\),(?:.|\r|\n)*?new StellarModule\(\)\s*\]\) \{/
const identiconAddress = /async setAddress\(value\) \{(?:.|\r|\n)*?\n    \}\n    b582int\(v\) \{/

function javascriptFiles(directory) {
  if (!fs.existsSync(directory)) {
    return []
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    return entry.isDirectory() ? javascriptFiles(entryPath) : entry.name.endsWith('.mjs') ? [entryPath] : []
  })
}

if (!fs.existsSync(angularCoreRoot)) {
  throw new Error(`@airgap/angular-core is not installed at ${angularCoreRoot}`)
}

const files = [path.join(angularCoreRoot, 'fesm2022', 'airgap-angular-core.mjs'), ...javascriptFiles(path.join(angularCoreRoot, 'esm2022'))]
let changedFiles = 0

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8')
  const patched = original
    .replace(removedImport, '')
    .replace(defaultModules, 'constructor(modules = [new BitcoinModule()]) {')
    .replace(identiconAddress, 'async setAddress(_value) {\n        this.identicon = undefined;\n    }\n    b582int(v) {')
    .replace("if (decoded.type === 'eth-sign-request') {", "if (false && decoded.type === 'eth-sign-request') {")

  if (patched !== original) {
    fs.writeFileSync(file, patched)
    changedFiles++
  }
}

const remainingImports = files.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8')

  return removedPackages.filter((packageName) => source.includes(`from '${packageName}`)).map((packageName) => `${file}: ${packageName}`)
})

if (remainingImports.length > 0) {
  throw new Error(`Failed to remove non-Bitcoin protocol imports:\n${remainingImports.join('\n')}`)
}

console.log(`Applied Bitcoin-only angular-core patch (${changedFiles} files changed)`)
