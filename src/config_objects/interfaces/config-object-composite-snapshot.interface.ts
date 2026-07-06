import type { ConfigObjectBindingMode } from '../entities/config_object.entity';
import type { ConfigObjectRunnerSchemaView } from './config-object-resolved-instance.interface';

/**
 * Multi-table read model: primary row plus related FK / child snapshots.
 */
export interface ConfigObjectCompositeSnapshotView {
  objectType: string;
  id: number;
  tenantId: number | null;
  bindingMode: ConfigObjectBindingMode;
  schema: ConfigObjectRunnerSchemaView;
  primary: Record<string, unknown>;
  dynamicFields?: Record<string, unknown>;
  relatedSnapshots: Record<string, unknown>;
}
