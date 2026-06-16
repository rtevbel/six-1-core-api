import Handlebars from 'handlebars';
import { NOTIFICATION_HANDLEBARS_HELPERS } from './handlebars-helpers.registry';

type HbsNode = { type: string };
type HbsPathExpression = HbsNode & {
  type: 'PathExpression';
  original?: string;
  parts?: unknown[];
};

const BUILTIN_BLOCK_HELPERS = new Set([
  'if',
  'unless',
  'each',
  'with',
  'lookup',
  'log',
]);

function isPathExpression(
  node: unknown,
): node is HbsPathExpression {
  return (
    !!node &&
    typeof node === 'object' &&
    (node as HbsNode).type === 'PathExpression'
  );
}

function addPath(paths: Set<string>, path: HbsPathExpression): void {
  const original = typeof path.original === 'string' ? path.original : '';
  if (!original || original === '.' || original === 'this') {
    return;
  }
  paths.add(original);
}

function walkExpression(
  expression: unknown,
  paths: Set<string>,
): void {
  if (isPathExpression(expression)) {
    addPath(paths, expression);
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
        walkExpression(param, paths);
      }
    }
  }
}

function walkParams(
  params: unknown,
  paths: Set<string>,
): void {
  if (!Array.isArray(params)) {
    return;
  }
  for (const param of params) {
    walkExpression(param, paths);
  }
}

function walkStatement(
  statement: unknown,
  paths: Set<string>,
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
        addPath(paths, typed.path as HbsPathExpression);
      } else {
        walkParams(typed.params, paths);
      }
      if (typed.hash && typeof typed.hash === 'object') {
        const pairs = (typed.hash as { pairs?: unknown }).pairs;
        if (Array.isArray(pairs)) {
          for (const pair of pairs) {
            walkExpression((pair as { value?: unknown }).value, paths);
          }
        } else if (pairs && typeof pairs === 'object') {
          for (const pair of Object.values(pairs as Record<string, unknown>)) {
            const value =
              pair && typeof pair === 'object' && 'value' in pair
                ? (pair as { value?: unknown }).value
                : pair;
            walkExpression(value, paths);
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
          walkParams(typed.params, paths);
        } else if (!BUILTIN_BLOCK_HELPERS.has(helperName)) {
          addPath(paths, typed.path as HbsPathExpression);
        } else if (BUILTIN_BLOCK_HELPERS.has(helperName)) {
          walkParams(typed.params, paths);
        }
      }
      walkProgram(typed.program, paths);
      if (typed.inverse) {
        walkProgram(typed.inverse, paths);
      }
      break;
    case 'PartialStatement':
      walkParams(typed.params, paths);
      if (typed.program) {
        walkProgram(typed.program, paths);
      }
      break;
    case 'ContentStatement':
    case 'CommentStatement':
      break;
    default:
      break;
  }
}

function walkProgram(program: unknown, paths: Set<string>): void {
  if (!program || typeof program !== 'object') {
    return;
  }
  const body = (program as { body?: unknown }).body;
  if (!Array.isArray(body)) {
    return;
  }
  for (const statement of body) {
    walkStatement(statement, paths);
  }
}

/**
 * Extracts dot-path variable references from Handlebars templates.
 */
export function extractTemplatePaths(template: string): string[] {
  if (!template.trim()) {
    return [];
  }

  const paths = new Set<string>();
  const ast = Handlebars.parse(template) as unknown;
  walkProgram(ast, paths);
  return Array.from(paths).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts unique dot-paths referenced across subject and message templates.
 */
export function extractTemplatePathsFromMany(
  templates: Array<string | null | undefined>,
): string[] {
  const paths = new Set<string>();
  for (const template of templates) {
    if (!template) {
      continue;
    }
    for (const path of extractTemplatePaths(template)) {
      paths.add(path);
    }
  }
  return Array.from(paths).sort((a, b) => a.localeCompare(b));
}
