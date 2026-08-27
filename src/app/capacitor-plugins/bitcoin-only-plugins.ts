import { IsolatedModulesPlugin, ZipPlugin } from '@airgap/angular-core'

const unsupported = async (): Promise<never> => {
  throw new Error('Dynamic protocol modules are disabled in the Bitcoin-only build.')
}

export const bitcoinOnlyIsolatedModules: IsolatedModulesPlugin = {
  previewDynamicModule: unsupported,
  verifyDynamicModule: unsupported,
  registerDynamicModule: unsupported,
  readDynamicModule: unsupported,
  removeDynamicModules: async (): Promise<void> => undefined,
  readAssetModule: unsupported,
  loadAllModules: async () => ({ modules: [] }),
  callMethod: unsupported,
  batchCallMethod: unsupported
}

export const bitcoinOnlyZip: ZipPlugin = {
  unzip: unsupported
}
