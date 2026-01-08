# 如何更新 Firebase 設定

## 📸 您的 Firebase 設定

根據您的截圖，Firebase 提供的設定是：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBQB0FhR8N1LfOi_n6IxGexlteXCfBaBtY",
  authDomain: "meeting-app-f5a6c.firebaseapp.com",
  projectId: "meeting-app-f5a6c",
  storageBucket: "meeting-app-f5a6c.firebasestorage.app",
  messagingSenderId: "992174855214",
  appId: "1:992174855214:web:8338a330a5735ed6c9bbbf"
};
```

## ⚠️ 缺少 databaseURL

您的設定中**缺少 `databaseURL`**，這是因為您還沒有建立 Realtime Database。

## 🔧 完整步驟

### 1. 建立 Realtime Database

1. 在 Firebase Console 左側選單，點擊「Realtime Database」
2. 點擊「建立資料庫」
3. 選擇位置（建議：`asia-southeast1`）
4. 選擇「以測試模式啟動」
5. 點擊「啟用」

### 2. 取得 databaseURL

建立完成後，您會看到資料庫的網址，類似：

```
https://meeting-app-f5a6c-default-rtdb.asia-southeast1.firebasedatabase.app
```

### 3. 更新 firebase-config.js

開啟 `H:\mySTT\js\firebase-config.js`，將第 4-12 行替換為：

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBQB0FhR8N1LfOi_n6IxGexlteXCfBaBtY",
    authDomain: "meeting-app-f5a6c.firebaseapp.com",
    databaseURL: "https://meeting-app-f5a6c-default-rtdb.asia-southeast1.firebasedatabase.app",  // ← 加上這行
    projectId: "meeting-app-f5a6c",
    storageBucket: "meeting-app-f5a6c.firebasestorage.app",
    messagingSenderId: "992174855214",
    appId: "1:992174855214:web:8338a330a5735ed6c9bbbf"
};
```

**注意**：`databaseURL` 要根據您實際建立的資料庫位置調整！

## 📋 快速檢查清單

- [ ] 已建立 Realtime Database
- [ ] 已取得 databaseURL
- [ ] 已更新 `firebase-config.js`
- [ ] 已設定 Database 安全規則（參考 FIREBASE_SETUP.md）
- [ ] 已啟用 Storage
- [ ] 已設定 Storage 安全規則

完成後就可以測試了！
