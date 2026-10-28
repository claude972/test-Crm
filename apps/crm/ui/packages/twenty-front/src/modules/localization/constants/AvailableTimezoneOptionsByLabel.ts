import { IANA_TIME_ZONES } from 'kovaa-lab-shared/constants';
import { formatTimeZoneLabel } from '@/localization/utils/formatTimeZoneLabel';
import { type SelectOption } from 'kovaa-lab-ui/primitives/input';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

const { AVAILABLE_TIME_ZONE_OPTIONS_BY_LABEL } = {
  AVAILABLE_TIME_ZONE_OPTIONS_BY_LABEL: IANA_TIME_ZONES.reduce<
    Record<string, SelectOption>
  >((result, ianaTimeZone) => {
    if (
      formatTimeZoneLabel(ianaTimeZone)
        .slice(11)
        .includes(doNotTranslate('GMT')) ||
      formatTimeZoneLabel(ianaTimeZone)
        .slice(11)
        .includes(doNotTranslate('UTC')) ||
      formatTimeZoneLabel(ianaTimeZone)
        .slice(11)
        .includes(doNotTranslate('UCT')) ||
      formatTimeZoneLabel(ianaTimeZone) in result
    ) {
      return result;
    }

    return {
      ...result,
      [formatTimeZoneLabel(ianaTimeZone)]: {
        label: formatTimeZoneLabel(ianaTimeZone),
        value: ianaTimeZone,
      },
    };
  }, {}),
};

export { AVAILABLE_TIME_ZONE_OPTIONS_BY_LABEL };
