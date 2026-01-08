# Google OAuth 設定教學

## 問題說明

![Google 登入錯誤](file:///C:/Users/Shawn5566/.gemini/antigravity/brain/b05e5a38-d389-4c26-a360-75d920f63de7/uploaded_image_1767616743788.png)

這個錯誤是因為 Google Client ID 尚未設定。以下是完整的設定步驟。

## 📋 設定步驟

### 步驟 1：建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊頂部的專案選擇器
3. 點擊「新增專案」
4. 輸入專案名稱（例如：`mySTT`）
5. 點擊「建立」

### 步驟 2：啟用 Google+ API

1. 在左側選單中，選擇「API 和服務」→「資料庫」
2. 搜尋「Google+ API」
3. 點擊進入後，點擊「啟用」

### 步驟 3：建立 OAuth 同意畫面

1. 在左側選單中，選擇「API 和服務」→「OAuth 同意畫面」
2. 選擇「外部」（如果您沒有 Google Workspace）
3. 點擊「建立」
4. 填寫必要資訊：
   - **應用程式名稱**：即時語音轉文字工具
   - **使用者支援電子郵件**：您的 email
   - **開發人員聯絡資訊**：您的 email
5. 點擊「儲存並繼續」
6. 在「範圍」頁面，點擊「儲存並繼續」
7. 在「測試使用者」頁面，點擊「+ ADD USERS」
8. 新增 `bkii56789@gmail.com`（以及其他需要使用的帳號）
9. 點擊「儲存並繼續」

### 步驟 4：建立 OAuth 2.0 客戶端 ID

1. 在左側選單中，選擇「API 和服務」→「憑證」
2. 點擊「+ 建立憑證」→「OAuth 客戶端 ID」
3. 選擇應用程式類型：**網頁應用程式**
4. 輸入名稱：`mySTT Web Client`
5. 在「已授權的 JavaScript 來源」中新增：
   ```
   http://localhost:8000
   ```
   （如果要部署到 GitHub Pages，也要新增）：
   ```
   https://YOUR_USERNAME.github.io
   ```
6. 在「已授權的重新導向 URI」中新增：
   ```
   http://localhost:8000
   https://YOUR_USERNAME.github.io/mySTT
   ```
7. 點擊「建立」
8. **複製「您的客戶端 ID」**（類似：`123456789-abc123.apps.googleusercontent.com`）

### 步驟 5：更新應用程式設定

1. 開啟 `H:\mySTT\index.html`
2. 找到第 18 行：
   ```html
   data-client_id="YOUR_GOOGLE_CLIENT_ID"
   ```
3. 替換為您的實際 Client ID：
   ```html
   data-client_id="123456789-abc123.apps.googleusercontent.com"
   ```
4. 儲存檔案

### 步驟 6：重新測試

1. 重新啟動本地伺服器：
   ```bash
   cd H:\mySTT
   python -m http.server 8000
   ```
2. 開啟瀏覽器訪問 `http://localhost:8000`
3. 點擊「使用 Google 帳戶登入」
4. 選擇 `bkii56789@gmail.com` 帳號
5. 應該可以成功登入！

## ⚠️ 重要提醒

### 測試使用者限制

在 OAuth 同意畫面處於「測試」狀態時：
- 只有在「測試使用者」列表中的帳號可以登入
- 其他帳號會看到「此應用程式尚未驗證」的警告

### 發布應用程式（選用）

如果要讓所有人都能使用：
1. 回到「OAuth 同意畫面」
2. 點擊「發布應用程式」
3. 提交 Google 審核（可能需要 1-2 週）

但對於個人使用，保持「測試」狀態即可。

## 🔍 常見問題

**Q: 為什麼需要新增測試使用者？**  
A: 在測試模式下，Google 只允許明確列出的使用者登入，這是安全機制。

**Q: Client ID 會過期嗎？**  
A: 不會，Client ID 是永久有效的。

**Q: 可以有多個 Client ID 嗎？**  
A: 可以，您可以為不同環境（開發、測試、正式）建立不同的 Client ID。

**Q: 忘記 Client ID 怎麼辦？**  
A: 回到 Google Cloud Console → API 和服務 → 憑證，就能看到所有的 Client ID。

## 📝 快速檢查清單

- [ ] 建立 Google Cloud 專案
- [ ] 啟用 Google+ API
- [ ] 設定 OAuth 同意畫面
- [ ] 新增測試使用者（bkii56789@gmail.com）
- [ ] 建立 OAuth 2.0 客戶端 ID
- [ ] 複製 Client ID
- [ ] 更新 index.html
- [ ] 重新測試登入

完成這些步驟後，您的應用程式就可以正常使用 Google 登入了！
