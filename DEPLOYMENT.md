# GitHub Pages 部署指南（簡化版）

## 🎯 問題

GitHub Pages 只支援兩個位置：
- `/ (root)` - 根目錄
- `/docs` - docs 資料夾

我們的檔案在 `/mySTT` 資料夾，所以無法部署。

---

## ✅ 解決方法：重新上傳到根目錄

### 步驟 1：刪除現有 Repository

1. **GitHub Repository** → **Settings**
2. 滾到最下面 → **"Delete this repository"**
3. 輸入 `jcservice999/meeting-app` 確認
4. 點擊 **"I understand the consequences, delete this repository"**

### 步驟 2：重新建立 Repository

1. 訪問：https://github.com/new
2. 填寫：
   - **Repository name**: `meeting-app`
   - **Description**: `及時轉錄語音的會議軟體`
   - **Public** ✅
   - **不要勾選任何選項**（README、.gitignore、License 都不要）
3. **Create repository**

### 步驟 3：上傳檔案到根目錄

**重要**：這次要直接上傳檔案，不要包含 `mySTT` 資料夾

1. **點擊 "uploading an existing file"** 連結
2. **打開檔案總管** → 前往 `H:\mySTT`
3. **進入 mySTT 資料夾內部**
4. **選擇所有檔案和資料夾**（Ctrl+A）
   - ✅ 包含：`index.html`, `meeting.html`, `js/`, `styles/` 等
   - ❌ 排除：`meeting APP secret.txt`（敏感資訊）
5. **拖曳到 GitHub 網頁**
6. **Commit message**: `Initial commit`
7. **Commit changes**

### 步驟 4：啟用 GitHub Pages

1. **Settings** → 左側選單 **Pages**
2. **Source** 設定：
   - Branch: `main`
   - Folder: `/ (root)`
3. **Save**
4. **等待 1-2 分鐘**

完成後會顯示網址：
```
https://jcservice999.github.io/meeting-app/
```

### 步驟 5：更新 Google OAuth

1. **Google Cloud Console** → **OAuth 2.0 用戶端 ID**
2. **已授權的 JavaScript 來源** → 新增：
   ```
   https://jcservice999.github.io
   ```
3. **儲存**

---

## 🧪 測試

1. 訪問：`https://jcservice999.github.io/meeting-app/`
2. 登入測試
3. 開啟無痕視窗，用另一個帳號登入
4. 測試多人功能！

---

## ✅ 檢查清單

- [ ] 刪除舊 Repository
- [ ] 建立新 Repository
- [ ] 上傳檔案到根目錄（不包含 mySTT 資料夾）
- [ ] 啟用 GitHub Pages
- [ ] 更新 Google OAuth
- [ ] 測試網站

---

**完成後，您就能測試多人功能了！** 🎉
