# 語音 API 帳號管理 - 資料庫設定

請在 Supabase SQL Editor 執行以下 SQL：

```sql
-- 創建語音 API 帳號表格
CREATE TABLE IF NOT EXISTS speech_api_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'google',
    credentials TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 RLS
ALTER TABLE speech_api_accounts ENABLE ROW LEVEL SECURITY;

-- 用戶只能管理自己的帳號
CREATE POLICY "Users can view own accounts" ON speech_api_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON speech_api_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON speech_api_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON speech_api_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- 創建索引
CREATE INDEX idx_speech_api_accounts_user_id ON speech_api_accounts(user_id);
CREATE INDEX idx_speech_api_accounts_active ON speech_api_accounts(user_id, is_active);
```

執行完成後告訴我！
