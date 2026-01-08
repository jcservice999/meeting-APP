# Firebase 設定教學

## 步驟 1：建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」
3. 輸入專案名稱（例如：`meeting-app`）
4. 停用 Google Analytics（可選）
5. 點擊「建立專案」

## 步驟 2：註冊網頁應用程式

1. 在 Firebase Console 首頁（建立專案後會自動進入），點擊中間的「網頁」圖示（</>）
   - 如果找不到，可以點擊左上角的「專案總覽」回到首頁
2. 輸入應用程式暱稱（例如：`Meeting Web App`）
3. **不要**勾選「同時設定 Firebase Hosting」
4. 點擊「註冊應用程式」
5. **複製 const firebaseConfig**（稍後會用到）

## 步驟 3：啟用 Authentication

1. 在左側選單選擇「Authentication」
2. 點擊「開始使用」
3. 選擇「Google」登入提供者
4. 啟用 Google 登入
5. 輸入專案的公開名稱和支援電子郵件
6. 點擊「儲存」

## 步驟 4：設定 Realtime Database

1. 在左側選單選擇「Realtime Database」
2. 點擊「建立資料庫」
3. 選擇資料庫位置（建議選擇 `asia-southeast1`）
4. 選擇「以測試模式啟動」（稍後會設定安全規則）
5. 點擊「啟用」

### 設定安全規則

在「規則」分頁中，貼上以下規則：

{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "meetings": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}


點擊「發布」。

## 步驟 5：設定 Storage

1. 在左側選單選擇「Storage」
2. 點擊「開始使用」
3. 選擇「以測試模式啟動」
4. 選擇儲存位置（與 Database 相同）
5. 點擊「完成」

### 設定安全規則

在「規則」分頁中，貼上以下規則：

\`\`\`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /user-photos/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

點擊「發布」。

## 步驟 6：更新應用程式設定

1. 開啟 `H:\\mySTT\\js\\firebase-config.js`
2. 找到 Firebase 設定物件
3. 將步驟 2 複製的設定貼上

範例：

\`\`\`javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "meeting-app-xxxxx.firebaseapp.com",
    databaseURL: "https://meeting-app-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "meeting-app-xxxxx",
    storageBucket: "meeting-app-xxxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
\`\`\`

## 步驟 7：設定授權網域

1. 在 Authentication → Settings → Authorized domains
2. 新增以下網域：
   - `localhost`（本地測試）
   - 您的 GitHub Pages 網域（例如：`username.github.io`）

## 步驟 8：測試

1. 啟動本地伺服器：
   \`\`\`bash
   cd H:\\mySTT
   python -m http.server 8000
   \`\`\`

2. 開啟瀏覽器訪問 `http://localhost:8000`

3. 點擊「使用 Google 帳號登入」

4. 選擇您的 Google 帳號

5. 如果成功，您將進入會議室！

## 常見問題

**Q: 登入時出現「此網域未獲授權」錯誤**  
A: 請確認已在 Firebase Authentication 設定中新增 `localhost` 到授權網域。

**Q: 資料庫寫入失敗**  
A: 請檢查 Realtime Database 的安全規則是否正確設定。

**Q: 照片上傳失敗**  
A: 請檢查 Storage 的安全規則是否正確設定。

**Q: 第一位使用者沒有自動成為管理員**  
A: 請檢查瀏覽器 Console 是否有錯誤訊息，並確認 Firebase 設定正確。

## 部署到 GitHub Pages

1. 確認所有設定都正確
2. 提交程式碼到 GitHub
3. 在 Firebase Authentication 授權網域中新增您的 GitHub Pages 網域
4. 啟用 GitHub Pages
5. 訪問您的網站！

---

**設定完成後，您的會議軟體就可以使用了！** 🎉
