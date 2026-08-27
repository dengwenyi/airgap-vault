'use strict'

const fs = require('fs')
const path = require('path')

const cryptoRoot = path.join(__dirname, 'node_modules', '@airgap', 'crypto')
const derivePath = path.join(cryptoRoot, 'derive.js')
const indexPath = path.join(cryptoRoot, 'index.js')
const secretPath = path.join(cryptoRoot, 'secret.js')
const packagePath = path.join(cryptoRoot, 'package.json')

if (!fs.existsSync(derivePath) || !fs.existsSync(indexPath) || !fs.existsSync(secretPath) || !fs.existsSync(packagePath)) {
  throw new Error(`@airgap/crypto is not installed at ${cryptoRoot}`)
}

const derive = fs
  .readFileSync(derivePath, 'utf8')
  .replace(/var derive_2 = require\("\.\/sapling\/derive"\);\r?\n/, '')
  .replace(/var derive_4 = require\("\.\/sr25519\/derive"\);\r?\n/, '')
  .replace(/\s*case 'sr25519':\r?\n\s*return \[2 \/\*return\*\/, \(0, derive_4\.deriveSr25519\)\(crypto\.compatibility, seed, derivationPath\)\];/, '')
  .replace(/\s*case 'sapling':\r?\n\s*return \[2 \/\*return\*\/, \(0, derive_2\.deriveSapling\)\(seed, derivationPath\)\];/, '')

const index = fs
  .readFileSync(indexPath, 'utf8')
  .replace('exports.decodeDerivative = exports.encodeDerivative = exports.mnemonicToSeed = exports.deriveSr25519 = exports.deriveEd25519 = exports.derive = void 0;', 'exports.decodeDerivative = exports.encodeDerivative = exports.mnemonicToSeed = exports.deriveEd25519 = exports.derive = void 0;')
  .replace(/var derive_3 = require\("\.\/sr25519\/derive"\);\r?\nObject\.defineProperty\(exports, "deriveSr25519", \{ enumerable: true, get: function \(\) \{ return derive_3\.deriveSr25519; \} \}\);\r?\n/, '')

const secret = fs
  .readFileSync(secretPath, 'utf8')
  .replace(/var wasm_crypto_1 = require\("@polkadot\/wasm-crypto"\);\r?\n/, '')
  .replace(
    /function mnemonicToSeed\(crypto, mnemonic, password\) \{[\s\S]*?\n\}\r?\nexports\.mnemonicToSeed = mnemonicToSeed;/,
    `function mnemonicToSeed(crypto, mnemonic, password) {
    var secretType = crypto.secretType !== undefined && crypto.secretType !== null ? crypto.secretType : 'secret';
    return Promise.resolve(mnemonicToBip39Seed(secretType, mnemonic, password));
}
exports.mnemonicToSeed = mnemonicToSeed;`
  )
  .replace(/\r?\nfunction mnemonicToSubstrateSeed\(mnemonic, password\) \{[\s\S]*?\n\}/, '')

fs.writeFileSync(derivePath, derive)
fs.writeFileSync(indexPath, index)
fs.writeFileSync(secretPath, secret)

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
delete packageJson.dependencies['@airgap/sapling-wasm']
delete packageJson.dependencies['@polkadot/wasm-crypto']
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

for (const dependency of [
  path.join(__dirname, 'node_modules', '@airgap', 'sapling-wasm'),
  path.join(__dirname, 'node_modules', '@polkadot', 'wasm-crypto')
]) {
  fs.rmSync(dependency, { recursive: true, force: true })
}

const patchedRuntime = `${fs.readFileSync(derivePath, 'utf8')}\n${fs.readFileSync(indexPath, 'utf8')}\n${fs.readFileSync(secretPath, 'utf8')}`
const forbidden = ['./sapling/derive', './sr25519/derive', 'deriveSapling', 'deriveSr25519', '@polkadot/wasm-crypto', 'mnemonicToSubstrateSeed']
const remaining = forbidden.filter((value) => patchedRuntime.includes(value))

if (remaining.length > 0) {
  throw new Error(`Failed to remove non-Bitcoin crypto runtime features: ${remaining.join(', ')}`)
}

console.log('Applied Bitcoin-only @airgap/crypto patch')
