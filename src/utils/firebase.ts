/**
 * Firebase utils
 */
import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, IdTokenResult, User } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { useDataStore } from '/@/store/modules/reservations';
import Swal from 'sweetalert2';
import { getErrorMessage } from '/@/utils/error';
import { useRouter } from 'vue-router';
import { store } from '/@/store';

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

let appCheck: AppCheck | undefined;
const router = useRouter();
const dataStore = useDataStore(store);

const initFirebase = () => {
  const FIREBASE_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  };

  let app: FirebaseApp;
  const apps = getApps();
  if (apps.length < 1) {
    app = initializeApp(FIREBASE_CONFIG);
  } else {
    app = apps[0];
  }

  const db = getFirestore(app);
  const functions = getFunctions(app, 'asia-east1');
  const auth = getAuth(app);
  auth.useDeviceLanguage();

  if (!import.meta.env.PROD) {
    // development mode, using Emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5008);
    connectAuthEmulator(auth, 'http://localhost:9099');
  }

  // TODO: Turn off phone auth app verification for development.
  if (!import.meta.env.prod) {
    // enable on development mode
    // https://firebase.google.com/docs/reference/node/firebase.auth.AuthSettings
    auth.settings.appVerificationDisabledForTesting = true;
  }

  if (typeof window !== 'undefined') {
    // make sure the code excute on client side only
    // is enabled appCheck
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = !import.meta.env; // enable FIREBASE_APPCHECK_DEBUG_TOKEN on development mode
    // init AppCheck
    console.log('VITE_APP_CHECK_KEY=', import.meta.env.VITE_APP_CHECK_KEY);
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_APP_CHECK_KEY as string),
      isTokenAutoRefreshEnabled: true,
    });
  }

  // register auth state change listener
  auth.onAuthStateChanged(handleAuthStateChanged);
};

const handleAuthStateChanged = async (user: User | null) => {
  if (user) {
    try {
      dataStore.user = user;
      const idTokenResult: IdTokenResult = await user.getIdTokenResult();
      dataStore.claims = idTokenResult.claims;
      const hotelGroup = idTokenResult.claims.hotelGroup as string[];
      if (hotelGroup.length === 0) {
        Swal.fire({
          icon: 'error',
          title: '無權限',
          text: '此帳號沒有所屬的旅館',
          confirmButtonColor: '#d33',
          confirmButtonText: '確定',
        });
        return;
      }
      const hotelId = hotelGroup[0];
      // fetch hotel data if not exist
      if (!dataStore.hotelData || dataStore.hotelData.hotelId !== hotelId) {
        await dataStore.fillHotelData(hotelId);
      }
      router.push({
        path: `/${hotelId}/reservations/`,
      });
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: '發生錯誤',
        text: getErrorMessage(e),
        confirmButtonColor: '#d33',
        confirmButtonText: '確定',
      });
      return;
    }
  } else {
    // User is signed out.
    // ...
  }
};

export { appCheck, initFirebase };
