# Supabase 設定教學

## ✅ 完全免費，不需要信用卡！

Supabase 是 Firebase 的開源替代品，提供完全免費的方案，無需信用卡。

---

## 步驟 1：建立 Supabase 帳號

1. 前往 [supabase.com](https://supabase.com)
2. 點擊「Start your project」
3. 使用 **GitHub 帳號**登入（推薦）
   - 或使用 Google/Email 註冊
4. **不需要信用卡！**

---

## 步驟 2：建立新專案

1. 點擊「New Project」
2. 填寫專案資訊：
   - **Name**：`meeting-app`（或您喜歡的名稱）
   - **Database Password**：設定一個強密碼（請記住）
   - **Region**：選擇 `Southeast Asia (Singapore)`
3. 點擊「Create new project」
4. 等待約 2 分鐘，專案建立完成

---

## 步驟 3：取得 API 金鑰

1. 在專案頁面，點擊左側的 ⚙️ **Settings**（設定）
2. 在左側子選單中
3. 您會看到兩個重要的值：
   - 點擊「**Data API**，**Project URL**（專案網址）
     - 格式：`https://xxxxx.supabase.co`
   -點擊「**API Keys**」， **Publishable key** 金鑰（公開金鑰）
     - 一長串字串，通常以 `eyJ` 開頭
4. 點擊每個值旁邊的「複製」圖示來複製

---

## 步驟 4：更新應用程式設定

1. 開啟 `H:\mySTT\js\supabase-config.js`
2. 將第 4-5 行替換為您的設定：

```javascript
const supabaseConfig = {
    url: 'https://xxxxx.supabase.co',  // ← 貼上您的 Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // ← 貼上您的 anon public 金鑰
};
```

---

## 步驟 5：建立資料庫表格

1. 在 Supabase Dashboard，點擊左側的 **SQL Editor**
2. 點擊「New query」
3. 複製貼上以下 SQL：

```sql
-- 建立使用者表格
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    role TEXT DEFAULT 'member',
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'offline'
);

-- 建立參與者表格
CREATE TABLE participants (
    meeting_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    photo_url TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_speaking BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'online',
    PRIMARY KEY (meeting_id, user_id)
);

-- 建立字幕表格
CREATE TABLE captions (
    id BIGSERIAL PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    text TEXT NOT NULL,
    language TEXT DEFAULT 'zh',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用即時訂閱
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE captions;
```

4. 點擊「Run」執行

---

## 步驟 6：設定 Row Level Security (RLS)
刪除SQL Editor 中的東西
繼續在 SQL Editor 中執行：

```sql
-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;

-- 使用者表格政策
CREATE POLICY "使用者可讀取所有資料" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "使用者可更新自己的資料" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "使用者可插入自己的資料" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "管理員可更新所有資料" ON users FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 參與者表格政策
CREATE POLICY "所有人可讀取參與者" ON participants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "使用者可管理自己的參與狀態" ON participants FOR ALL USING (auth.uid() = user_id);

-- 字幕表格政策
CREATE POLICY "所有人可讀取字幕" ON captions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "使用者可新增字幕" ON captions FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 步驟 7：設定 Google OAuth

1. 在 Supabase Dashboard，點擊左側的 **Authentication**
2. 選擇「Providers」分頁
3. 找到「Google」，點擊展開
4. 啟用「Enable Sign in with Google」

### 取得 Google OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用「Google+ API」
4. 建立 OAuth 2.0 憑證：
   - 應用程式類型：Web application
   - 授權重新導向 URI：複製 Supabase 提供的 Callback URL(Authentication -> Sign In / Providers -> Google -> Callback URL)
     - 格式：`https://xxxxx.supabase.co/auth/v1/callback`
5. 複製 **Client ID** 和 **Client Secret**
6. 貼回 Supabase 的 Google Provider 設定
7. 點擊「Save」

---

## 步驟 8：設定 Storage（照片儲存）

1. 在 Supabase Dashboard，點擊左側的 **Storage**
2. 點擊「Create a new bucket」
3. 填寫：
   - **Name**：`photos`
   - **Public bucket**：✅ 勾選（讓照片可公開存取）
4. 點擊「Create bucket」

### 設定 Storage 政策

1. 點擊剛建立的 `photos` bucket
2. 點擊「Policies」分頁
3. 點擊「New Policy」
4. 選擇「For full customization」
5. 貼上以下政策：

**讀取政策**：
```sql
CREATE POLICY "所有人可讀取照片"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
```

**上傳政策**：
```sql
CREATE POLICY "使用者可上傳自己的照片"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'photos' 
    AND auth.uid() IS NOT NULL 
    AND (storage.foldername(name))[1] = 'user-photos'
);
```

**更新政策**：
```sql
CREATE POLICY "使用者可更新自己的照片"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'photos' 
    AND auth.uid() IS NOT NULL 
    AND (storage.foldername(name))[1] = 'user-photos'
);
```

---

## 步驟 9：測試

1. 啟動本地伺服器：
   ```bash
   cd H:\mySTT
   python -m http.server 8000
   ```

2. 開啟瀏覽器訪問 `http://localhost:8000`

3. 點擊「使用 Google 帳號登入」

4. 如果成功，您將進入會議室！

---

## 常見問題

**Q: 需要信用卡嗎？**  
A: 不需要！Supabase 免費方案完全免費，無需信用卡。

**Q: 免費額度夠用嗎？**  
A: 對 10-20 人的會議完全足夠！免費方案包含 500MB 資料庫、1GB 儲存空間。

**Q: 如何查看使用量？**  
A: 在 Supabase Dashboard 的 Settings → Usage 可以查看。

**Q: 登入失敗怎麼辦？**  
A: 確認 Google OAuth 設定正確，特別是 Callback URL。

**Q: 資料會保存多久？**  
A: 永久保存，除非您手動刪除專案。

---

## 🎉 完成！

設定完成後，您的會議軟體就可以使用了！

**完全免費，無需信用卡！**
