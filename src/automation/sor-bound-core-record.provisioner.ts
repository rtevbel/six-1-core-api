import { randomBytes } from 'crypto';
import type { EntityManager } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { CustomerMetaEntity } from '../customers/entities/customer_meta.entity';
import { ResourceEntity } from '../scheduler/entities/resource.entity';
import { canonicalizeObjectType } from '../config_objects/core-field-descriptor/object-type-entity.registry';

export interface ProvisionSorBoundCoreFromSaveParams {
  tenantId: number;
  objectType: string;
  processInstanceId: number;
  stepObjectInstanceId: number;
  context?: Record<string, unknown> | null;
  corePatch?: Record<string, unknown>;
  metaPatch?: Record<string, unknown>;
}

/**
 * Creates a SoR core row on first deferred save (not on step ready).
 * Uses submitted form patches plus optional process context bootstrap fields.
 */
export async function provisionSorBoundCoreRecordFromSave(
  manager: EntityManager,
  params: ProvisionSorBoundCoreFromSaveParams,
): Promise<number> {
  const objectType = canonicalizeObjectType(params.objectType);

  switch (objectType) {
    case 'customer':
      return provisionCustomerFromSave(manager, params);
    case 'resource':
      return provisionResourceFromSave(manager, params);
    default:
      throw new RpcException(
        `Deferred save provisioning is not implemented for sor_bound object type "${params.objectType}".`,
      );
  }
}

async function provisionCustomerFromSave(
  manager: EntityManager,
  params: ProvisionSorBoundCoreFromSaveParams,
): Promise<number> {
  const context = params.context ?? {};
  const corePatch = params.corePatch ?? {};
  const metaPatch = params.metaPatch ?? {};

  const email =
    readNonEmptyString(corePatch.email) ??
    readNonEmptyString(context.customerEmail ?? context.customer_email);

  if (!email) {
    throw new RpcException(
      'Customer email is required to create a sor_bound customer on first save.',
    );
  }

  const nameFromContext = readNonEmptyString(
    context.customerName ?? context.customer_name,
  );
  let firstName = readNonEmptyString(corePatch.firstName);
  let lastName = readNonEmptyString(corePatch.lastName);
  if (!firstName && nameFromContext) {
    const parts = nameFromContext.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = lastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : null);
  }

  const plainPassword = readNonEmptyString(corePatch.password);

  const customer = manager.create(CustomerEntity, {
    email,
    password: plainPassword ?? randomBytes(24).toString('hex'),
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    isProfileCompleted: Boolean(corePatch.isProfileCompleted ?? false),
  });
  const saved = await manager.save(customer);

  const metaJson: Record<string, unknown> = {
    ...metaPatch,
    provisionedByProcessInstanceId: params.processInstanceId,
    provisionedByStepObjectInstanceId: params.stepObjectInstanceId,
  };

  await manager.save(
    manager.create(CustomerMetaEntity, {
      customerId: saved.customerId,
      metaJson,
    }),
  );

  return saved.customerId;
}

async function provisionResourceFromSave(
  manager: EntityManager,
  params: ProvisionSorBoundCoreFromSaveParams,
): Promise<number> {
  if (!Number.isFinite(params.tenantId) || params.tenantId < 1) {
    throw new RpcException(
      'tenantId is required to provision a sor_bound resource on first save.',
    );
  }

  const corePatch = params.corePatch ?? {};
  const name =
    readNonEmptyString(corePatch.name) ??
    `Process ${params.processInstanceId} resource`;

  const resource = manager.create(ResourceEntity, {
    name,
    type: parseResourceType(corePatch.type),
    tenantId: params.tenantId,
    isShared: 0,
  });
  const saved = await manager.save(resource);
  return saved.resourceId;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseResourceType(value: unknown): 'equipment' | 'human' {
  const raw = readNonEmptyString(value);
  return raw === 'human' ? 'human' : 'equipment';
}
