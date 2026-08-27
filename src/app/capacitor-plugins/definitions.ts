import { PluginListenerHandle, registerPlugin } from '@capacitor/core'

export interface CameraPreviewPlugin {
  start({}): Promise<void>
  stop(): Promise<void>
  capture({}): Promise<{ value: string }>
}

export const CameraPreview: CameraPreviewPlugin = registerPlugin('CameraPreview')

export interface SecurityUtilsPlugin {
  waitForOverlayDismiss(): Promise<void>
  assessDeviceIntegrity(): Promise<{ value: boolean }>
  authenticate(): Promise<void>
  setInvalidationTimeout({}): Promise<void>
  invalidate(): Promise<void>
  toggleAutomaticAuthentication({}): Promise<void>
  setAuthenticationReason({}): Promise<void>
  initStorage({}): Promise<void>
  isDeviceSecure({}): Promise<{ value: boolean }>
  secureDevice({}): Promise<void>
  getItem({}): Promise<{ value: string }>
  setItem({}): Promise<void>
  setupRecoveryPassword({}): Promise<{ recoveryKey: string }>
  removeItem({}): Promise<void>
  removeAll({}): Promise<void>
  destroy(): Promise<void>
  setWindowSecureFlag(): Promise<void>
  clearWindowSecureFlag(): Promise<void>
  addListener(event: string, callback: Function): PluginListenerHandle
}

export const SecurityUtils: SecurityUtilsPlugin = registerPlugin('SecurityUtils')

export interface EnvContextChangedEvent {
  context: 'empty' | 'knox'
}

export type EnvContextChangedListener = (event: EnvContextChangedEvent) => void

export interface EnvironmentPlugin {
  addListener(event: 'envContextChanged', listenerFunc: EnvContextChangedListener): Promise<PluginListenerHandle> & PluginListenerHandle
}

export const Environment: EnvironmentPlugin = registerPlugin('Environment')
