import type { DropMenu } from '../components/Dropdown';
import type { LocaleSetting, LocaleType } from '/#/config';

export const LOCALE: { [key: string]: LocaleType } = {
  ZH_CN: 'zh_CN',
  EN_US: 'en',
  ZH_TW: 'zh_TW',
};

export const localeSetting: LocaleSetting = {
  showPicker: true,
  // Locale
  locale: LOCALE.ZH_TW,
  // Default locale
  fallback: LOCALE.ZH_TW,
  // available Locales
  availableLocales: [LOCALE.ZH_TW, LOCALE.EN_US],
};

// locale list
export const localeList: DropMenu[] = [
  {
    text: '正體中文',
    event: LOCALE.ZH_TW,
  },
  {
    text: 'English',
    event: LOCALE.EN_US,
  },
];
