# gemini-punctuation Edge Function (OpenRouter 版)

透過 **OpenRouter** 調用 **Gemini 2.0 Flash** 模型，為字幕添加標點符號與修正錯別字。

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
    originalText = (body.text || "").trim();
    
    if (!originalText) {
      return new Response(JSON.stringify({ result: "", success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔴 請確保在 Supabase 設定 OPENROUTER_API_KEY
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("缺少 OPENROUTER_API_KEY");
      return new Response(JSON.stringify({ result: originalText, success: false, error: "Missing API Key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("透過 OpenRouter 呼叫 Gemini 2.0 Flash...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://supabase.local", // OpenRouter 標牌要求
        "X-Title": "My Meeting App"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: `你是一位專門處理語音轉錄稿的標點大師。
任務：
1. 為文字添加標點符號（，。？！）。
2. 【強制】輸出結果的「每一句末尾」都必須有結束標點，絕對不能回傳純文字。
3. 【強制】語氣助詞（啊、啦、喔、吧、嗎）後方必須加上標點。
4. 原文中的髒話、贅字請完整保留，僅修正明顯同音錯字（如：prompt 寫成 prong）。
5. 只輸出校對後的文字，不要解釋。`
          },
          {
            role: "user",
            content: originalText
          }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("OpenRouter API 錯誤:", JSON.stringify(data));
        return new Response(JSON.stringify({ result: originalText, success: false, error: data.error?.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const result = data.choices?.[0]?.message?.content?.trim() || originalText;

    return new Response(JSON.stringify({ result, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Edge Function 錯誤:", e.message);
    return new Response(JSON.stringify({ result: originalText, success: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```
