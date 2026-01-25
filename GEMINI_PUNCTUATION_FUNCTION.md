# gemini-punctuation Edge Function

使用 Google Gemini API 為字幕添加標點符號和修正錯別字。

## 程式碼

請複製以下整個程式碼區塊，貼到您的 Supabase Edge Function 中。

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let originalText = "";
  try {
    const body = await req.json().catch(() => ({}));
    originalText = body.text || "";
    
    if (!originalText || !originalText.trim()) {
      return new Response(JSON.stringify({ result: originalText, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("缺少 GEMINI_API_KEY");
      return new Response(JSON.stringify({ result: originalText, success: false, error: "Missing API Key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("收到文字，長度:", originalText.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `請修正以下錄音轉錄的繁體中文稿，重點是添加正確的標點符號。

任務說明：
1. 為文字添加適當的繁體中文標點符號（，。？！），讓長句易於閱讀。
2. 修正語氣助詞（啊、呢、喔、嗎）後的標點。
3. 修正明顯的同音字錯誤（的/地/得、在/再）。
4. 保留原始口語內容，不要改寫成正式文章。

範例：
輸入：大家好今天天氣不錯吧我們要去哪裡
輸出：大家好，今天天氣不錯吧？我們要去哪裡？

絕對規則：
- 只輸出修正後的文字，不要有任何解釋。

原文內容：
${originalText}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000
          }
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini API 錯誤:", JSON.stringify(data));
      return new Response(JSON.stringify({ result: originalText, success: false, error: data.error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || originalText;
    console.log("校正成功");

    return new Response(JSON.stringify({ result, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Edge Function 重大錯誤:", e.message);
    return new Response(JSON.stringify({ result: originalText, success: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```
