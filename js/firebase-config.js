/**
 * Firebase 설정
 * ------------------------------------------------------------
 * Firebase 콘솔(https://console.firebase.google.com)에서
 *   1) 프로젝트 생성
 *   2) 웹 앱 추가 (</> 아이콘)
 *   3) 나오는 firebaseConfig 값을 아래에 그대로 붙여넣기
 *
 * ⚠️ 이 값들은 "공개되어도 괜찮은" 값입니다.
 *    실제 보안은 Firestore 보안 규칙(Rules)으로 제어합니다.
 *    README.md 의 "보안 규칙" 섹션을 반드시 적용하세요.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBEWAYTA-c_hQi6wfKMrRFQ_NgdptpDXB0",
  authDomain: "baking-homepage.firebaseapp.com",
  projectId: "baking-homepage",
  storageBucket: "baking-homepage.firebasestorage.app",
  messagingSenderId: "449298369968",
  appId: "1:449298369968:web:28bd979d3969aba1199a75",
  measurementId: "G-2GJSBN1YC0",
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// 전역에서 쓸 수 있도록 참조 저장
const db = firebase.firestore();
