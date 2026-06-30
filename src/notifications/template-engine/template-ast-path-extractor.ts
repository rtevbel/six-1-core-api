import Handlebars from 'handlebars';
import { NOTIFICATION_HANDLEBARS_HELPERS } from './handlebars-helpers.registry';

type HbsNode = { type: string };
type HbsPathExpression = HbsNode & {
  type: 'PathExpression';
  original?: string;
  parts?: unknown[];
};

const BUILTIN_CONDITIONAL_BLOCK_HELPERS = new Set(['if', 'unless', 'each', 'with']);

const BUILTIN_BLOCK_HELPERS = new Set([
  'if',
  'unless',
  'each',
  'with',
  'lookup',
  'log',
]);

export interface ExtractedTemplatePaths {
  /** Every dot-path referenced anywhere in the template (for lazy hydration). */
  all: string[];
  /** Dot-paths referenced outside conditional blocks (for send validation). */
  required: string[];
}

function isPathExpression(
  node: unknown,
): node is HbsPathExpression {
  return (
    !!node &&
    typeof node === 'object' &&
    (node as HbsNode).type === 'PathExpression'
  );
}

function addPath(
  paths: Set<string>,
  path: HbsPathExpression,
  include: boolean,
): void {
  if (!include) {
    return;
  }

  const original = typeof path.original === 'string' ? path.original : '';
  if (!original || original === '.' || original === 'this') {
    return;
  }
  paths.add(original);
}

function walkExpression(
  expression: unknown,
  allPaths: Set<string>,
  requiredPaths: Set<string>,
  conditionalDepth: number,
): void {
  if (isPathExpression(expression)) {
    addPath(allPaths, expression, true);
    addPath(requiredPaths, expression, conditionalDepth === 0);
    return;
  }

  if (
    expression &&
    typeof expression === 'object' &&
    (expression as HbsNode).type === 'SubExpression'
  ) {
    const params = (expression as { params?: unknown }).params;
    if (Array.isArray(params)) {
      for (const param of params) {
        walkExpression(param, allPaths, requiredPaths, conditionalDepth);
      }
    }
  }
}

function walkParams(
  params: unknown,
  allPaths: Set<string>,
  requiredPaths: Set<string>,
  conditionalDepth: number,
  includeRequired = conditionalDepth === 0,
): void {
  if (!Array.isArray(params)) {
    return;
  }
  for (const param of params) {
    if (isPathExpression(param)) {
      addPath(allPaths, param, true);
      addPath(requiredPaths, param, includeRequired);
      continue;
    }
    walkExpression(param, allPaths, requiredPaths, conditionalDepth);
  }
}

