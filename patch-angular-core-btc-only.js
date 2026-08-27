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
const metamaskAvailability = /\n        \/\/ Add MetaMask, if supported\r?\n        if \(!this\.availableQRTypes\.includes\(QRType\.METAMASK\)(?:.|\r|\n)*?\n        \}\r?\n        this\.qrError/
const metamaskRequestConversion = /\n    async convertMetaMaskSignRequest\(request\) \{(?:.|\r|\n)*?\n    \}\r?\n\}/
const disabledAdapterFactories = [
  'createV0AeternityProtocol',
  'createV0AstarProtocol',
  'createV0ShidenProtocol',
  'createV0CoreumProtocol',
  'createV0CosmosProtocol',
  'createV0EthereumProtocol',
  'createV0EthereumERC20Token',
  'createV0GroestlcoinProtocol',
  'createV0ICPProtocol',
  'createV0MoonbeamProtocol',
  'createV0MoonriverProtocol',
  'createV0MoonbaseProtocol',
  'createV0BnbProtocol',
  'createV0OptimismProtocol',
  'createV0BaseProtocol',
  'createV0OptimismERC20Token',
  'createV0BnbERC20Token',
  'createV0BaseERC20Token',
  'createV0PolkadotProtocol',
  'createV0KusamaProtocol',
  'createV0TezosProtocol',
  'createV0AcurastProtocol',
  'createV0TezosShieldedTezProtocol',
  'createV0TezosKtProtocol',
  'createV0TezosFAProtocol',
  'createV0TezosFA1p2Protocol',
  'createV0TezosFA2Protocol',
  'createV0TezosBTCTezProtocol',
  'createV0TezosCTezProtocol',
  'createV0TezosDogamiProtocol',
  'createV0TezosETHTezProtocol',
  'createV0TezosKolibriUSDProtocol',
  'createV0TezosPlentyProtocol',
  'createV0TezosQuipuswapProtocol',
  'createV0TezosSiriusProtocol',
  'createV0TezosStakerProtocol',
  'createV0TezosTetherUSDProtocol',
  'createV0TezosTzBTCProtocol',
  'createV0TezosUBTCProtocol',
  'createV0TezosUDEFIProtocol',
  'createV0TezosUSDTezProtocol',
  'createV0TezosUUSDProtocol',
  'createV0TezosWrappedProtocol',
  'createV0TezosWrapProtocol',
  'createV0TezosYouProtocol'
]
const legacyProtocolOptions = /((?:export )?const getProtocolOptionsByIdentifierLegacy = \(identifier, network\) => \{)[\s\S]*?\n\};/
const v0Delegation = /((?:export )?function supportsV0Delegation\(protocol\) \{)[\s\S]*?\n\}/

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
  let patched = original
    .replace(removedImport, '')
    .replace(defaultModules, 'constructor(modules = [new BitcoinModule()]) {')
    .replace(identiconAddress, 'async setAddress(_value) {\n        this.identicon = undefined;\n    }\n    b582int(v) {')
    .replace("import { MetamaskGenerator } from '../../services/qr/qr-generators/metamask-generator';\n", '')
    .replace('import { TEMP_BTC_REQUEST_IDS, TEMP_MM_REQUEST_IDS }', 'import { TEMP_BTC_REQUEST_IDS }')
    .replace('    QRType["METAMASK"] = "MetaMask";\n', '')
    .replace('        this.generatorsMap.set(QRType.METAMASK, new MetamaskGenerator());\n', '')
    .replace(/\n                case QRType\.METAMASK:\r?\n                    this\.qrType = QRType\.METAMASK;\r?\n                    this\.activeGenerator = new MetamaskGenerator\(\);\r?\n                    break;/, '')
    .replace(metamaskAvailability, '\n        this.qrError')
    .replace(/\n            if \((?:false && )?decoded\.type === 'eth-sign-request'\) \{\r?\n                const signRequest = EthSignRequest\.fromCBOR\(decoded\.cbor\);\r?\n                return this\.convertMetaMaskSignRequest\(signRequest\);\r?\n            \}/, '')
    .replace(metamaskRequestConversion, '\n}')

  for (const factory of disabledAdapterFactories) {
    const factoryBody = new RegExp(`((?:export )?async function ${factory}\\([^)]*\\) \\{)[\\s\\S]*?\\n\\}`)
    patched = patched.replace(factoryBody, `$1\n    throw new Error('Non-Bitcoin protocol support is disabled.');\n}`)
  }

  patched = patched
    .replace(
      legacyProtocolOptions,
      `$1
    switch (identifier) {
        case MainProtocolSymbols.BTC:
        case MainProtocolSymbols.BTC_SEGWIT:
        case MainProtocolSymbols.BTC_TAPROOT:
            return new BitcoinProtocolOptions(network ? network : new BitcoinProtocolNetwork());
        default:
            throw new NotFoundError(Domain.UTILS, \`No protocol options found for \${identifier}\`);
    }
};`
    )
    .replace(v0Delegation, `$1\n    return false;\n}`)

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

const runtimeFiles = files.filter((file) => file.endsWith('airgap-angular-core.mjs') || file.endsWith('iac-qr.component.mjs') || file.endsWith('serializer-v3-handler.mjs'))
const remainingRuntimeFeatures = runtimeFiles.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8')

  return [
    'generatorsMap.set(QRType.METAMASK',
    "decoded.type === 'eth-sign-request'",
    'convertMetaMaskSignRequest(request)',
    'new EthereumModule',
    'new TezosModule',
    'instanceof TezosProtocol'
  ].filter((feature) => source.includes(feature)).map((feature) => `${file}: ${feature}`)
})

if (remainingRuntimeFeatures.length > 0) {
  throw new Error(`Failed to remove non-Bitcoin QR runtime features:\n${remainingRuntimeFeatures.join('\n')}`)
}

console.log(`Applied Bitcoin-only angular-core patch (${changedFiles} files changed)`)
