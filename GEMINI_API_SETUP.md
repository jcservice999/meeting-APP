# Gemini API 後端設置指南

## 使用 Supabase Edge Functions 保護 API Key

### 步驟 1：安裝 Supabase CLI

```bash
npm install -g supabase
```

### 步驟 2：登入 Supabase

```bash
supabase login
```

### 步驟 3：初始化專案（在 meeting-app 資料夾內）

```bash
supabase init
```

### 步驟 4：創建 Edge Function

```bash
supabase functions new summarize-conversation
```

### 步驟 5：編輯 Edge Function

編輯 `supabase/functions/summarize-conversation/index.ts`：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversationText } = await req.json()

    // 從環境變數獲取 API Key（安全！）
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // 呼叫 Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `請整理以下會議對話的重點，用繁體中文列出主要討論事項和結論：\n\n${conversationText}`
            }]
          }]
        })
      }
    )

    const result = await response.json()
    const summary = result.candidates[0].content.parts[0].text

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 步驟 6：設定環境變數（安全存放 API Key）

在 Supabase Dashboard：
1. 前往 **Settings** → **Edge Functions**
2. 點擊 **Add secret**
3. Name: `GEMINI_API_KEY`
4. Value: 您的 Gemini API Key
5. 點擊 **Save**

### 步驟 7：部署 Edge Function

```bash
supabase functions deploy summarize-conversation --project-ref inzqsdelrwxxlbcumaiw
```

### 步驟 8：測試

Edge Function URL:
```
https://inzqsdelrwxxlbcumaiw.supabase.co/functions/v1/summarize-conversation
```

---

## 前端呼叫方式

```javascript
const response = await fetch(
  'https://inzqsdelrwxxlbcumaiw.supabase.co/functions/v1/summarize-conversation',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ conversationText: '對話內容...' })
  }
);

const { summary } = await response.json();
```
