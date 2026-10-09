/* =====================================================================
   設定
   firebase: Firebaseコンソールの「マイアプリ」に出る firebaseConfig。
             null にすると、割り勘などはこの端末の中だけに保存される。
   passHash: 合言葉の SHA-256（16進数）。空なら合言葉の画面は出ない。
   ===================================================================== */
window.APP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyC8SWol-VPL_Ksn1K8mNxA9FIyTYUmT9Z8",
    authDomain: "malaysia-trip-a1d57.firebaseapp.com",
    projectId: "malaysia-trip-a1d57",
    storageBucket: "malaysia-trip-a1d57.firebasestorage.app",
    messagingSenderId: "134136039295",
    appId: "1:134136039295:web:fdc721cae46a32ce347c4a",
  },
  passHash: "cf1a0bb444ccc247286f9e3cdb27556a7de6649a0f9326bf475b6a0e2fa3cb59",
  tripSalt: "malaysia-2027",
};
