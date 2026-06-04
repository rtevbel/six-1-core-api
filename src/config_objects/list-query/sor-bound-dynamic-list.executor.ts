import type { Type } from '@nestjs/common';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import type { ConfigObjectsService } from '../config_objects.service';
import type { ConfigObjectRunnerSchemaView } from '../interfaces/config-object-resolved-instance.interface';
import { appendRelatedExistsFilter } from './append-related-exists-filter';
import { appendParameterizedListFilterPredicate } from './append-parameterized-list-filter-predicate';
import { deniedCoreFieldKeysForObjectListCatalog } from '../list-field-catalog/list-field-catalog-core-deny.registry';
import { inferListFilterFieldTypeFromColumn } from './list-filter-field-type';

export type SorListFilterOperator = 'eq' | 'contains' | 'gte' | 'lte' | 'in';

export interface SorStructuredFilterClause {
  source: 'core' | 'meta' | 'related';
  relationshipKey?: string;
  field: string;
  operator: SorListFilterOperator;
  value: unknown;
}

/** Common list filter payload for SoR-backed configurable objects. */
export interface SorDynamicListFilters {
  search?: string;
  page?: number;
  limit?: number;
  tenantId?: number;
  sortBy?: string;
  sortOrder?: string;
  sortSource?: 'core' | 'meta';
  includeMeta?: boolean;
  filters?: SorStructuredFilterClause[];
}

export interface SorBoundDynamicListCatalogSets {
  core: Set<string>;
  meta: Set<string>;
  related: Map<string, Set<string>>;
  coreFieldTypes: Map<string, string>;
  metaFieldTypes: Map<string, string>;
  relatedFieldTypes: Map<string, Map<string, string>>;
}

export interface SorBoundMetaJoinConfig {
  entity: Type<object>;
  alias: string;
  joinConditionSql: string;
  /** When set (e.g. `meta` on {@link CustomerEntity}), uses `leftJoinAndMapOne`; otherwise `leftJoin` only. */
  mapOnePropertyPath?: string;
}

export interface SorBoundDynamicListContext<TRoot extends object> {
  repository: Repository<TRoot>;
  configObjectsService: ConfigObjectsService;
  /** Published config key, e.g. `project`, `task`. */
  canonicalObjectType: string;
  /** QueryBuilder root alias, e.g. `p`, `t`. */
  rootAlias: string;
  rootEntityClass: Type<object>;
  /** Usually same as `canonicalObjectType` for deny registry. */
  denyCatalogCanonicalType: string;

  meta?: SorBoundMetaJoinConfig;

  /** Entity property names scanned by `search` (must map to columns via metadata). */
  searchCorePropertyNames: readonly string[];

  fallbackCoreFields: Set<string>;
  /** Optional `p.field` expressions when not resolvable from metadata. */
  fallbackCoreColumnExpressions?: Record<string, string>;

  defaultSortCoreField: string;
  /** Second order column after meta sort or for stable ordering, e.g. `p.projectId`. */
  tieBreakOrderBySql: string;

  /** Resolve tenant for `getObjectListFieldCatalog` / `getObjectSchema`. */
  catalogTenantResolver: (filters: SorDynamicListFilters) => number | null;

  /** Mandatory scope: tenant, project, customerId, etc. */
  applyMandatoryScope: (
    qb: SelectQueryBuilder<TRoot>,
    filters: SorDynamicListFilters,
  ) => void;

  schemaMissingForRelatedFiltersMessage: string;

  /**
   * Extra LIKE targets when `filters.search` is set (joined columns).
   * Add any required `leftJoin`s on `qb`; return SQL expressions such as `'alias.column'`.
   */
  augmentSearchExpressions?: (
    qb: SelectQueryBuilder<TRoot>,
    filters: SorDynamicListFilters,
  ) => readonly string[];

  /**
   * Full SQL predicates OR'd with core/meta search (e.g. `EXISTS` on child tables).
   * Use `:_sorSearch` for the bound `%search%` value.
   */
  augmentSearchRawOrClauses?: (
    filters: SorDynamicListFilters,
  ) => readonly string[];

  /** Optional hydration (e.g. reload projects with nested relations after filtered id query). */
  hydrateRoots?: (
    roots: TRoot[],
    filters: SorDynamicListFilters,
  ) => Promise<TRoot[]>;