function walkStatement(
  statement: unknown,
  allPaths: Set<string>,
  requiredPaths: Set<string>,
  conditionalDepth: number,
): void {
  if (!statement || typeof statement !== 'object') {
    return;
  }

  const typed = statement as Record<string, unknown> & HbsNode;
  switch (typed.type) {
    case 'MustacheStatement':
      if (
        isPathExpression(typed.path) &&
        Array.isArray((typed.path as HbsPathExpression).parts) &&
        !NOTIFICATION_HANDLEBARS_HELPERS.includes(
          String((typed.path as HbsPathExpression).parts?.[0]) as (typeof NOTIFICATION_HANDLEBARS_HELPERS)[number],
        ) &&
        !BUILTIN_BLOCK_HELPERS.has(String((typed.path as HbsPathExpression).parts?.[0]))
      ) {
        addPath(allPaths, typed.path as HbsPathExpression, true);
        addPath(
          requiredPaths,
          typed.path as HbsPathExpression,
          conditionalDepth === 0,
        );
      } else {
        walkParams(typed.params, allPaths, requiredPaths, conditionalDepth);
      }
      if (typed.hash && typeof typed.hash === 'object') {
        const pairs = (typed.hash as { pairs?: unknown }).pairs;
        if (Array.isArray(pairs)) {
          for (const pair of pairs) {
            walkExpression(
              (pair as { value?: unknown }).value,
              allPaths,
              requiredPaths,
              conditionalDepth,
            );
          }
        } else if (pairs && typeof pairs === 'object') {
          for (const pair of Object.values(pairs as Record<string, unknown>)) {
            const value =
              pair && typeof pair === 'object' && 'value' in pair
                ? (pair as { value?: unknown }).value
                : pair;
            walkExpression(value, allPaths, requiredPaths, conditionalDepth);
          }
        }
      }
      break;
    case 'BlockStatement':
      if (isPathExpression(typed.path) && Array.isArray((typed.path as HbsPathExpression).parts)) {
        const helperName = String((typed.path as HbsPathExpression).parts?.[0]);
        if (
          NOTIFICATION_HANDLEBARS_HELPERS.includes(
            helperName as (typeof NOTIFICATION_HANDLEBARS_HELPERS)[number],
          )
        ) {
          walkParams(typed.params, allPaths, requiredPaths, conditionalDepth);
        } else if (!BUILTIN_BLOCK_HELPERS.has(helperName)) {
          addPath(allPaths, typed.path as HbsPathExpression, true);
          addPath(
            requiredPaths,
            typed.path as HbsPathExpression,
            conditionalDepth === 0,
          );
        } else if (BUILTIN_CONDITIONAL_BLOCK_HELPERS.has(helperName)) {
          walkParams(typed.params, allPaths, requiredPaths, conditionalDepth, false);
        } else {
          walkParams(typed.params, allPaths, requiredPaths, conditionalDepth);
        }
      }
      walkProgram(typed.program, allPaths, requiredPaths, conditionalDepth + 1);
      if (typed.inverse) {
        walkProgram(typed.inverse, allPaths, requiredPaths, conditionalDepth + 1);
      }
      break;
    case 'PartialStatement':
      walkParams(typed.params, allPaths, requiredPaths, conditionalDepth);
      if (typed.program) {
        walkProgram(typed.program, allPaths, requiredPaths, conditionalDepth);
      }
      break;
    case 'ContentStatement':
    case 'CommentStatement':
      break;
    default:
      break;
  }
}

function walkProgram(
  program: unknown,
  allPaths: Set<string>,
  requiredPaths: Set<string>,
  conditionalDepth: number,
): void {
  if (!program || typeof program !== 'object') {
    return;
  }
  const body = (program as { body?: unknown }).body;
  if (!Array.isArray(body)) {
    return;
  }
  for (const statement of body) {
    walkStatement(statement, allPaths, requiredPaths, conditionalDepth);
  }
}

function sortPaths(paths: Set<string>): string[] {
  return Array.from(paths).sort((a, b) => a.localeCompare(b));
}

function extractPathsFromTemplate(template: string): ExtractedTemplatePaths {
  if (!template.trim()) {
    return { all: [], required: [] };
  }

  const allPaths = new Set<string>();
  const requiredPaths = new Set<string>();
  const ast = Handlebars.parse(template) as unknown;
  walkProgram(ast, allPaths, requiredPaths, 0);
  return {
    all: sortPaths(allPaths),
    required: sortPaths(requiredPaths),
  };
}

function mergeExtractedPaths(
  templates: Array<string | null | undefined>,
): ExtractedTemplatePaths {
  const allPaths = new Set<string>();
  const requiredPaths = new Set<string>();

  for (const template of templates) {
    if (!template) {
      continue;
    }
    const extracted = extractPathsFromTemplate(template);
    for (const path of extracted.all) {
      allPaths.add(path);
    }
    for (const path of extracted.required) {
      requiredPaths.add(path);
    }
  }

  return {
    all: sortPaths(allPaths),
    required: sortPaths(requiredPaths),
  };
}

/**
 * Extracts dot-path variable references from Handlebars templates.
 */
export function extractTemplatePaths(template: string): string[] {
  return extractPathsFromTemplate(template).all;
}

/**
 * Extracts dot-paths that must be present for notification send validation.
 * Paths referenced only inside `#if` / `#unless` / `#each` blocks are excluded.
 */
export function extractRequiredTemplatePaths(template: string): string[] {
  return extractPathsFromTemplate(template).required;
}

/**
 * Extracts unique dot-paths referenced across subject and message templates.
 */
export function extractTemplatePathsFromMany(
  templates: Array<string | null | undefined>,
): string[] {
  return mergeExtractedPaths(templates).all;
}

/**
 * Extracts unconditionally required dot-paths across subject and message templates.
 */
export function extractRequiredTemplatePathsFromMany(
  templates: Array<string | null | undefined>,
): string[] {
  return mergeExtractedPaths(templates).required;
}
