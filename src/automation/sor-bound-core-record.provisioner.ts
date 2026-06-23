import { randomBytes } from 'crypto';
import type { EntityManager } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { hash_content } from '../common/functions';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { CustomerMetaEntity } from '../customers/entities/customer_meta.entity';
import { ResourceEntity } from '../scheduler/entities/resource.entity';
import {
  canonicalizeObjectType,
} from '../config_objects/core-field-descriptor/object-type-entity.registry';

export interface ProvisionSorBoundCoreRecordParams {
  tenantId: number;
  objectType: string;
  processInstanceId: number;
  stepObjectInstanceId: number;
  context?: Record<string, unknown> | null;
}

/**
 * Creates a minimal SoR core row for `create_on_enter` process step bindings.
 * Returns the new primary key (`coreId`).
 */
export async function provisionSorBoundCoreRecordInTransaction(
  manager: EntityManager,
  params: ProvisionSorBoundCoreRecordParams,
): Promise<number> {
  const objectType = canonicalizeObjectType(params.objectType);

  switch (objectType) {
    case 'customer':
      return provisionCustomerCore(manager, params);
    case 'resource':
      return provisionResourceCore(manager, params);
    default:
      throw new RpcException(
        `create_on_enter provisioning is not implemented for sor_bound object type "${params.objectType}"; use use_existing with subject/context coreId or a supported type (customer, resource).`,
      );
  }
}

async function provisionCustomerCore(
  manager: EntityManager,
  params: ProvisionSorBoundCoreRecordParams,
): Promise<number> {
  const context = params.context ?? {};
  const emailFromContext = readNonEmptyString(
    context.customerEmail ?? context.customer_email,
  );
  const email =
    emailFromContext ??
    `process.${params.processInstanceId}.${params.stepObjectInstanceId}.${Date.now()}@provision.six1.internal`;

  const nameFromContext = readNonEmptyString(
    context.customerName ?? context.customer_name,
  );
  let firstName: string | null = null;
  let lastName: string | null = null;
  if (nameFromContext) {
    const parts = nameFromContext.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  }

  const customer = manager.create(CustomerEntity, {
    email,
    password: await hash_content(randomBytes(24).toString('hex')),
    firstName,
    lastName,
    isProfileCompleted: false,
  });
  const saved = await manager.save(customer);

  await manager.save(
    manager.create(CustomerMetaEntity, {
      customerId: saved.customerId,
      metaJson: {
        provisionedByProcessInstanceId: params.processInstanceId,
        provisionedByStepObjectInstanceId: params.stepObjectInstanceId,
        ...(emailFromContext ? { signupEmail: emailFromContext } : {}),
        ...(nameFromContext ? { signupName: nameFromContext } : {}),
      },
    }),
  );

  return saved.customerId;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function provisionResourceCore(
  manager: EntityManager,
  params: ProvisionSorBoundCoreRecordParams,
): Promise<number> {
  if (!Number.isFinite(params.tenantId) || params.tenantId < 1) {
    throw new RpcException(
      'tenantId is required to provision a sor_bound resource on create_on_enter',
    );
  }

  const resource = manager.create(ResourceEntity, {
    name: `Process ${params.processInstanceId} resource`,
    type: 'equipment',
    tenantId: params.tenantId,
    isShared: 0,
  });
  const saved = await manager.save(resource);
  return saved.resourceId;
}
