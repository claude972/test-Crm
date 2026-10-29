import { getBookCallStepMinEmployeeCount } from 'src/engine/core-modules/onboarding/utils/get-book-call-step-min-employee-count.util';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export const readBookCallStepMinEmployeeCount = (
  kovaaLabConfigService: KovaaLabCRMConfigService,
): number | null =>
  getBookCallStepMinEmployeeCount({
    calendarBookingPageId: kovaaLabConfigService.get('CALENDAR_BOOKING_PAGE_ID'),
    minEmployeeCount: kovaaLabConfigService.get(
      'ONBOARDING_BOOK_CALL_MIN_EMPLOYEE_COUNT',
    ),
  });
