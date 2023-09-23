import { defineStore } from 'pinia';
import { getToken } from 'firebase/app-check';
import { signOut, getAuth } from 'firebase/auth';
import type { User, ParsedToken } from 'firebase/auth';
import type { Hotel } from '/@/types/hotel';
import dayjs from '/@/utils/dayjs';
import { sortBy } from 'lodash-es';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getFirestore,
  onSnapshot,
} from 'firebase/firestore';
import { RowData } from '/@/types/reservations.page';
import { Order } from '/@/types/order';
import { Extras } from '/@/types/extras';
import { ref, reactive } from 'vue';
import { appCheck } from '/@/utils/firebase';
import { defHttp } from '/@/utils/http/axios';
import { taiwanNationCodeFilter } from '/@/utils/phoneNumber';
import { numberWithCommas } from '/@/utils/string';

const API_URL = import.meta.env.VITE_API_URL;

export const useDataStore = defineStore('dataStore', () => {
  const hotelData = ref<Hotel | null>(null);
  const reservationsTable = reactive<{ data: RowData[] }>({ data: [] });
  const user = ref<User | null>(null);
  const claims = ref<ParsedToken | null>(null);
  const isEmulatorMode = ref<boolean>(false);
  const isSpinnerVisible = ref<boolean>(false);
  const appCheckEnabled = ref<boolean>(false);
  const phonesMap = new Map<string, string>(); // store phone number's secretText and plainText map
  const allPhonesArray: string[] = []; // store all phone number in array to find duplicates;
  const allQkNumberArray: string[] = []; //store all qk number in array to find duplicates;
  const tagColumn = reactive<{ [key: string]: string[] }>({}); // store rowId and it's maping's tags;

  // in pinia composition api, we have to create reset function by ourselves
  const $reset = () => {
    hotelData.value = null;
    reservationsTable.data = [];
    user.value = null;
    claims.value = null;
    isEmulatorMode.value = false;
    isSpinnerVisible.value = false;
    appCheckEnabled.value = false;
  };

  const login = (loginUser: User) => {
    user.value = loginUser;
  };

  const logout = async () => {
    await signOut(getAuth());
    user.value = null;
    claims.value = null;
  };

  /**
   * Get axios request header
   * always return a header object, even if error occurs
   */
  const getRequestHeader = async () => {
    const header: { Authorization?: string; 'X-Firebase-AppCheck'?: string } = {};
    try {
      let token = '';
      if (user.value) {
        token = await user.value.getIdToken();
        header.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log(e);
    }
    try {
      if (appCheck) {
        const appCheckTokenResponse = await getToken(appCheck, false);
        header['X-Firebase-AppCheck'] = appCheckTokenResponse.token;
      }
    } catch (e) {
      console.log(e);
    }
    return header;
  };
  const fillHotelData = async (hotelId: string) => {
    if (!hotelId || typeof hotelId !== 'string') {
      throw new Error('飯店ID錯誤');
    }

    // subscribe to hotel data
    onSnapshot(
      doc(getFirestore(), 'qk-list', hotelId),
      (doc) => {
        hotelData.value = doc.data() as Hotel;
      },
      (error) => {
        console.log(error);
      },
    );
  };

  const decodeMessage = async (message: string): Promise<string> => {
    try {
      const headers = await getRequestHeader();
      const response = await defHttp.post({
        url: `${API_URL}/decodeMessage`,
        headers: headers,
        data: {
          secretText: message,
        },
      });

      if (response.status === 200 && response.data) {
        return response.data.plainText;
      }
      throw new Error('解碼失敗');
    } catch (e) {
      throw new Error('解碼失敗');
    }
  };

  /**
   * Get customer tags from server
   * @param hotelId The hotel id
   * @param phoneNumber The customer phone number
   * @returns {string[]} The customer tags. Example: ["VIP", "smoking"]
   */
  const getCustomerTags = async (hotelId: string, phoneNumber: string): Promise<string[]> => {
    const sendData = {
      hotelId: hotelId,
      phoneNumber: phoneNumber,
    };
    const headers = await getRequestHeader();
    const response = await defHttp.post({
      url: `${API_URL}/getCustomerTags`,
      data: sendData,
      headers: headers,
    });

    if (response.status === 200 && response.data && response.data.tags) {
      return response.data.tags as string[];
    }
    throw new Error('取得客戶標籤失敗');
  };

  /**
   * update customer tags from server
   * @param hotelId The hotel id
   * @param phoneNumber The customer phone number. format: 0911222333
   * @param updatedTags The updated tags. Example: ["VIP", "smoking"]
   */
  const putCustomerTags = async (
    hotelId: string,
    phoneNumber: string,
    updatedTags: string[],
  ): Promise<void> => {
    const sendData = {
      hotelId: hotelId,
      phoneNumber: `+886${phoneNumber.substring(1)}`,
      tags: updatedTags,
    };
    const headers = await getRequestHeader();
    const response = await defHttp.put({
      url: `${API_URL}/putCustomerTags`,
      data: sendData,
      headers: headers,
    });

    if (response.status === 200) {
      return;
    }
    throw new Error('更新客戶標籤失敗');
  };

  /**
   * Subscribe to reservations of specific date from firestore.
   * And update reservationsTable.data
   * Compare with previous record, if it's the same, skip generateRow to improve performance.
   * @param hotelId The hotel id
   * @param subscribeDate The specific date to subscribe
   */
  const subscibeReservations = (hotelId: string, subscribeDate: Date) => {
    try {
      const q = query(
        collection(getFirestore(), `qk-list/${hotelId}/orders`),
        where('check_in_date', '==', dayjs(subscribeDate).format('YYYY-MM-DD')),
        orderBy('checkInTime', 'asc'),
      );
      onSnapshot(
        q,
        (querySnapshot) => {
          const promiseArray: Promise<RowData>[] = [];
          const changeTypeArray: string[] = [];
          querySnapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              changeTypeArray.push('added');
              promiseArray.push(generateRow(hotelId, change.doc.data() as Order, change.doc.id));
            }
            if (change.type === 'modified') {
              changeTypeArray.push('modified');
              console.log('Modified event');
              promiseArray.push(generateRow(hotelId, change.doc.data() as Order, change.doc.id));
            }
            if (change.type === 'removed') {
              // handle removed
              changeTypeArray.push('removed');
              // remove from reservationsTable.data
              for (let i = 0; i < reservationsTable.data.length; i++) {
                if (reservationsTable.data[i].id === change.doc.id) {
                  reservationsTable.data.splice(i, 1);
                }
              }
            }
          });

          Promise.all(promiseArray).then((data: RowData[]) => {
            // check duplicates qk number
            // for (let i = 0; i < data.length; i++) {
            //   if (
            //     allQkNumberArray.indexOf(data[i].qkNumber) !==
            //     allQkNumberArray.lastIndexOf(data[i].qkNumber)
            //   ) {
            //     // if indexOf is not equal to lastIndexOf, there must be a duplicates.
            //     data[i].qkNumber =
            //       data[i].qkNumber +
            //       " <a href='#' data-bs-toggle='tooltip' data-bs-placement='top' title='注意!重複號碼'><i class='fas fa-exclamation-circle'></i></a>";
            //   }
            // }
            // check duplicates phone number
            // for (let i = 0; i < data.length; i++) {
            //   if (
            //     allPhonesArray.indexOf(data[i].qkPhoneNumber) !==
            //     allPhonesArray.lastIndexOf(data[i].qkPhoneNumber)
            //   ) {
            //     // if indexOf is not equal to lastIndexOf, there must be a duplicates.
            //     data[i].qkPhoneNumber =
            //       data[i].qkPhoneNumber +
            //       " <a href='#' data-bs-toggle='tooltip' data-bs-placement='top' title='重複電話'><i class='fas fa-exclamation-circle'></i></a>";
            //   }
            // }
            for (let i = 0; i < changeTypeArray.length; i++) {
              // handle added
              if (changeTypeArray[i] === 'added') {
                reservationsTable.data.push(data[i]);
              }
              // handle modified
              if (changeTypeArray[i] === 'modified') {
                for (let j = 0; j < reservationsTable.data.length; j++) {
                  if (reservationsTable.data[j].id === data[i].id) {
                    reservationsTable.data[j] = data[i];
                  }
                }
              }
              // sort by qkCheckInTime column
              reservationsTable.data = sortBy(reservationsTable.data, 'qkCheckInTime', 'asc'); //lodash sortBy
            }
          });
        },
        (error) => {
          console.log(error);
        },
      );
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * update reservationsTable.data's tags column
   * @param tags The tags to update
   * @param rowId The row id to update
   */
  const updateTagsCol = (tags: string[], rowId: string) => {
    for (let i = 0; i < reservationsTable.data.length; i++) {
      if (reservationsTable.data[i].id === rowId) {
        reservationsTable.data[i].qkTags = tags;
        return;
      }
    }
  };

  /**
   * Get phone number by encrypted phone number or from cache if it's already decoded.
   * @param encryptPhoneNumber The encrypted phone number text
   */
  const getPhoneNumberByEncryedPhoneNumberOrCacheMap = async (
    encryptPhoneNumber: string,
  ): Promise<string> => {
    // read plainText phoneNumber from privous record to reduce cloud function call.
    let phonePlainText: string | undefined = phonesMap.get(encryptPhoneNumber);
    if (!phonePlainText) {
      try {
        phonePlainText = (await decodeMessage(encryptPhoneNumber)).trim();
        phonePlainText = taiwanNationCodeFilter(phonePlainText);
        phonesMap.set(encryptPhoneNumber, phonePlainText);
      } catch (e) {
        throw new Error('Decode phone number error!');
      }
    }
    return phonePlainText;
  };

  /**
   * generate extras item column text
   * @param extras The extras buy object
   * @returns extras item column text
   */
  const generateExtrasItemColumnText = (extras: Extras): string => {
    let extrasStr = '';
    if (extras) {
      for (let i = 0; i < extras.items.length; i++) {
        extrasStr +=
          extras.items[i].itemName +
          ' $' +
          extras.items[i].itemPrice +
          ' x ' +
          extras.items[i].itemAmt +
          '\n';
      }
    }
    return extrasStr;
  };

  /**
   * get customer tags from server
   */
  const getCustomerTagsFromServer = async (
    hotelId: string,
    phoneNumber: string,
  ): Promise<string[]> => {
    let tags: string[] = [];
    try {
      tags = await getCustomerTags(hotelId, `+886${phoneNumber.substring(1)}`);
    } catch (e) {
      console.log(e); // do nothing
    }
    return tags || [];
  };

  /**
   * 將Json格式的訂單資料中，將要顯示的欄位取出，回傳Table Row物件
   */
  const generateRow = async (hotelId: string, orderData: Order, id: string): Promise<RowData> => {
    const statusMapping: { [key: string]: string } = {
      OK: 'OK',
      抵達: '抵達',
      Canceled: '取消',
    };
    //是否已check in
    const status_str = statusMapping[orderData.status] || orderData.status;
    // get phone number
    const phoneNumber = await getPhoneNumberByEncryedPhoneNumberOrCacheMap(orderData.phone_number);
    // push phone number to allPhonesArray to find duplicates
    allPhonesArray.push(phoneNumber);
    // push qk number to allQkNumberArray to find duplicates
    allQkNumberArray.push(orderData.qkNumber);

    const tags: string[] = tagColumn[phoneNumber]; // phoneNumber format: 0912888000
    if (!tags) {
      // use async to update tag column
      getCustomerTagsFromServer(hotelId, phoneNumber).then((tags) => {
        tagColumn[phoneNumber] = tags; // phoneNumber format: 0912888000
        if (tags) {
          updateTagsCol(tags, id);
        }
      });
    }

    // generate extras item column text
    const extraItemText = generateExtrasItemColumnText(orderData.extraBuy);

    // make sure the assigned value is reactive variable if you want to update it after.
    const row: RowData = {
      id: id,
      parentId: null,
      qkCheckInTime: orderData.checkInTime, //時段
      qkNumber: orderData.qkNumber, //號碼
      qkPlan: orderData.planName, //方案
      qkDuration: (parseInt(orderData.reservedMinutes, 10) / 60).toString() + 'hr', //時間
      qkRemaining: numberWithCommas(orderData.priceRemaining), //現付
      qkExtras: extraItemText, //商品
      qkPhoneNumber: phoneNumber, //電話
      qkStatus: status_str, //狀態
      qkTags: tagColumn[phoneNumber] || [], //標籤
    };
    return row;
  };

  /**
   * update reservation's status column in firestore.
   * @param hotelId The hotel id
   * @param statusValue The status value to update
   * @param reservationId The reservation id to update
   */
  const updateReservationStatusColumn = async (
    hotelId: string,
    statusValue: string | number | boolean,
    reservationId: string,
  ) => {
    const docRef = doc(getFirestore(), `qk-list/${hotelId}/orders/${reservationId}`);
    await updateDoc(docRef, {
      status: statusValue,
    }).catch((error) => console.error('Error writing document: ', error));
  };

  return {
    hotelData,
    reservationsTable,
    user,
    claims,
    isEmulatorMode,
    isSpinnerVisible,
    appCheckEnabled,
    $reset,
    subscibeReservations,
    putCustomerTags,
    login,
    logout,
    getRequestHeader,
    fillHotelData,
    decodeMessage,
    getCustomerTags,
    updateReservationStatusColumn,
  };
});
