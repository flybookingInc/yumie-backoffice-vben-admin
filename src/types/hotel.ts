interface ExtraItem {
  enable: boolean;
  extraDescription: string | null;
  extraImagePath: string | null;
  extraName: string;
  extraPrice: number;
  order: 1;
}

interface Parking {
  emptyMessage: string;
  enable: boolean;
  fullMessage: string;
  hasEmptyParkingLot: boolean;
}

export interface Plan {
  availability: { [key: string]: boolean };
  disable: boolean;
  disabledWeekdays: number[];
  imagePath: string;
  inventory: { [key: string]: number };
  planName: string;
  roomTypeId: string;
  sequence: string;
  weekListPrice: string;
  weekPrice: string;
  weekQkDuration: string;
  weekendListPrice: string;
  weekendPrice: string;
  weekendQkDuration: string;
}

export interface Hotel {
  bookingInterval: number;
  confirmScreenFooterMessage: string;
  coverPhoto: {
    sequence: number;
    subtitle: string;
    title: string;
    url: string;
  }[];
  disabled: boolean;
  extras: { enableExtras: boolean; items: { [key: string]: ExtraItem } };
  flyKioskApi: { enabled: boolean; failAlertEmail: string; hotelCode: string };
  footerMessage: string;
  fullyBookShowingMessage: string;
  googleTagManager: { enable: boolean; id: string };
  hotelAddress: string;
  hotelDescription: string;
  hotelDirection: string;
  hotelFaviconUrl: string;
  hotelId: string;
  hotelLogoUrl: string;
  hotelMobileLogoUrl: string;
  hotelName: string;
  hotelPhone: string;
  hotelShortDescription: string;
  hotelWebsiteUrl: string;
  message: string;
  notifyEmail: string;
  parking: Parking;
  plans: { [key: string]: Plan };
  redirect: { enabled: boolean; redirectUrl: string };
  weekend: number[];
  wisePmsApi: { enable: boolean; failAlertEmail: string; HotelCode: string };
}
