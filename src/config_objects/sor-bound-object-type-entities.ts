import { CustomerContactInfoEntity } from '../customers/customer_contact_info/entities/customer_contact_info.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { ResourceEntity } from '../scheduler/entities/resource.entity';

/**
 * Maps `config_objects.object_type` / SoR registry keys to the backing TypeORM entity.
 * Used by drift tests: every {@link sor-field-descriptors.registry} `fieldKey` must
 * match an entity column property name.
 */
export const SOR_BOUND_OBJECT_TYPE_ENTITIES: Record<string, Function> = {
  project: ProjectEntity,
  task: TaskEntity,
  customer: CustomerEntity,
  customer_contact: CustomerContactInfoEntity,
  resource: ResourceEntity,
};
