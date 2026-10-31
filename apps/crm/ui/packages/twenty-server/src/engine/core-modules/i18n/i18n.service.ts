import { Injectable, type OnModuleInit } from '@nestjs/common';

import {
  i18n,
  type I18n,
  type MessageOptions,
  type Messages,
  setupI18n,
} from '@lingui/core';
import { compileMessage } from '@lingui/message-utils/compileMessage';
import { type APP_LOCALES, SOURCE_LOCALE } from 'kovaa-lab-shared/translations';

import { ALL_LOCALE_MESSAGES } from 'src/engine/core-modules/i18n/constants/all-locale-messages.constant';

@Injectable()
export class I18nService implements OnModuleInit {
  private i18nInstancesMap: Record<keyof typeof APP_LOCALES, I18n> =
    {} as Record<keyof typeof APP_LOCALES, I18n>;

  async loadTranslations() {
    // The global singleton backs server-side t`` with no compiled catalog, so it needs a runtime compiler; since lingui 5.9 it also throws unless a locale is active.
    i18n.setMessagesCompiler(compileMessage);
    i18n.load(SOURCE_LOCALE, ALL_LOCALE_MESSAGES[SOURCE_LOCALE]);
    i18n.activate(SOURCE_LOCALE);

    (
      Object.entries(ALL_LOCALE_MESSAGES) as [
        keyof typeof APP_LOCALES,
        Messages,
      ][]
    ).forEach(([locale, messages]) => {
      const localeI18n = setupI18n();

      localeI18n.setMessagesCompiler(compileMessage);
      localeI18n.load(locale, messages);
      localeI18n.activate(locale);

      this.i18nInstancesMap[locale] = localeI18n;
    });
  }

  getI18nInstance(locale: keyof typeof APP_LOCALES) {
    return this.i18nInstancesMap[locale];
  }

  translateMessage({
    messageId,
    values,
    locale = SOURCE_LOCALE,
    options,
  }: {
    messageId: string;
    values?: Record<string, string>;
    locale?: keyof typeof APP_LOCALES;
    options?: MessageOptions;
  }) {
    const i18n = this.getI18nInstance(locale);

    return i18n._(messageId, values, options);
  }

  async onModuleInit() {
    await this.loadTranslations();
  }
}
