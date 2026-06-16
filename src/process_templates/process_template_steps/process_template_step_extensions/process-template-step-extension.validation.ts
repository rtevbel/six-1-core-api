import { RpcException } from '@nestjs/microservices';
import type { ProcessTemplateStepExtensionView } from './process-template-step-extension.types';

const PERMISSION_KEY_PATTERN = /^[A-Za-z0-9_.]+$/;

function assertPlainObject(
  value: unknown,
  field: string,
): value is Record<string, unknown> {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new RpcException(`${field} must be a JSON object.`);
  }
  return true;
}

function assertUiExtension(ui: unknown): void {
  if (ui === null || ui === undefined) {
    return;
  }
  if (typeof ui !== 'object' || Array.isArray(ui)) {
    throw new RpcException('ui must be a JSON object.');
  }
  const record = ui as Record<string, unknown>;
  for (const key of ['icon', 'color', 'helpText', 'groupName']) {
    const value = record[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value !== 'string') {
      throw new RpcException(`ui.${key} must be a string.`);
    }
    if (value.length > 256) {
      throw new RpcException(`ui.${key} exceeds max length 256.`);
    }
  }
}

function assertRequiredPermissions(values: unknown): void {
  if (values === null || values === undefined) {
    return;
  }
  if (!Array.isArray(values)) {
    throw new RpcException('requiredPermissions must be an array of strings.');
  }
  if (values.length > 20) {
    throw new RpcException('requiredPermissions supports at most 20 entries.');
  }
  for (const entry of values) {
    if (typeof entry !== 'string' || !PERMISSION_KEY_PATTERN.test(entry)) {
      throw new RpcException(
        'requiredPermissions entries must match /^[A-Za-z0-9_.]+$/ and be <= 128 chars.',
      );
    }
    if (entry.length > 128) {
      throw new RpcException('requiredPermissions entry exceeds max length 128.');
    }
  }
}

/**
 * Normalizes and validates step extension payloads for authoring APIs.
 */
export function parseProcessTemplateStepExtension(
  raw: unknown,
): ProcessTemplateStepExtensionView {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new RpcException('extensions payload must be a JSON object.');
  }

  const input = raw as Record<string, unknown>;
  const extensions: ProcessTemplateStepExtensionView = {};

  if ('visibleWhen' in input) {
    assertPlainObject(input.visibleWhen, 'visibleWhen');
    extensions.visibleWhen =
      input.visibleWhen === null || input.visibleWhen === undefined
        ? null
        : { ...(input.visibleWhen as Record<string, unknown>) };
  }

  if ('autoAdvanceWhen' in input) {
    assertPlainObject(input.autoAdvanceWhen, 'autoAdvanceWhen');
    extensions.autoAdvanceWhen =
      input.autoAdvanceWhen === null || input.autoAdvanceWhen === undefined
        ? null
        : { ...(input.autoAdvanceWhen as Record<string, unknown>) };
  }

  if ('allowSkip' in input) {
    if (typeof input.allowSkip !== 'boolean') {
      throw new RpcException('allowSkip must be a boolean.');
    }
    extensions.allowSkip = input.allowSkip;
  }

  if ('parallelGroupId' in input) {
    if (input.parallelGroupId === null) {
      extensions.parallelGroupId = null;
    } else if (typeof input.parallelGroupId === 'string') {
      const trimmed = input.parallelGroupId.trim();
      if (trimmed.length > 64) {
        throw new RpcException('parallelGroupId exceeds max length 64.');
      }
      extensions.parallelGroupId = trimmed.length ? trimmed : null;
    } else {
      throw new RpcException('parallelGroupId must be a string or null.');
    }
  }

  if ('ui' in input) {
    assertUiExtension(input.ui);
    extensions.ui =
      input.ui === null || input.ui === undefined
        ? null
        : { ...(input.ui as ProcessTemplateStepExtensionView['ui']) };
  }

  if ('requiredPermissions' in input) {
    assertRequiredPermissions(input.requiredPermissions);
    extensions.requiredPermissions =
      input.requiredPermissions === null ||
      input.requiredPermissions === undefined
        ? null
        : [...(input.requiredPermissions as string[])];
  }

  return extensions;
}

export function mergeStepExtensionJson(
  current: Record<string, unknown> | null | undefined,
  patch: ProcessTemplateStepExtensionView,
): Record<string, unknown> {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...current }
      : {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      delete base[key];
      continue;
    }
    base[key] = value;
  }

  return base;
}

export function readStepExtensionView(
  stepExtensionsJson: Record<string, unknown> | null | undefined,
  requiredPermissions: string[] | null | undefined,
): ProcessTemplateStepExtensionView {
  const raw =
    stepExtensionsJson &&
    typeof stepExtensionsJson === 'object' &&
    !Array.isArray(stepExtensionsJson)
      ? stepExtensionsJson
      : {};

  return {
    visibleWhen:
      raw.visibleWhen && typeof raw.visibleWhen === 'object'
        ? (raw.visibleWhen as Record<string, unknown>)
        : null,
    autoAdvanceWhen:
      raw.autoAdvanceWhen && typeof raw.autoAdvanceWhen === 'object'
        ? (raw.autoAdvanceWhen as Record<string, unknown>)
        : null,
    allowSkip:
      typeof raw.allowSkip === 'boolean' ? raw.allowSkip : undefined,
    parallelGroupId:
      typeof raw.parallelGroupId === 'string' ? raw.parallelGroupId : null,
    ui:
      raw.ui && typeof raw.ui === 'object' && !Array.isArray(raw.ui)
        ? (raw.ui as ProcessTemplateStepExtensionView['ui'])
        : null,
    requiredPermissions: requiredPermissions ?? null,
  };
}
