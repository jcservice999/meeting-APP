# OpenAI Whisper Edge Function - 支援自訂提示詞

請在 Supabase Edge Functions 建立名為 `whisper-speech` 的函數，使用以下程式碼：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "No OpenAI API key configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (token) {
      const { error } = await supabase.auth.getUser(token);
      if (error) {
        return new Response(JSON.stringify({ error: "Auth failed" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const { audio, language, prompt } = await req.json();
    
    if (!audio || audio.length < 5000) {
      return new Response(JSON.stringify({ transcript: "", success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([binaryAudio], { type: "audio/webm" });

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", language === "zh-TW" ? "zh" : language === "en-US" ? "en" : "zh");
    formData.append("response_format", "json");
    
    // 使用自訂提示詞，如果沒有則使用預設
    const whisperPrompt = prompt || "This is a meeting conversation. Transcribe the spoken words accurately.";
    formData.append("prompt", whisperPrompt);

    console.log("Whisper prompt:", whisperPrompt);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}` },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Whisper API error:", result);
      return new Response(JSON.stringify({ error: result.error?.message || "API error" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let transcript = (result.text || "").trim();
    
    // 只過濾太短的結果
    if (transcript.length < 2) {
      transcript = "";
    }

    console.log("Whisper result:", transcript || "(empty)");

    return new Response(JSON.stringify({ transcript, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

## 重要設定

1. **Supabase Secrets** - 需要設定 `OPENAI_API_KEY`
2. **JWT 驗證** - 建議關閉（因為我們有自己的驗證）

## 提示詞說明

`prompt` 參數可以幫助 Whisper：
- 識別特定術語（如公司名稱、產品名稱）
- 設定語境（會議、訪談、講座等）
- 改善特定語言的辨識

範例提示詞：
- `"這是商業會議的錄音，討論產品和業務。"`
- `"JBS商學院的線上課程錄音。"`
- `"Technical discussion about software development, APIs, and cloud services."`
