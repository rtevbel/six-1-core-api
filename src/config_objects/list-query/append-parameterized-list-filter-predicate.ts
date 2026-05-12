import { RpcException } from '@nestjs/microservices';
import { SelectQueryBuilder } from 'typeorm';

export type ListFilterOperator = 'eq' | 'contains' | 'gte' | 'lte' | 'in';

/**
 * Appends a single operator clause on an expression (core column, JSON extract, or subquery alias field).
 * Parameter names must be unique per query.
 */
export function appendParameterizedListFilterPredicate(
  qb: SelectQueryBuilder<object>,
  expression: string,
  options: {
    operator: ListFilterOperator;
    value: unknown;
    /** Used in error messages for traceability. */
    logicalField?: string;
  },
  paramKey: string,
): void {
  const fieldLabel = options.logicalField ?? 'field';

  if (options.operator === 'eq') {
    qb.andWhere(`${expression} = :${paramKey}`, {
      [paramKey]: String(options.value),
    });
    return;
  }

  if (options.operator === 'contains') {
    qb.andWhere(`LOWER(${expression}) LIKE LOWER(:${paramKey})`, {
      [paramKey]: `%${String(options.value)}%`,
    });
    return;
  }

  if (options.operator === 'gte' || options.operator === 'lte') {
    const numericValue = Number(options.value);
    if (!Number.isFinite(numericValue)) {
      throw new RpcException(
        `Operator ${options.operator} requires numeric value for ${fieldLabel}`,
      );
    }
    const comparator = options.operator === 'gte' ? '>=' : '<=';
    qb.andWhere(
      `CAST(${expression} AS DECIMAL(20,6)) ${comparator} :${paramKey}`,
      {
        [paramKey]: numericValue,
      },
    );
    return;
  }

  if (options.operator === 'in') {
    const values = Array.isArray(options.value)
      ? options.value
      : String(options.value)
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
    if (!values.length) {
      throw new RpcException(
        `Operator in requires non-empty values for ${fieldLabel}`,
      );
    }
    qb.andWhere(`${expression} IN (:...${paramKey})`, {
      [paramKey]: values.map((entry) => String(entry)),
    });
    return;
  }

  throw new RpcException(`Unsupported operator: ${String(options.operator)}`);
}
