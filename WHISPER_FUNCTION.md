# OpenAI Whisper Edge Function - 優化版

**請用這個優化版取代現有的 whisper-speech 代碼**：

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

    // 檢查音訊大小 - 太小可能只是噪音
    if (audio.length < 1000) {
      console.log("⚠️ 音訊太短，跳過");
      return new Response(JSON.stringify({ transcript: "", success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
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
    
    // 添加 prompt 來減少幻覺
    formData.append("prompt", "這是一段會議對話的語音記錄，請準確轉錄實際說話的內容。如果沒有人說話，請返回空白。");

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

    // 過濾掉可能的幻覺內容
    let transcript = result.text || "";
    
    // 如果結果看起來像是幻覺（包含特定模式），則忽略
    const hallucinations = [
      "youtube", "subscribe", "點讚", "訂閱", "轉發", "打賞", "支持",
      "www.", ".com", "http", "感謝收看", "感謝觀看", "下期見"
    ];
    
    const isHallucination = hallucinations.some(h => 
      transcript.toLowerCase().includes(h.toLowerCase())
    );
    
    if (isHallucination) {
      console.log("⚠️ 檢測到幻覺內容，忽略:", transcript);
      transcript = "";
    }

    console.log("✅ 轉錄結果:", transcript);

    return new Response(JSON.stringify({ transcript, success: true }), {
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

**變更**：
1. 加入 prompt 引導 Whisper
2. 過濾常見幻覺關鍵字
3. 忽略過短的音訊
