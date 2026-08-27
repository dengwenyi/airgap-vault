import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'
import { SignedTransactionComponent } from './signed-transaction.component'
import { MainProtocolSymbols } from '@airgap/coinlib-core/utils/ProtocolSymbols'
import { IACMessageType } from '@airgap/serializer'
import { SecretsService } from 'src/app/services/secrets/secrets.service'
import { SecureStorageService } from 'src/app/services/secure-storage/secure-storage.service'
import { SecureStorageServiceMock } from 'src/app/services/secure-storage/secure-storage.mock'
import { FILESYSTEM_PLUGIN, ISOLATED_MODULES_PLUGIN, ProtocolService, ZIP_PLUGIN } from '@airgap/angular-core'
import { bitcoinOnlyIsolatedModules } from '../../capacitor-plugins/bitcoin-only-plugins'
import { FilesystemMock, ZipMock } from 'test-config/ionic-mocks'

describe('SignedTransactionComponent', () => {
  let signedTransactionFixture: ComponentFixture<SignedTransactionComponent>
  let signedTransaction: SignedTransactionComponent
  let protocolServiceSpy: jasmine.SpyObj<ProtocolService>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()
    protocolServiceSpy = jasmine.createSpyObj('ProtocolService', {
      getProtocol: Promise.resolve({
        getTransactionDetailsFromSigned: async () => [
          {
            from: ['1JzeZaZwb1gLxQEwexUn4XmZ3tmSfuesBo'],
            to: ['19TEBVnMWkL78WbVnVs64Q9igrvqjzfw28'],
            amount: '10000',
            fee: '8',
            protocolIdentifier: MainProtocolSymbols.BTC
          }
        ]
      })
    })
    TestBed.configureTestingModule(
      unitHelper.testBed({
        declarations: [],
        providers: [
          { provide: SecureStorageService, useClass: SecureStorageServiceMock },
          { provide: ISOLATED_MODULES_PLUGIN, useValue: bitcoinOnlyIsolatedModules },
          { provide: FILESYSTEM_PLUGIN, useClass: FilesystemMock },
          { provide: ZIP_PLUGIN, useClass: ZipMock },
          { provide: ProtocolService, useValue: protocolServiceSpy },
          SecretsService
        ]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(async () => {
    signedTransactionFixture = TestBed.createComponent(SignedTransactionComponent)
    signedTransaction = signedTransactionFixture.componentInstance
  })

  it('should be created', () => {
    expect(signedTransaction instanceof SignedTransactionComponent).toBe(true)
  })

  it(
    'should load the from-to component if a valid tx is given',
    waitForAsync(async () => {
      signedTransaction.signedTxs = [
        {
          type: IACMessageType.TransactionSignResponse,
          protocol: MainProtocolSymbols.BTC,
          payload: {
          accountIdentifier: 'test',
            transaction: 'bitcoin-signed-transaction'
          }
        } as any
      ]

      expect(signedTransaction.airGapTxs).toBe(undefined)
      expect(signedTransaction.fallbackActivated).toBe(false)

      await signedTransaction.ngOnChanges()

      expect(signedTransaction.airGapTxs).toBeDefined()
      expect(signedTransaction.fallbackActivated).toBe(false)
    })
  )

})
