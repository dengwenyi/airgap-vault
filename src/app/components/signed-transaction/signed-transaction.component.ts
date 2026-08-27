import { ProtocolService, SerializerService, sumAirGapTxValues } from '@airgap/angular-core'
import { Component, Input } from '@angular/core'
import { IAirGapTransaction, ICoinProtocol, SignedTransaction } from '@airgap/coinlib-core'
import BigNumber from 'bignumber.js'
import { IACMessageDefinitionObjectV3 } from '@airgap/serializer'

@Component({
  selector: 'airgap-signed-transaction',
  templateUrl: './signed-transaction.component.html',
  styleUrls: ['./signed-transaction.component.scss']
})
export class SignedTransactionComponent {
  @Input()
  public signedTxs: IACMessageDefinitionObjectV3[] | undefined // TODO: Type

  @Input()
  public syncProtocolString: string

  public airGapTxs: IAirGapTransaction[]
  public fallbackActivated: boolean = false
  public rawTxData: string
  public aggregatedInfo:
    | {
        numberOfTxs: number
        totalAmount: BigNumber
        totalFees: BigNumber
      }
    | undefined
  public interactionData: string

  constructor(
    private readonly protocolService: ProtocolService,
    private readonly serializerService: SerializerService
  ) {
    //
  }

  public async ngOnChanges(): Promise<void> {
    if (this.syncProtocolString) {
      try {
        this.signedTxs = await this.serializerService.deserialize(this.syncProtocolString)
      } catch (err) {
        console.error(err)
        this.fallbackActivated = true
        this.rawTxData = this.syncProtocolString
      }
    }

    if (this.signedTxs) {
      const protocol: ICoinProtocol = await this.protocolService.getProtocol(this.signedTxs[0].protocol, undefined, false)
      try {
        // tslint:disable-next-line:no-unnecessary-type-assertion
        this.airGapTxs = (
          await Promise.all(
            this.signedTxs.map(async (signedTx) => {
              const payload: SignedTransaction = signedTx.payload as SignedTransaction
              return protocol.getTransactionDetailsFromSigned(payload)
            })
          )
        ).reduce((flatten, toFlatten) => flatten.concat(toFlatten))
        if (
          this.airGapTxs.length > 1 &&
          this.airGapTxs.every((tx: IAirGapTransaction) => tx.protocolIdentifier === this.airGapTxs[0].protocolIdentifier)
        ) {
          this.aggregatedInfo = {
            numberOfTxs: this.airGapTxs.length,
            totalAmount: new BigNumber(sumAirGapTxValues(this.airGapTxs, 'amount')),
            totalFees: new BigNumber(sumAirGapTxValues(this.airGapTxs, 'fee'))
          }
        }
        this.fallbackActivated = false
      } catch (e) {
        this.fallbackActivated = true
        // tslint:disable-next-line:no-unnecessary-type-assertion
        this.rawTxData = (this.signedTxs[0].payload as SignedTransaction).transaction
      }
    }
  }

}
