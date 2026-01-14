# AssemblyAI 語音轉錄 - Edge Function

## 部署步驟

### 1. 建立 Edge Function

```bash
supabase functions new assemblyai-speech
```

### 2. 更新 index.ts

將以下程式碼複製到 `supabase/functions/assemblyai-speech/index.ts`：

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 驗證使用者
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { audio, language } = await req.json();
    
    if (!audio || audio.length < 5000) {
      return new Response(JSON.stringify({ transcript: "", success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 取得使用者的有效 API Key
    const { data: accounts, error: dbError } = await supabase
      .from('speech_api_accounts')
      .select('id, api_key')
      .eq('user_id', user.id)
      .eq('provider', 'assemblyai')
      .eq('api_exhausted', false)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: true });

    if (dbError || !accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No active AssemblyAI API key. Please add one in Settings." 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 嘗試每個 API Key 直到成功
    for (const account of accounts) {
      try {
        // 1. 上傳音訊
        const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        
        const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
          method: "POST",
          headers: {
            "Authorization": account.api_key,
            "Content-Type": "application/octet-stream"
          },
          body: binaryAudio
        });

        if (!uploadResponse.ok) {
          const err = await uploadResponse.json();
          // 額度耗盡錯誤
          if (uploadResponse.status === 402 || uploadResponse.status === 429) {
            console.log(`API Key ${account.id} exhausted, marking...`);
            await supabase
              .from('speech_api_accounts')
              .update({ api_exhausted: true, exhausted_at: new Date().toISOString() })
              .eq('id', account.id);
            continue; // 嘗試下一個 Key
          }
          throw new Error(err.error || "Upload failed");
        }

        const uploadResult = await uploadResponse.json();
        const uploadUrl = uploadResult.upload_url;

        // 2. 建立轉錄任務
        const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
          method: "POST",
          headers: {
            "Authorization": account.api_key,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            audio_url: uploadUrl,
            language_code: language === "zh-TW" ? "zh" : language === "en-US" ? "en" : "zh"
          })
        });

        if (!transcriptResponse.ok) {
          const err = await transcriptResponse.json();
          if (transcriptResponse.status === 402 || transcriptResponse.status === 429) {
            await supabase
              .from('speech_api_accounts')
              .update({ api_exhausted: true, exhausted_at: new Date().toISOString() })
              .eq('id', account.id);
            continue;
          }
          throw new Error(err.error || "Transcription request failed");
        }

        const transcriptResult = await transcriptResponse.json();
        const transcriptId = transcriptResult.id;

        // 3. 輪詢等待結果（最多 30 秒）
        let transcript = "";
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          
          const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { "Authorization": account.api_key }
          });
          
          const pollResult = await pollResponse.json();
          
          if (pollResult.status === "completed") {
            transcript = pollResult.text || "";
            break;
          } else if (pollResult.status === "error") {
            throw new Error(pollResult.error || "Transcription failed");
          }
        }

        console.log("AssemblyAI 結果:", transcript || "(空)");

        return new Response(JSON.stringify({ transcript, success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (keyError) {
        console.error(`API Key ${account.id} error:`, keyError);
        continue; // 嘗試下一個 Key
      }
    }

    // 所有 Key 都失敗
    return new Response(JSON.stringify({ 
      error: "All API keys exhausted or failed. Please add a new API key." 
    }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("錯誤:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

### 3. 部署

```bash
supabase functions deploy assemblyai-speech --no-verify-jwt
```

---

## 資料庫更新

在 Supabase SQL Editor 執行：

```sql
-- 新增欄位
ALTER TABLE speech_api_accounts 
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS api_exhausted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exhausted_at TIMESTAMPTZ;

-- 更新現有資料（可選）
UPDATE speech_api_accounts SET provider = 'assemblyai' WHERE provider = 'google';
```

---

## 測試

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/assemblyai-speech \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audio": "BASE64_AUDIO", "language": "zh-TW"}'
```
