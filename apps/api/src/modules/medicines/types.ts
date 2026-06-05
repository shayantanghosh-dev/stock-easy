import type { Medicine } from '@prisma/client';
import type { PageMeta } from '../../utils/pagination';

export interface MedicineListResult {
  data: Medicine[];
  meta: PageMeta;
}
