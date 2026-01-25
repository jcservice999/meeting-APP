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

    console.log("收到文字，準備進行「強力標點」校正");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你現在是一位專門處理「口語轉錄稿」的繁體中文校對大師。你的目標是將一段雜亂無章、完全沒有標點的文字，轉化為易讀且標點正確的對話記錄。

任務規則 (必須嚴格遵守)：
1. 【強制添加標點】：務必添加大量的逗點（，）、句點（。）、問號（？）或驚嘆號（！）。
2. 【語氣助詞處理】：在「啊、呢、喔、吧、嗎、啦、唷」等語氣助詞後面，必須加上標點符號。
3. 【禁止刪減】：絕對不要刪除任何一個字（包括發語詞與髒話都必須保留），也不要改寫語句。
4. 【同音字修正】：修正明顯的錯別字（如：的/地/得、或是同音異字）。

範例示範：
輸入：欸你有聽說嗎那個人真的超級雞巴的啦我就說不用理他啊對不對
輸出：欸！你有聽說嗎？那個人真的超級雞巴的啦！我就說不用理他啊，對不對？

輸入：鮑魚這個藍光我是買防藍光的真的喔嗯阿姨也喜歡藍光的
輸出：鮑魚這個藍光，我是買防藍光的。真的喔？嗯，阿姨也喜歡藍光的。

輸入：要怎麼拆啊拆不起來有了有了拆起來了這個都已經破成這樣了對不起
輸出：要怎麼拆啊？拆不起來！有了、有了！拆起來了。這個都已經破成這樣了，對不起。

絕對規則：只輸出校對後的文字，不要有任何開場白或備註。

原文內容：
${originalText}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
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