  /** Clamp page size like legacy APIs (projects/tasks used 10). */
  maxPageSize?: number;
}

function cloneCatalogSets(
  view: SorBoundDynamicListCatalogSets,
): SorBoundDynamicListCatalogSets {
  const related = new Map<string, Set<string>>();
  for (const [k, v] of view.related.entries()) {
    related.set(k, new Set(v));
  }
  const relatedFieldTypes = new Map<string, Map<string, string>>();
  for (const [k, v] of view.relatedFieldTypes.entries()) {
    relatedFieldTypes.set(k, new Map(v));
  }
  return {
    core: new Set(view.core),
    meta: new Set(view.meta),
    related,
    coreFieldTypes: new Map(view.coreFieldTypes),
    metaFieldTypes: new Map(view.metaFieldTypes),
    relatedFieldTypes,
  };
}

async function loadRuntimeCatalogSets(
  configObjectsService: ConfigObjectsService,
  tenantId: number | null,
  canonicalObjectType: string,
): Promise<SorBoundDynamicListCatalogSets> {
  const catalogView = await configObjectsService.getObjectListFieldCatalog({
    tenantId,
    objectType: canonicalObjectType,
  });

  const core = new Set<string>();
  const meta = new Set<string>();
  const related = new Map<string, Set<string>>();
  const coreFieldTypes = new Map<string, string>();
  const metaFieldTypes = new Map<string, string>();
  const relatedFieldTypes = new Map<string, Map<string, string>>();

  for (const entry of catalogView.fields) {
    if (entry.source === 'core') {
      core.add(entry.fieldKey);
      coreFieldTypes.set(entry.fieldKey, entry.fieldType);
    } else if (entry.source === 'meta') {
      meta.add(entry.fieldKey);
      metaFieldTypes.set(entry.fieldKey, entry.fieldType);
    } else if (entry.source === 'related' && entry.relationshipKey) {
      const bucket = related.get(entry.relationshipKey) ?? new Set<string>();
      bucket.add(entry.fieldKey);
      related.set(entry.relationshipKey, bucket);
      const typeBucket =
        relatedFieldTypes.get(entry.relationshipKey) ?? new Map<string, string>();
      typeBucket.set(entry.fieldKey, entry.fieldType);
      relatedFieldTypes.set(entry.relationshipKey, typeBucket);
    }
  }

  return {
    core,
    meta,
    related,
    coreFieldTypes,
    metaFieldTypes,
    relatedFieldTypes,
  };
}

function resolveCoreFilterFieldType<TRoot extends object>(
  repository: Repository<TRoot>,
  catalog: SorBoundDynamicListCatalogSets,
  fieldKey: string,
): string | undefined {
  const fromCatalog = catalog.coreFieldTypes.get(fieldKey);
  if (fromCatalog) {
    return fromCatalog;
  }
  const col = repository.metadata.findColumnWithPropertyName(fieldKey);
  return inferListFilterFieldTypeFromColumn(col ?? null);
}

function shouldIncludeMetaJoin(
  filters: SorDynamicListFilters,
  metaKeys: Set<string>,
): boolean {
  if (filters.includeMeta) {
    return true;
  }
  if (filters.sortSource === 'meta') {
    return true;
  }
  if ((filters.filters ?? []).some((f) => f.source === 'meta')) {
    return true;
  }
  const trimmed = filters.search?.trim();
  return Boolean(trimmed && metaKeys.size > 0);
}

function resolveCoreSqlExpression<TRoot extends object>(
  repository: Repository<TRoot>,
  rootAlias: string,
  fieldKey: string,
  fallbackMap: Record<string, string>,
): string {
  const col = repository.metadata.findColumnWithPropertyName(fieldKey);
  if (col) {
    return `${rootAlias}.${col.propertyName}`;
  }
  const fb = fallbackMap[fieldKey];
  if (fb) {
    return fb;
  }
  throw new RpcException(`Unsupported core field: ${fieldKey}`);
}

