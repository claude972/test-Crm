import { getBookCallStepMinEmployeeCount } from 'src/engine/core-modules/onboarding/utils/get-book-call-step-min-employee-count.util';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

export const readBookCallStepMinEmployeeCount = (
  kovaa-labConfigService: KovaaLab CRMConfigService,
): number | null =>
  getBookCallStepMinEmployeeCount({
    calendarBookingPageId: kovaa-labConfigService.get('CALENDAR_BOOKING_PAGE_ID'),
    minEmployeeCount: kovaa-labConfigService.get(
      'ONBOARDING_BOOK_CALL_MIN_EMPLOYEE_COUNT',
    ),
  });
