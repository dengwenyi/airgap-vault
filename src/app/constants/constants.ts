export const ENTROPY_SIZE: number = 4096
export const SHOW_SECRET_MIN_TIME_IN_SECONDS: number = 30
export const DEEPLINK_VAULT_PREFIX: string = `airgap-vault://`
export const DEEPLINK_VAULT_ADD_ACCOUNT: string = `${DEEPLINK_VAULT_PREFIX}add-account/`

export const BIP39_PASSPHRASE_ENABLED: boolean = true

// This branch deliberately exposes only the three Bitcoin account types.
export const BTC_PROTOCOL_IDENTIFIERS: ReadonlySet<ProtocolSymbols> = new Set([
  MainProtocolSymbols.BTC,
  MainProtocolSymbols.BTC_SEGWIT,
  MainProtocolSymbols.BTC_TAPROOT
])

export const isBitcoinProtocol = (protocol: string): boolean => BTC_PROTOCOL_IDENTIFIERS.has(protocol as ProtocolSymbols)
import { MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'
