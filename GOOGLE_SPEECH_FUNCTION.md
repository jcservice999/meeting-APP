# Google Speech Edge Function 設定

請在 Supabase 創建名為 `google-speech` 的 Edge Function。

## 步驟

1. 前往 Supabase Dashboard → Edge Functions
2. 點擊「New Function」
3. 名稱輸入：`google-speech`
4. 將以下代碼貼入：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 取得用戶 token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // 初始化 Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 驗證用戶
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    // 取得用戶的 active API 帳號
    const { data: account, error: accountError } = await supabase
      .from("speech_api_accounts")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (accountError || !account) {
      throw new Error("No active API account found. Please add one in settings.");
    }

    // 解析憑證
    const credentials = JSON.parse(account.credentials);
    
    // 取得音訊資料
    const { audio, language } = await req.json();
    
    if (!audio) {
      throw new Error("No audio data provided");
    }

    // 產生 JWT token 來呼叫 Google API
    const jwt = await createGoogleJWT(credentials);
    const accessToken = await getGoogleAccessToken(jwt);

    // 呼叫 Google Cloud Speech-to-Text API
    const response = await fetch(
      "https://speech.googleapis.com/v1/speech:recognize",
      {
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
            model: "latest_long",
          },
          audio: {
            content: audio,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", result);
      throw new Error(result.error?.message || "Google API error");
    }

    // 提取轉錄文字
    const transcript = result.results
      ?.map((r: any) => r.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(" ") || "";

    return new Response(
      JSON.stringify({ transcript, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// 創建 Google JWT
async function createGoogleJWT(credentials: any) {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signInput = `${headerB64}.${payloadB64}`;

  // 解析 PEM 私鑰
  const pemContents = credentials.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// 用 JWT 換取 Access Token
async function getGoogleAccessToken(jwt: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error_description || "Failed to get access token");
  }

  return data.access_token;
}
```

5. 點擊「Deploy」

完成後告訴我！
