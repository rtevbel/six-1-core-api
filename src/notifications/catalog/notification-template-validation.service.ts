import { Injectable } from '@nestjs/common';
import { pathStartsWith } from '../context/notification-context-path.util';
import { getLegacyTemplateAliasKeys } from '../template-engine/notification-legacy-context-shim.util';
import { extractTemplatePathsFromMany } from '../template-engine/template-ast-path-extractor';
import type { NotificationVariableCatalogEntry } from '../context/notification-namespace.manifest';
import {
  NotificationVariableCatalogService,
  type CatalogBuildOptions,
} from './notification-variable-catalog.service';
import type { TemplatePathValidationResult } from './interfaces/template-path-validation-result.interface';

const DYNAMIC_KNOWN_PREFIXES = [
  'entity.fields',
  'entity.relations',
  'workflow.context',
  'payload',
] as const;

@Injectable()
export class NotificationTemplateValidationService {
  constructor(
    private readonly catalogService: NotificationVariableCatalogService,
  ) {}

  async validateTemplates(
    subject: string | null | undefined,
    message: string,
    catalogOptions: CatalogBuildOptions,
  ): Promise<TemplatePathValidationResult> {
    const referencedPaths = extractTemplatePathsFromMany([subject, message]);
    const catalog = await this.catalogService.buildCatalog(catalogOptions);
    const unknownPaths = this.findUnknownPaths(referencedPaths, catalog.entries);
    return { referencedPaths, unknownPaths };
  }

  findUnknownPaths(
    referencedPaths: string[],
    catalogEntries: NotificationVariableCatalogEntry[],
  ): string[] {
    const knownPaths = new Set(catalogEntries.map((entry) => entry.path));
    const legacyKeys = new Set(getLegacyTemplateAliasKeys());

    return referencedPaths.filter((path) => {
      if (knownPaths.has(path) || legacyKeys.has(path)) {
        return false;
      }

      return !DYNAMIC_KNOWN_PREFIXES.some((prefix) =>
        pathStartsWith(path, prefix),
      );
    });
  }
}
