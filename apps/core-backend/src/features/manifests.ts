import type { FeatureManifest } from '@weaver2/module-registry';
import { boardFeature } from './board/board.feature';
import { abuseReportFeature } from './abuse-report/abuse-report.feature';
import { searchFeature } from './search/search.feature';

export const ALL_MANIFESTS: FeatureManifest[] = [
  boardFeature,
  abuseReportFeature,
  searchFeature,
];
