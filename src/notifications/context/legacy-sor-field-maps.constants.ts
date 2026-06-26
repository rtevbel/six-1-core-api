/**
 * Legacy flat template key → config object `entity.fields` key (NV6.3).
 */
export const LEGACY_SOR_ENTITY_FIELD_MAPS: Record<
  string,
  Record<string, string>
> = {
  project: {
    projectId: 'projectId',
    projectName: 'name',
    projectIdentifier: 'projectIdentifier',
  },
  task: {
    taskId: 'taskId',
    taskName: 'name',
    taskIdentifier: 'taskIdentifier',
    projectId: 'projectId',
    priority: 'priority',
  },
  customer: {
    customerId: 'customerId',
    customerName: 'companyName',
    companyName: 'companyName',
  },
};

/** After hydrating `sourceObjectType`, hydrate related sor_bound objects when an id field is set. */
export const LEGACY_SOR_RELATED_OBJECT_HYDRATIONS: ReadonlyArray<{
  sourceObjectType: string;
  relatedObjectType: string;
  idFieldKey: string;
}> = [{ sourceObjectType: 'task', relatedObjectType: 'project', idFieldKey: 'projectId' }];

/** Legacy flat URL keys populated when a sor_bound object is hydrated. */
export const LEGACY_OBJECT_URL_FLAT_KEYS: Record<string, string> = {
  project: 'projectUrl',
  task: 'taskUrl',
};

export const LEGACY_SOR_ENTITY_TYPES = new Set(
  Object.keys(LEGACY_SOR_ENTITY_FIELD_MAPS),
);
