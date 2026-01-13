# Google Speech Edge Function - 完整版

認證已經成功！請用這個完整版代碼取代測試版：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== 收到請求 ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "No token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      console.log("Auth failed:", error?.message);
      return new Response(JSON.stringify({ error: "Auth failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ 用戶:", data.user.id);

    const { data: account } = await supabase
      .from("speech_api_accounts")
      .select("credentials")
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .single();

    if (!account) {
      return new Response(JSON.stringify({ error: "No account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ 帳號已找到");

    const credentials = JSON.parse(account.credentials);
    const { audio, language } = await req.json();

    if (!audio) {
      return new Response(JSON.stringify({ error: "No audio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ 音訊長度:", audio.length);

    // 創建 Google JWT
    const googleJwt = await createGoogleJWT(credentials);
    console.log("✅ Google JWT 已創建");

    // 換取 Access Token
    const accessToken = await getAccessToken(googleJwt);
    console.log("✅ 取得 Google Access Token");

    // 呼叫 Google Speech-to-Text API
    const googleRes = await fetch("https://speech.googleapis.com/v1/speech:recognize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          languageCode: language || "zh-TW",
          enableAutomaticPunctuation: true,
        },
        audio: { content: audio },
      }),
    });

    const result = await googleRes.json();
    console.log("✅ Google 回應狀態:", googleRes.status);

    if (!googleRes.ok) {
      console.error("❌ Google 錯誤:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: result.error?.message || "Google API error" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const transcript = result.results?.map((r: any) => r.alternatives?.[0]?.transcript).filter(Boolean).join(" ") || "";
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

async function createGoogleJWT(creds: any) {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const pem = creds.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${header}.${payload}.${sigB64}`;
}

async function getAccessToken(jwt: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("❌ Token 錯誤:", JSON.stringify(data));
    throw new Error(data.error_description || "Token error");
  }
  return data.access_token;
}
```

**步驟**：
1. 用上面的代碼**取代**現有代碼
2. 點擊 **Deploy**
3. 再次測試並截圖 **Logs**
