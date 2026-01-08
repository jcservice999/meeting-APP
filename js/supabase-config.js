// Supabase 配置
// 請在 Supabase Dashboard 取得您的配置資訊並替換以下內容

const supabaseConfig = {
    url: 'https://inzqsdelrwxxlbcumaiw.supabase.co',
    anonKey: 'sb_publishable_B6icGBhWdbQ9a73nIrHKpQ_YWsZKzZs'
};

// 初始化 Supabase
// 使用全域的 supabase 物件（從 CDN 載入）
const { createClient } = supabase;
const supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// 匯出供其他模組使用
window.supabaseClient = supabaseClient;

console.log('Supabase initialized', supabaseClient);
