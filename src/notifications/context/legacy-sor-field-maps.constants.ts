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

export const LEGACY_SOR_ENTITY_TYPES = new Set(
  Object.keys(LEGACY_SOR_ENTITY_FIELD_MAPS),
);
