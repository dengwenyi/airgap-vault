import { MainProtocolSymbols } from '@airgap/coinlib-core'

import { isBitcoinProtocol } from './constants'

describe('BTC-only protocol policy', () => {
  it('accepts all supported Bitcoin account types', () => {
    expect(isBitcoinProtocol(MainProtocolSymbols.BTC)).toBe(true)
    expect(isBitcoinProtocol(MainProtocolSymbols.BTC_SEGWIT)).toBe(true)
    expect(isBitcoinProtocol(MainProtocolSymbols.BTC_TAPROOT)).toBe(true)
  })

  it('rejects non-Bitcoin protocols', () => {
    expect(isBitcoinProtocol(MainProtocolSymbols.ETH)).toBe(false)
    expect(isBitcoinProtocol(MainProtocolSymbols.XTZ)).toBe(false)
  })
})
