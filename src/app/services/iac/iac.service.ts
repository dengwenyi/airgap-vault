import {
  AppConfig,
  APP_CONFIG,
  BaseIACService,
  ClipboardService,
  DeeplinkService,
  IACMessageTransport,
  IACMessageWrapper,
  RelayMessage,
  UiEventElementsService,
  UiEventService
} from '@airgap/angular-core'
import { AirGapWallet, AirGapWalletStatus, MainProtocolSymbols, UnsignedTransaction } from '@airgap/coinlib-core'
import { Inject, Injectable } from '@angular/core'

import { SignTransactionInfo } from '../../models/sign-transaction-info'
import { ErrorCategory, handleErrorLocal } from '../error-handler/error-handler.service'
import { InteractionOperationType, InteractionService } from '../interaction/interaction.service'
import { NavigationService } from '../navigation/navigation.service'
import { SecretsService } from '../secrets/secrets.service'
import * as bitcoinJS from 'bitcoinjs-lib'
import { ModalController, Platform } from '@ionic/angular'
import { SelectAccountPage } from 'src/app/pages/select-account/select-account.page'
import { IACMessageType, IACMessageDefinitionObjectV3, MessageSignRequest } from '@airgap/serializer'
import { BitcoinSegwitTransactionSignRequest } from '@airgap/bitcoin'
import { isBitcoinProtocol } from 'src/app/constants/constants'

@Injectable({
  providedIn: 'root'
})
export class IACService extends BaseIACService {
  constructor(
    public readonly uiEventService: UiEventService,
    public readonly uiEventElementsService: UiEventElementsService,
    public readonly deeplinkService: DeeplinkService,
    protected readonly clipboard: ClipboardService,
    private readonly navigationService: NavigationService,
    private readonly secretsService: SecretsService,
    private readonly interactionService: InteractionService,
    private readonly modalController: ModalController,
    @Inject(APP_CONFIG) appConfig: AppConfig,
    protected readonly platform: Platform
  ) {
    super(uiEventElementsService, clipboard, secretsService.isReady(), [], deeplinkService, appConfig, platform)

    this.serializerMessageHandlers[IACMessageType.TransactionSignRequest] = this.handleUnsignedTransactions.bind(this)
    this.serializerMessageHandlers[IACMessageType.MessageSignRequest] = this.handleMessageSignRequest.bind(this)
  }

  public async relay(data: RelayMessage): Promise<void> {
    this.interactionService.startInteraction({
      operationType: InteractionOperationType.WALLET_SYNC,
      iacMessage: (data as any).messages ?? (data as any).rawString // TODO: Fix types
    })
  }

  private async handleUnsignedTransactions(
    messageWrapper: IACMessageWrapper<IACMessageDefinitionObjectV3[]>,
    _transport: IACMessageTransport,
    scanAgainCallback: Function
  ): Promise<boolean> {
    const signTransactionRequests: IACMessageDefinitionObjectV3[] = messageWrapper.result

    const transactionInfos: SignTransactionInfo[] = (
      await Promise.all(
        signTransactionRequests.map(async (signTransactionRequest): Promise<SignTransactionInfo> => {
          return this.findMatchingWallet(signTransactionRequest)
        })
      )
    ).filter((signTransactionDetails) => signTransactionDetails.wallet !== undefined)

    if (transactionInfos.length > 0) {
      if (transactionInfos.length !== signTransactionRequests.length) {
        // TODO: probably show error
      }

      this.navigationService
        .routeWithState('deserialized-detail', {
          transactionInfos: transactionInfos,
          iacContext: messageWrapper.context,
          type: IACMessageType.TransactionSignRequest
        })

        .catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))

