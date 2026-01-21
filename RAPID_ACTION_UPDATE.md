# rapid-action Edge Function 更新

## 新增功能：標點符號和錯別字修正

請在現有的 `rapid-action` Edge Function 中，在 `serve` 函數內加入對 `punctuate` action 的處理：

```typescript
const { action, text, conversationText } = await req.json();

// 處理標點符號和錯別字修正
if (action === 'punctuate' && text) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [{
        role: 'user',
        content: `請處理以下中文語音轉錄文字：
1. 添加適當的標點符號（句號、逗號、問號等）
2. 根據上下文修正明顯的錯別字（例如同音字錯誤）
3. 不要改變原意或大幅修改語句

只回傳處理後的文字，不要任何解釋。

原文：${text}`
      }],
      max_tokens: 500
    })
  });

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim() || text;

  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// 原有的會議摘要功能
if (conversationText) {
  // ... 現有摘要邏輯 ...
}
```

## 部署步驟

1. 進入 Supabase Dashboard → Edge Functions → `rapid-action`
2. 點擊 **Code** 標籤
3. 在現有程式碼中加入上述 `if (action === 'punctuate')` 區塊
4. 點擊 **Deploy**
