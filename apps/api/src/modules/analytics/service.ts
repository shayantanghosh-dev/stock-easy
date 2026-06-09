import { EXPIRY_SOON_DAYS } from '../../config/constants';
import { analyticsRepository } from './repository';

const DEFAULT_TOP_LIMIT = 10;

/**
 * Thin orchestration layer over the analytics repository: applies sensible
 * defaults. Both the analytics HTTP routes and the AI assistant call through here.
 */
class AnalyticsService {
  dashboard(shopId: string) {
    return analyticsRepository.dashboard(shopId);
  }

  expiringSoon(shopId: string, days?: number) {
    return analyticsRepository.expiringSoon(shopId, days ?? EXPIRY_SOON_DAYS);
  }

  lowStock(shopId: string) {
    return analyticsRepository.lowStock(shopId);
  }

  salesSummary(shopId: string, from?: Date, to?: Date) {
    return analyticsRepository.salesSummary(shopId, from, to);
  }

  topMedicines(shopId: string, from?: Date, to?: Date, limit?: number) {
    return analyticsRepository.topMedicines(shopId, from, to, limit ?? DEFAULT_TOP_LIMIT);
  }

  deadStock(shopId: string) {
    return analyticsRepository.deadStock(shopId);
  }

  stockLookup(shopId: string, name: string) {
    return analyticsRepository.stockLookup(shopId, name);
  }
}

export const analyticsService = new AnalyticsService();
