# OpenAI Whisper Edge Function

**步驟 1**：取得 OpenAI API Key
- 前往 https://platform.openai.com/api-keys
- 創建新的 API Key

**步驟 2**：新增 Supabase Secret
- 前往 Supabase → Edge Functions → Secrets
- 新增：`OPENAI_API_KEY` = 您的 API Key

**步驟 3**：創建新的 Edge Function
- 名稱：`whisper-speech`
- 貼上以下代碼：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== Whisper 請求 ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 驗證用戶
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: "Auth failed" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      console.log("✅ 用戶:", data.user.id);
    }

    // 取得音訊
    const { audio, language } = await req.json();
    if (!audio) {
      return new Response(JSON.stringify({ error: "No audio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ 音訊長度:", audio.length);

    // 將 base64 轉換為 blob
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([binaryAudio], { type: "audio/webm" });

    // 建立 FormData
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", language === "zh-TW" ? "zh" : language === "en-US" ? "en" : "zh");
    formData.append("response_format", "json");

    console.log("📤 呼叫 OpenAI Whisper API...");

    // 呼叫 OpenAI Whisper API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("📥 Whisper 回應:", response.status);

    if (!response.ok) {
      console.error("❌ Whisper 錯誤:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: result.error?.message || "Whisper API error" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ 轉錄結果:", result.text);

    return new Response(JSON.stringify({ transcript: result.text, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("❌ 錯誤:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

**步驟 4**：關閉 JWT 驗證
- 部署後，到 Details 分頁
- 關閉 "Verify JWT with legacy secret"
- Save changes

完成後告訴我，我會更新 meeting.html！