      return true
    } else {
      const cancelButton = {
        text: 'tab-wallets.no-secret_alert.okay_label',
        role: 'cancel',
        handler: () => {
          scanAgainCallback()
        }
      }
      this.uiEventService.showTranslatedAlert({
        header: 'tab-wallets.no-secret_alert.title',
        message: 'tab-wallets.no-secret_alert.text',
        buttons: [cancelButton]
      })

      return false
    }
  }

  private async handleMessageSignRequest(
    messageWrapper: IACMessageWrapper<IACMessageDefinitionObjectV3[]>,
    _transport: IACMessageTransport,
    _scanAgainCallback: Function
  ): Promise<boolean> {
    const messageDefinitionObjects: IACMessageDefinitionObjectV3[] = messageWrapper.result

    const transactionInfos: SignTransactionInfo[] = (
      await Promise.all(
        messageDefinitionObjects.map(async (messageDefinitionObject): Promise<SignTransactionInfo> => {
          return this.findMatchingSignWallet(messageDefinitionObject)
        })
      )
    ).filter((signTransactionDetails) => signTransactionDetails.wallet !== undefined)

    if (transactionInfos.length === 0) {
      this.uiEventService.showTranslatedAlert({
        header: 'tab-wallets.no-secret_alert.title',
        message: 'tab-wallets.no-secret_alert.text',
        buttons: [{ text: 'tab-wallets.no-secret_alert.okay_label', role: 'cancel' }]
      })
      return false
    }

    this.navigationService
      .routeWithState('deserialized-detail', {
        transactionInfos: transactionInfos,
        iacContext: messageWrapper.context,
        type: IACMessageType.MessageSignRequest
      })
      .catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))

    return true
  }

  private async activateWallet(wallet: AirGapWallet): Promise<void> {
    if (wallet.status === AirGapWalletStatus.ACTIVE) {
      return
    }

    wallet.status = AirGapWalletStatus.ACTIVE
    await this.secretsService.updateWallet(wallet)
  }

  private async findMatchingWallet(signTransactionRequest: IACMessageDefinitionObjectV3) {
    if (!isBitcoinProtocol(signTransactionRequest.protocol)) {
      return { wallet: undefined, secret: undefined, signTransactionRequest }
    }

    const unsignedTransaction: UnsignedTransaction = signTransactionRequest.payload as UnsignedTransaction

    // Select wallet by public key and protocol identifier
    let correctWallet = await this.secretsService.findWalletByPublicKeyAndProtocolIdentifier(
      unsignedTransaction.publicKey,
      signTransactionRequest.protocol
    )

    // If no wallet is found with public key and protocol identifier, it's probably because there is no public key.
    // This can happen if we work with third party wallets that have a different format that doesn't include the public key.

    // BTC: First we try to find a wallet by matching the masterFingerprint
    if (
      !correctWallet &&
      (signTransactionRequest.protocol === MainProtocolSymbols.BTC_SEGWIT ||
        signTransactionRequest.protocol === MainProtocolSymbols.BTC ||
        signTransactionRequest.protocol === MainProtocolSymbols.BTC_TAPROOT)
    ) {
      const transaction: BitcoinSegwitTransactionSignRequest['transaction'] = unsignedTransaction.transaction
      const decodedPSBT = bitcoinJS.Psbt.fromHex(transaction.psbt)
      const isTaproot = decodedPSBT.data.inputs.some((input) => input.tapBip32Derivation)

      for (const input of decodedPSBT.data.inputs) {
        const path = isTaproot ? input.tapBip32Derivation : input.bip32Derivation

        for (const derivation of path) {
          const masterFingerprint = derivation.masterFingerprint.toString('hex')

          correctWallet = await this.secretsService.findWalletByFingerprintDerivationPathAndProtocolIdentifier(
            masterFingerprint,
            signTransactionRequest.protocol,
            derivation.path,
            derivation.pubkey
          )
          if (correctWallet) {
            break
          }
        }
        if (correctWallet) {
          break
        }
      }

      // BTC: If we couldn't find a wallet using the masterFingerprint, it's possible that the masterFingerprint is invalid or a placeholder.
      // This can happen if the watch-only wallet doesn't have that information available. In this case, we need to show an account selection modal.
      if (!correctWallet) {
        await new Promise(async (resolve) => {
          // Start account selection
          const modal = await this.modalController.create({
            component: SelectAccountPage,
            componentProps: { type: 'psbt', symbolFilter: signTransactionRequest.protocol }
          })

          modal
            .onDidDismiss()
            .then((result) => {
              correctWallet = result.data
              resolve(undefined)
            })
            .catch(handleErrorLocal(ErrorCategory.IONIC_MODAL))

          modal.present().catch(handleErrorLocal(ErrorCategory.IONIC_MODAL))
        })
      }

      if (correctWallet && !unsignedTransaction.publicKey) {
        unsignedTransaction.publicKey = correctWallet.publicKey // PSBT txs don't include a public key, so we need to set it
      }
    }

    if (correctWallet) {
      await this.activateWallet(correctWallet)
    }

    const secret = correctWallet ? this.secretsService.findByPublicKey(correctWallet.publicKey) : undefined

    return {
      wallet: correctWallet,
      secret,
      signTransactionRequest
    }
  }

  private async findMatchingSignWallet(messageDefinitionObject: IACMessageDefinitionObjectV3) {
    if (!isBitcoinProtocol(messageDefinitionObject.protocol)) {
      return { wallet: undefined, secret: undefined, signTransactionRequest: messageDefinitionObject }
    }

    const messageSignRequest: MessageSignRequest = messageDefinitionObject.payload as MessageSignRequest

    let correctWallet = await this.secretsService.findWalletByPublicKeyAndProtocolIdentifier(
      messageSignRequest.publicKey,
      messageDefinitionObject.protocol
    )

    if (correctWallet) {
      await this.activateWallet(correctWallet)
    }

    const secret = correctWallet ? this.secretsService.findByPublicKey(correctWallet.publicKey) : undefined

    return {
      wallet: correctWallet,
      secret,
      signTransactionRequest: {
        ...messageDefinitionObject,
        payload: {
          ...messageSignRequest,
          publicKey: correctWallet?.publicKey ?? '' // ignore public key if no account has been found
        }
      }
    }
  }

}
