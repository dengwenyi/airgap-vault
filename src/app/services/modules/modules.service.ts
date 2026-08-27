import { BaseModulesService, ModulesController, ProtocolService } from '@airgap/angular-core'
import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class VaultModulesService extends BaseModulesService {
  constructor(
    modulesController: ModulesController,
    protocolService: ProtocolService
  ) {
    super(modulesController, protocolService)
  }
}
