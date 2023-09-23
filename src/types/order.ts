import { Extras } from "./extras";

export interface Order {
  associateRoomTypeId: string;
  bookingInterval: number;
  booking_datetime: string;
  channel: string;
  checkInTime: string;
  check_in_date: string;
  checkinDatetime: string;
  credit_card_status: string;
  customer_id: string;
  extraBuy: Extras;
  flyKioskCode?: string;
  flyKioskPmsId?: string;
  flyKioskPmsStatus?: string;
  geo_point: string;
  note: string;
  notice: string;
  phone_number: string;
  planId: string;
  planName: string;
  priceRemaining: string;
  price_commission: string;
  price_prepaid: string;
  qkNumber: string;
  reservedMinutes: string;
  room_type: string;
  status: string;
  totalPrice: string;
  verifyNumber: string;
  wiseHotelCode?: string;
  wisePmsId?: string;
  wisePmsStatus?: string;
}