function applySearchCoreAndMeta(
  qb: SelectQueryBuilder<object>,
  filters: SorDynamicListFilters,
  includeMeta: boolean,
  metaKeys: Set<string>,
  searchColumnExpressions: readonly string[],
  metaAlias: string | undefined,
  rawOrClauses: readonly string[] = [],
): void {
  const search = filters.search?.trim();
  if (!search) {
    return;
  }

  const sortedMetaKeys =
    includeMeta && metaKeys.size && metaAlias ? [...metaKeys].sort() : [];

  if (
    !searchColumnExpressions.length &&
    !sortedMetaKeys.length &&
    !rawOrClauses.length
  ) {
    return;
  }

  for (let i = 0; i < sortedMetaKeys.length; i++) {
    qb.setParameter(`searchMetaPath_${i}`, `$.${sortedMetaKeys[i]}`);
  }

  const searchBind = { _sorSearch: `%${search}%` };

  qb.andWhere(
    new Brackets((wb) => {
      let wroteFirst = false;
      const addClause = (sql: string) => {
        if (!wroteFirst) {
          wb.where(sql, searchBind);
          wroteFirst = true;
        } else {
          wb.orWhere(sql, searchBind);
        }
      };

      for (const expr of searchColumnExpressions) {
        addClause(`LOWER(${expr}) LIKE LOWER(:_sorSearch)`);
      }
      for (const sql of rawOrClauses) {
        addClause(sql);
      }
      for (let i = 0; i < sortedMetaKeys.length; i++) {
        const pathParam = `searchMetaPath_${i}`;
        addClause(
          `LOWER(JSON_UNQUOTE(JSON_EXTRACT(${metaAlias}.metaJson, :${pathParam}))) LIKE LOWER(:_sorSearch)`,
        );
      }
    }),
  );
}

function applyStructuredFilters<TRoot extends object>(
  qb: SelectQueryBuilder<TRoot>,
  repository: Repository<TRoot>,
  filters: SorDynamicListFilters,
  includeMeta: boolean,
  catalog: SorBoundDynamicListCatalogSets,
  runnerSchema: ConfigObjectRunnerSchemaView | null,
  rootAlias: string,
  rootEntityClass: Type<object>,
  metaAlias: string | undefined,
  fallbackMap: Record<string, string>,
): void {
  const list = filters.filters ?? [];
  for (const [index, filter] of list.entries()) {
    if (filter.source === 'related') {
      const rk = filter.relationshipKey;
      if (
        typeof rk !== 'string' ||
        !catalog.related.get(rk)?.has(filter.field)
      ) {
        throw new RpcException(
          `Unsupported related filter (${rk ?? 'unset'}, ${filter.field}).`,
        );
      }
      const rel =
        runnerSchema?.relations?.find((r) => r.relationshipKey === rk) ?? null;
      if (!rel) {
        throw new RpcException(`Unknown relationship "${rk}" for filtering.`);
      }
      appendRelatedExistsFilter(repository.manager.connection, qb, {
        rootEntityClass,
        rootAlias,
        rel,
        filter: {
          fieldKey: filter.field,
          operator: filter.operator,
          value: filter.value,
        },
        paramNamespace: `rel_${index}`,
      });
      continue;
    }
    if (filter.source === 'core') {
      if (!catalog.core.has(filter.field)) {
        throw new RpcException(
          `Unsupported core filter field: ${filter.field}`,
        );
      }
      const expr = resolveCoreSqlExpression(
        repository,
        rootAlias,
        filter.field,
        fallbackMap,
      );
      appendParameterizedListFilterPredicate(
        qb as SelectQueryBuilder<object>,
        expr,
        {
          operator: filter.operator,
          value: filter.value,
          logicalField: filter.field,
          fieldType: resolveCoreFilterFieldType(repository, catalog, filter.field),
        },
        `core_${index}`,
      );
      continue;
    }
    if (!includeMeta || !metaAlias) {
      throw new RpcException(
        'Meta filters require a meta row join for this list query.',
      );
    }
    if (
      !catalog.meta.has(filter.field) ||
      !/^[A-Za-z0-9_]+$/.test(filter.field)
    ) {
      throw new RpcException(`Unsupported meta filter field: ${filter.field}`);
    }
    const expression = `JSON_UNQUOTE(JSON_EXTRACT(${metaAlias}.metaJson, :metaPath_${index}))`;
    qb.setParameter(`metaPath_${index}`, `$.${filter.field}`);
    appendParameterizedListFilterPredicate(
      qb as SelectQueryBuilder<object>,
      expression,
      {
        operator: filter.operator,
        value: filter.value,
        logicalField: filter.field,
        fieldType: catalog.metaFieldTypes.get(filter.field),
      },
      `meta_${index}`,
    );
  }
}

