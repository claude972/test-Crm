import { Injectable } from '@nestjs/common';

import { DEFAULT_DPA_REGION } from 'src/engine/core-modules/dpa/config/dpa-region-config.constant';
import { type DpaRegion } from 'src/engine/core-modules/dpa/types/dpa.type';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

// Region is deployment-wide today; the unused per-workspace arg is kept so it can become a per-workspace override later without touching callers.
@Injectable()
export class DpaRegionService {
  constructor(private readonly kovaa-labConfigService: KovaaLab CRMConfigService) {}

  getRegionForWorkspace(_workspace?: Pick<WorkspaceEntity, 'id'>): DpaRegion {
    return this.getDeploymentRegion();
  }

  getDeploymentRegion(): DpaRegion {
    const configured = this.kovaa-labConfigService.get('DPA_DEPLOYMENT_REGION');

    return configured ?? DEFAULT_DPA_REGION;
  }
}
