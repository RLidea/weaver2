export const adminModuleKeys = {
  all: ['admin', 'modules'] as const,
  graph: () => ['admin', 'modules', 'graph'] as const,
} as const;
