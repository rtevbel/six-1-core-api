import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigTemplateSetEntity } from './entities/config_template_set.entity';
import { ConfigObjectEntity } from './entities/config_object.entity';
import { ConfigObjectFieldEntity } from './entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ConfigObjectRuntimeFieldMetadataEntity } from './entities/config_object_runtime_field_metadata.entity';
import { ConfigAuditLogEntity } from './entities/config_audit_log.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectMetaEntity } from '../projects/entities/project_meta.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { TaskMetaEntity } from '../projects/tasks/entities/task_meta.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { CustomerMetaEntity } from '../customers/entities/customer_meta.entity';
import { CustomerContactInfoEntity } from '../customers/customer_contact_info/entities/customer_contact_info.entity';
import { CustomerContactInfoMetaEntity } from '../customers/customer_contact_info/entities/customer_contact_info_meta.entity';
import { ResourceEntity } from '../scheduler/entities/resource.entity';
import { ResourceMetaEntity } from '../scheduler/entities/resource_meta.entity';
import { ProjectStepStatusMappingEntity } from '../projects/entities/project_step_status_mappings.entity';
import { UserEntity } from '../users/entities/user.entity';
import { UserMetaEntity } from '../users/user-meta/entities/user-meta.entity';
import { ConfigObjectsService } from './config_objects.service';
import { ConfigLifecycleService } from './config_lifecycle.service';
import { ConfigObjectCompletenessService } from './config-object-completeness.service';
import { ConfigVerificationService } from './verification/config-verification.service';
import { SystemTableVerificationService } from './verification/system-table-verification.service';
import { ConfigObjectVerificationTokenService } from './verification/config-object-verification-token.service';
import { ConfigVerificationRateLimitService } from './verification/config-verification-rate-limit.service';
import { ConfigObjectVerificationAuditService } from './verification/config-object-verification-audit.service';
import { ConfigObjectLifecycleEntity } from './entities/config_object_lifecycle.entity';
import { ConfigObjectLifecycleTransitionEntity } from './entities/config_object_lifecycle_transition.entity';
import { ConfigObjectRelationshipEntity } from './entities/config_object_relationship.entity';
import { ConfigObjectViewEntity } from './entities/config_object_view.entity';
import { ConfigObjectViewPanelEntity } from './entities/config_object_view_panel.entity';
import { ConfigCustomObjectInstanceEntity } from './entities/config_custom_object_instance.entity';
import { ConfigObjectStatusMappingEntity } from './entities/config_object_status_mapping.entity';
import { ConfigObjectVerificationRuleEntity } from './entities/config_object_verification_rule.entity';
import { ConfigObjectVerificationAuditLogEntity } from './entities/config_object_verification_audit_log.entity';
import { ConfigObjectsController } from './config_objects.controller';
import { EventsModule } from '../events/events.module';
import { ProcessInstancesModule } from '../process_instances/process_Instances.module';

/**
 * ConfigObjectsModule wires together the configurable object metadata layer.
 *
 * @description
 * - Registers TypeORM entities for config metadata, audit logs and meta tables.
 * - Exposes the {@link ConfigObjectsService} used by other modules to resolve
 *   schemas and merge core entities with dynamic fields.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    forwardRef(() => EventsModule),
    forwardRef(() => ProcessInstancesModule),
    TypeOrmModule.forFeature([
      ConfigTemplateSetEntity,
      ConfigObjectEntity,
      ConfigObjectFieldEntity,
      ConfigObjectFieldRuleEntity,
      ConfigObjectRuntimeFieldMetadataEntity,
      ConfigAuditLogEntity,
      ConfigObjectLifecycleEntity,
      ConfigObjectLifecycleTransitionEntity,
      ConfigObjectRelationshipEntity,
      ConfigObjectViewEntity,
      ConfigObjectViewPanelEntity,
      ConfigCustomObjectInstanceEntity,
      ConfigObjectStatusMappingEntity,
      ConfigObjectVerificationRuleEntity,
      ConfigObjectVerificationAuditLogEntity,
      ProjectEntity,
      ProjectMetaEntity,
      TaskEntity,
      TaskMetaEntity,
      CustomerEntity,
      CustomerMetaEntity,
      CustomerContactInfoEntity,
      CustomerContactInfoMetaEntity,
      ResourceEntity,
      ResourceMetaEntity,
      ProjectStepStatusMappingEntity,
      UserEntity,
      UserMetaEntity,
    ]),
  ],
  controllers: [ConfigObjectsController],
  providers: [
    ConfigObjectsService,
    ConfigLifecycleService,
    ConfigObjectCompletenessService,
    ConfigVerificationService,
    SystemTableVerificationService,
    ConfigObjectVerificationTokenService,
    ConfigVerificationRateLimitService,
    ConfigObjectVerificationAuditService,
  ],
  exports: [
    ConfigObjectsService,
    ConfigLifecycleService,
    ConfigObjectCompletenessService,
    ConfigVerificationService,
    ConfigObjectVerificationTokenService,
  ],
})
export class ConfigObjectsModule {}