function applySorting<TRoot extends object>(
  qb: SelectQueryBuilder<TRoot>,
  filters: SorDynamicListFilters,
  includeMeta: boolean,
  catalog: SorBoundDynamicListCatalogSets,
  repository: Repository<TRoot>,
  rootAlias: string,
  defaultSortCoreField: string,
  tieBreakOrderBySql: string,
  metaAlias: string | undefined,
  fallbackMap: Record<string, string>,
): void {
  const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = filters.sortBy ?? defaultSortCoreField;

  if (filters.sortSource === 'meta') {
    if (!includeMeta || !metaAlias) {
      throw new RpcException(
        'Meta sorting requires a meta row join for this list query.',
      );
    }
    if (!/^[A-Za-z0-9_]+$/.test(sortBy)) {
      throw new RpcException(`Unsupported meta sort field: ${sortBy}`);
    }
    if (!catalog.meta.has(sortBy)) {
      throw new RpcException(`Unsupported meta sort field: ${sortBy}`);
    }
    qb.addOrderBy(
      `JSON_UNQUOTE(JSON_EXTRACT(${metaAlias}.metaJson, :sortMetaPath))`,
      sortOrder,
    );
    qb.setParameter('sortMetaPath', `$.${sortBy}`);
    qb.addOrderBy(tieBreakOrderBySql, 'DESC');
    return;
  }

  if (!catalog.core.has(sortBy)) {
    throw new RpcException(`Unsupported core sort field: ${sortBy}`);
  }

  const expr = resolveCoreSqlExpression(
    repository,
    rootAlias,
    sortBy,
    fallbackMap,
  );
  qb.addOrderBy(expr, sortOrder);
}

function applyPagination<TRoot extends object>(
  qb: SelectQueryBuilder<TRoot>,
  filters: SorDynamicListFilters,
  maxPageSize?: number,
): void {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  let limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  if (typeof maxPageSize === 'number' && maxPageSize > 0) {
    limit = Math.min(limit, maxPageSize);
  }
  qb.take(limit);
  qb.skip((page - 1) * limit);
}

/**
 * Shared dynamic list query for SoR-bound configurable objects (catalog allowlists, meta join, related EXISTS).
 */
