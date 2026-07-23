import { RpcException } from '@nestjs/microservices';
import { SystemSettingValueType } from './constants';
import { SystemSettingConstraints } from './interfaces/setting-constraints.interface';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

/**
 * Validates and lightly coerces a setting value against its type + constraints.
 */
export function validateSettingValue(
  valueType: SystemSettingValueType,
  value: unknown,
  constraints?: SystemSettingConstraints | null,
): unknown {
  const c = constraints ?? {};

  switch (valueType) {
    case 'string':
    case 'url':
    case 'email':
    case 'secret':
    case 'datetime':
    case 'duration':
      return validateStringLike(valueType, value, c);
    case 'number':
      return validateNumber(value, c);
    case 'boolean':
      return validateBoolean(value);
    case 'enum':
      return validateEnum(value, c);
    case 'json':
      if (value === undefined) {
        throw new RpcException('json value is required.');
      }
      return value;
    case 'string_array':
      return validateStringArray(value, c);
    case 'number_array':
      return validateNumberArray(value, c);
    default:
      throw new RpcException(`Unsupported value type: ${valueType as string}`);
  }
}

function validateStringLike(
  valueType: SystemSettingValueType,
  value: unknown,
  c: SystemSettingConstraints,
): string | number {
  if (valueType === 'duration' && typeof value === 'number') {
    return validateNumber(value, c);
  }
  if (typeof value !== 'string') {
    throw new RpcException(`Expected string for type ${valueType}.`);
  }
  if (typeof c.minLength === 'number' && value.length < c.minLength) {
    throw new RpcException(`Value shorter than minLength ${c.minLength}.`);
  }
  if (typeof c.maxLength === 'number' && value.length > c.maxLength) {
    throw new RpcException(`Value longer than maxLength ${c.maxLength}.`);
  }
  if (typeof c.pattern === 'string') {
    const re = new RegExp(c.pattern);
    if (!re.test(value)) {
      throw new RpcException('Value does not match required pattern.');
    }
  }
  if (valueType === 'email' && !EMAIL_RE.test(value)) {
    throw new RpcException('Invalid email format.');
  }
  if (valueType === 'url' && !URL_RE.test(value)) {
    throw new RpcException('Invalid URL format (expected http/https).');
  }
  if (valueType === 'datetime') {
    const t = Date.parse(value);
    if (Number.isNaN(t)) {
      throw new RpcException('Invalid datetime (expected ISO-8601 string).');
    }
  }
  if (valueType === 'duration') {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new RpcException('Invalid duration (expected numeric seconds).');
    }
    return validateNumber(n, c);
  }
  return value;
}

function validateNumber(
  value: unknown,
  c: SystemSettingConstraints,
): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new RpcException('Expected a finite number.');
  }
  if (typeof c.min === 'number' && n < c.min) {
    throw new RpcException(`Value below minimum ${c.min}.`);
  }
  if (typeof c.max === 'number' && n > c.max) {
    throw new RpcException(`Value above maximum ${c.max}.`);
  }
  return n;
}

function validateBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === 'false' || value === 0 || value === '0') {
    return false;
  }
  throw new RpcException('Expected a boolean.');
}

function validateEnum(
  value: unknown,
  c: SystemSettingConstraints,
): string | number {
  const allowed = c.allowedValues;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw new RpcException('enum type requires constraints.allowedValues.');
  }
  if (!allowed.includes(value as string | number)) {
    throw new RpcException('Value is not in allowedValues.');
  }
  return value as string | number;
}

function validateStringArray(
  value: unknown,
  c: SystemSettingConstraints,
): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new RpcException('Expected string[].');
  }
  if (typeof c.maxLength === 'number' && value.length > c.maxLength) {
    throw new RpcException(`Array longer than maxLength ${c.maxLength}.`);
  }
  return value;
}

function validateNumberArray(
  value: unknown,
  c: SystemSettingConstraints,
): number[] {
  if (
    !Array.isArray(value) ||
    !value.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    throw new RpcException('Expected number[].');
  }
  if (typeof c.maxLength === 'number' && value.length > c.maxLength) {
    throw new RpcException(`Array longer than maxLength ${c.maxLength}.`);
  }
  return value;
}
