import { CustomerContactInfoMetaEntity } from '../../customers/customer_contact_info/entities/customer_contact_info_meta.entity';
import { CustomerContactInfoEntity } from '../../customers/customer_contact_info/entities/customer_contact_info.entity';
import { CustomerMetaEntity } from '../../customers/entities/customer_meta.entity';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectMetaEntity } from '../../projects/entities/project_meta.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { TaskMetaEntity } from '../../projects/tasks/entities/task_meta.entity';
import { ResourceEntity } from '../../scheduler/entities/resource.entity';
import { ResourceMetaEntity } from '../../scheduler/entities/resource_meta.entity';

export interface SorMetaTableDescriptor {
  metaEntity: Function;
  coreIdProperty: string;
  metaJsonProperty: string;
  coreEntity?: Function;
  corePkProperty?: string;
  tenantIdProperty?: string;
}

const SOR_META_TABLE_REGISTRY: Partial<Record<string, SorMetaTableDescriptor>> = {
  project: {
    metaEntity: ProjectMetaEntity,
    coreIdProperty: 'projectId',
    metaJsonProperty: 'metaJson',
    coreEntity: ProjectEntity,
    corePkProperty: 'projectId',
    tenantIdProperty: 'tenantId',
  },
  task: {
    metaEntity: TaskMetaEntity,
    coreIdProperty: 'taskId',
    metaJsonProperty: 'metaJson',
    coreEntity: TaskEntity,
    corePkProperty: 'taskId',
    tenantIdProperty: 'tenantId',
  },
  customer: {
    metaEntity: CustomerMetaEntity,
    coreIdProperty: 'customerId',
    metaJsonProperty: 'metaJson',
    coreEntity: CustomerEntity,
    corePkProperty: 'customerId',
  },
  customer_contact: {
    metaEntity: CustomerContactInfoMetaEntity,
    coreIdProperty: 'customerContactId',
    metaJsonProperty: 'metaJson',
    coreEntity: CustomerContactInfoEntity,
    corePkProperty: 'customerContactId',
  },
  resource: {
    metaEntity: ResourceMetaEntity,
    coreIdProperty: 'resourceId',
    metaJsonProperty: 'metaJson',
    coreEntity: ResourceEntity,
    corePkProperty: 'resourceId',
    tenantIdProperty: 'tenantId',
  },
};

export function getSorMetaTableDescriptor(
  objectType: string,
): SorMetaTableDescriptor | null {
  return SOR_META_TABLE_REGISTRY[objectType] ?? null;
}

export function listSorMetaTableObjectTypes(): string[] {
  return Object.keys(SOR_META_TABLE_REGISTRY);
}
