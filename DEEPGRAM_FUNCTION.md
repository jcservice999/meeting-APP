# Deepgram 語音轉錄 - Edge Function

## 完整程式碼

函數名稱：`deepgram-speech`

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

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { audio, language, roomId } = await req.json();
    
    if (!audio || audio.length < 5000) {
      return new Response(JSON.stringify({ transcript: "", success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 取得房間創建者的 ID
    let ownerId = user.id;
    if (roomId && roomId !== 'main-room') {
      const { data: room } = await supabase
        .from('rooms')
        .select('created_by')
        .eq('room_id', roomId)
        .single();
      if (room && room.created_by) ownerId = room.created_by;
    }

    // 取得有效 Deepgram API Key
    const { data: accounts } = await supabase
      .from('speech_api_accounts')
      .select('id, api_key')
      .eq('user_id', ownerId)
      .eq('provider', 'deepgram')
      .eq('api_exhausted', false)
      .order('is_active', { ascending: false })
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Room creator has no active Deepgram API key" 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiKey = accounts[0].api_key;
    const accountId = accounts[0].id;

    // 呼叫 Deepgram API
    // 使用 Nova-2 模型並開啟 smart_format
    const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${language === "zh-TW" ? "zh-TW" : "en"}&smart_format=true&punctuate=true`;
    
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "audio/webm",
      },
      body: binaryAudio
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 402 || response.status === 429) {
             await supabase.from('speech_api_accounts')
              .update({ api_exhausted: true, exhausted_at: new Date().toISOString() })
              .eq('id', accountId);
        }
        const errText = await response.text();
        throw new Error(`Deepgram API error: ${errText}`);
    }

    const result = await response.json();
    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || "";

    return new Response(JSON.stringify({ transcript, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

---

## 部署步驟

1. 在 Supabase Dashboard → Edge Functions → 建立 `deepgram-speech`
2. 貼上上面的程式碼
3. 確保關閉 JWT Verification
4. 部署
