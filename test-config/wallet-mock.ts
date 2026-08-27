import { AirGapMarketWallet, IAirGapTransaction, getProtocolByIdentifier } from '@airgap/coinlib-core'
import { MainProtocolSymbols } from '@airgap/coinlib-core'

class WalletMock {
  public btcWallet: AirGapMarketWallet = new AirGapMarketWallet(
    getProtocolByIdentifier(MainProtocolSymbols.BTC),
    'xpub6CcLgL3yuTNxguFdSikacKj93R77GMToq1488BKLdZMAQ2BfrVQrx31phHwqhx4kRUTNCeyiWiqvppaykiXM9w8RWJFbhj1etsCgBckA2bF',
    false,
    "m/44'/0'/0'",
    undefined
  )
  public btcTransaction: IAirGapTransaction = {
    from: ['1JzeZaZwb1gLxQEwexUn4XmZ3tmSfuesBo'],
    to: ['1JzeZaZwb1gLxQEwexUn4XmZ3tmSfuesBo'],
    amount: '10000000000000',
    fee: '0',
    protocolIdentifier: MainProtocolSymbols.BTC,
    payload: {
      ins: [
        {
          txId: 'f0cad3ef387743f27fb02b7636b7a134f5b04390cbf54dfd26c3cda3da3b49f5',
          value: 111404,
          vout: 1,
          address: '1JzeZaZwb1gLxQEwexUn4XmZ3tmSfuesBo',
          derivationPath: '0/0'
        }
      ],
      outs: [
        { recipient: '1JzeZaZwb1gLxQEwexUn4XmZ3tmSfuesBo', isChange: false, value: 10000 },
        { recipient: '19TEBVnMWkL78WbVnVs64Q9igrvqjzfw28', isChange: true, value: 101396 }
      ]
    },
    publicKey: '026892a703a3a8816e476db3e47d6d2ae8912f4ef1c47026b80651740623110ae5'
  } as any

  public static injectSecret() {
    // removed seed
  }
}

export { WalletMock }
