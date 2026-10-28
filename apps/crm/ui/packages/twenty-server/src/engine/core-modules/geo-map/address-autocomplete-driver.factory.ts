import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';

import { type AddressAutocompleteDriver } from 'src/engine/core-modules/geo-map/drivers/types/address-autocomplete-driver.type';

import { AddressAutocompleteBanDriver } from 'src/engine/core-modules/geo-map/drivers/ban/address-autocomplete-ban.driver';
import { AddressAutocompleteGooglePlacesDriver } from 'src/engine/core-modules/geo-map/drivers/google-places/address-autocomplete-google-places.driver';
import { ADDRESS_AUTOCOMPLETE_DRIVER_TYPE } from 'src/engine/core-modules/geo-map/constants/address-autocomplete-driver-type.constant';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { DriverFactoryBase } from 'src/engine/core-modules/kovaa-lab-config/dynamic-factory.base';
import { ConfigGroupHashService } from 'src/engine/core-modules/kovaa-lab-config/services/config-group-hash.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class AddressAutocompleteDriverFactory extends DriverFactoryBase<AddressAutocompleteDriver | null> {
  constructor(
    kovaa-labConfigService: KovaaLab CRMConfigService,
    configGroupHashService: ConfigGroupHashService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {
    super(kovaa-labConfigService, configGroupHashService);
  }

  protected buildConfigKey(): string {
    return [
      this.kovaa-labConfigService.get('ADDRESS_AUTOCOMPLETE_DRIVER'),
      this.kovaa-labConfigService.get('GOOGLE_MAP_API_KEY'),
    ].join('|');
  }

  protected createDriver(): AddressAutocompleteDriver {
    const driver = this.kovaa-labConfigService.get('ADDRESS_AUTOCOMPLETE_DRIVER');
    const httpClient = this.secureHttpClientService.getHttpClient();

    switch (driver) {
      case ADDRESS_AUTOCOMPLETE_DRIVER_TYPE.GOOGLE_PLACES:
        return new AddressAutocompleteGooglePlacesDriver(
          this.kovaa-labConfigService.get('GOOGLE_MAP_API_KEY'),
          httpClient,
        );
      case ADDRESS_AUTOCOMPLETE_DRIVER_TYPE.BASE_ADRESSE_NATIONALE:
        return new AddressAutocompleteBanDriver(httpClient);
      default:
        throw new Error(`Invalid address autocomplete driver: ${driver}`);
    }
  }

  getCurrentDriver(): AddressAutocompleteDriver | null {
    const isEnabled = this.kovaa-labConfigService.get(
      'IS_MAPS_AND_ADDRESS_AUTOCOMPLETE_ENABLED',
    );
    const isGooglePlacesWithoutApiKey =
      this.kovaa-labConfigService.get('ADDRESS_AUTOCOMPLETE_DRIVER') ===
        ADDRESS_AUTOCOMPLETE_DRIVER_TYPE.GOOGLE_PLACES &&
      !isNonEmptyString(this.kovaa-labConfigService.get('GOOGLE_MAP_API_KEY'));

    if (!isEnabled || isGooglePlacesWithoutApiKey) {
      return null;
    }

    return super.getCurrentDriver();
  }
}