export async function executeSorBoundDynamicListQuery<TRoot extends object>(
  ctx: SorBoundDynamicListContext<TRoot>,
  filters: SorDynamicListFilters,
): Promise<{ rows: TRoot[]; total: number }> {
  const effectiveTenantId = ctx.catalogTenantResolver(filters);
  const hasRelated = (filters.filters ?? []).some(
    (f) => f.source === 'related',
  );

  const catalog = await loadRuntimeCatalogSets(
    ctx.configObjectsService,
    effectiveTenantId,
    ctx.canonicalObjectType,
  );

  const deniedCore = deniedCoreFieldKeysForObjectListCatalog(
    ctx.denyCatalogCanonicalType,
  );

  if (!catalog.core.size) {
    for (const k of ctx.fallbackCoreFields) {
      if (!deniedCore.has(k)) {
        catalog.core.add(k);
      }
    }
  }

  const runnerSchema = hasRelated
    ? await ctx.configObjectsService.getObjectSchema(
        effectiveTenantId,
        ctx.canonicalObjectType,
      )
    : null;

  if (hasRelated && !runnerSchema) {
    throw new RpcException(ctx.schemaMissingForRelatedFiltersMessage);
  }

  const metaAlias = ctx.meta?.alias;
  const includeMeta = shouldIncludeMetaJoin(filters, catalog.meta);

  const qb = ctx.repository.createQueryBuilder(ctx.rootAlias);
  ctx.applyMandatoryScope(qb, filters);

  if (includeMeta && ctx.meta) {
    if (ctx.meta.mapOnePropertyPath) {
      qb.leftJoinAndMapOne(
        `${ctx.rootAlias}.${ctx.meta.mapOnePropertyPath}`,
        ctx.meta.entity,
        ctx.meta.alias,
        ctx.meta.joinConditionSql,
      );
    } else {
      qb.leftJoin(ctx.meta.entity, ctx.meta.alias, ctx.meta.joinConditionSql);
    }
  }

  const searchExprs: string[] = [];
  for (const prop of ctx.searchCorePropertyNames) {
    const col = ctx.repository.metadata.findColumnWithPropertyName(prop);
    if (col) {
      searchExprs.push(`${ctx.rootAlias}.${col.propertyName}`);
    }
  }

  const augmentedMain =
    filters.search?.trim() && ctx.augmentSearchExpressions
      ? ctx.augmentSearchExpressions(qb, filters)
      : [];

  const rawSearchOrClauses =
    filters.search?.trim() && ctx.augmentSearchRawOrClauses
      ? ctx.augmentSearchRawOrClauses(filters)
      : [];

  const mergedSearchExprs = [...searchExprs, ...augmentedMain];

  const fallbackMap = ctx.fallbackCoreColumnExpressions ?? {};

  applySearchCoreAndMeta(
    qb as SelectQueryBuilder<object>,
    filters,
    includeMeta,
    catalog.meta,
    mergedSearchExprs,
    includeMeta ? metaAlias : undefined,
    rawSearchOrClauses,
  );

  applyStructuredFilters(
    qb,
    ctx.repository,
    filters,
    includeMeta,
    catalog,
    runnerSchema,
    ctx.rootAlias,
    ctx.rootEntityClass,
    includeMeta ? metaAlias : undefined,
    fallbackMap,
  );

  applySorting(
    qb,
    filters,
    includeMeta,
    catalog,
    ctx.repository,
    ctx.rootAlias,
    ctx.defaultSortCoreField,
    ctx.tieBreakOrderBySql,
    includeMeta ? metaAlias : undefined,
    fallbackMap,
  );

  applyPagination(qb, filters, ctx.maxPageSize);

  const catalogForCount = cloneCatalogSets(catalog);
  const qbCount = ctx.repository.createQueryBuilder(ctx.rootAlias);
  ctx.applyMandatoryScope(qbCount, filters);
  if (includeMeta && ctx.meta) {
    qbCount.leftJoin(
      ctx.meta.entity,
      ctx.meta.alias,
      ctx.meta.joinConditionSql,
    );
  }

  const augmentedCount =
    filters.search?.trim() && ctx.augmentSearchExpressions
      ? ctx.augmentSearchExpressions(qbCount, filters)
      : [];
  const rawCountSearchOrClauses =
    filters.search?.trim() && ctx.augmentSearchRawOrClauses
      ? ctx.augmentSearchRawOrClauses(filters)
      : [];
  const mergedCountSearchExprs = [...searchExprs, ...augmentedCount];

  applySearchCoreAndMeta(
    qbCount as SelectQueryBuilder<object>,
    filters,
    includeMeta,
    catalogForCount.meta,
    mergedCountSearchExprs,
    includeMeta ? metaAlias : undefined,
    rawCountSearchOrClauses,
  );
  applyStructuredFilters(
    qbCount,
    ctx.repository,
    filters,
    includeMeta,
    catalogForCount,
    runnerSchema,
    ctx.rootAlias,
    ctx.rootEntityClass,
    includeMeta ? metaAlias : undefined,
    fallbackMap,
  );

  const total = await qbCount.getCount();
  let rows = await qb.getMany();

  if (ctx.hydrateRoots) {
    rows = await ctx.hydrateRoots(rows, filters);
  }

  return { rows, total };
}

/** Alias: catalog-backed lists (SoR-bound or `system_table`) share this executor. */
export type CatalogBackedDynamicListContext<TRoot extends object> =
  SorBoundDynamicListContext<TRoot>;

export async function executeCatalogBackedDynamicListQuery<
  TRoot extends object,
>(
  ctx: SorBoundDynamicListContext<TRoot>,
  filters: SorDynamicListFilters,
): Promise<{ rows: TRoot[]; total: number }> {
  return executeSorBoundDynamicListQuery(ctx, filters);
}
