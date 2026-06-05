import type { Dealer } from '@prisma/client';
import type { PageMeta } from '../../utils/pagination';

export interface DealerListResult {
  data: Dealer[];
  meta: PageMeta;
}
