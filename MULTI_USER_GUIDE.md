# 多人會議功能說明

## 🎯 目前狀況

**簡化版 meeting.html**：
- ✅ 語音識別正常
- ✅ Whisper AI 混合模式
- ✅ 綠色框框
- ❌ **沒有多人同步**
- ❌ 每個人都在獨立的會議室

## 💡 要實現多人功能需要

### 1. 會議室 ID
所有人加入同一個房間（例如 "main-room"）

### 2. Supabase Realtime 訂閱
- 同步參與者列表
- 同步字幕內容
- 即時更新

### 3. 參與者管理
- 顯示所有在線的人
- 更新參與者狀態
- 離開時清理

---

## ⚙️ 實現方式

### 選項 1：使用原本的完整版模組（推薦）

**優點**：
- ✅ 功能完整
- ✅ 已經實作好
- ✅ 包含管理員面板

**缺點**：
- ⚠️ 需要整合多個 JS 檔案
- ⚠️ 較複雜

**檔案**：
- `js/meeting-room.js` - 會議室管理
- `js/caption-manager.js` - 字幕同步
- `js/meeting-controller.js` - 控制器

### 選項 2：在簡化版上加入基本多人功能

**優點**：
- ✅ 保持簡單
- ✅ 只加入必要功能

**缺點**：
- ❌ 沒有管理員面板
- ❌ 功能較少

---

## 🚀 快速解決方案

### 最簡單的方式：固定會議室 ID

在簡化版加入：

```javascript
const MEETING_ID = 'main-room';  // 固定的會議室 ID

// 加入會議室
async function joinMeeting() {
    await supabaseClient
        .from('participants')
        .insert({
            meeting_id: MEETING_ID,
            user_id: currentUser.id,
            user_name: currentUser.user_metadata.full_name,
            photo_url: currentUser.user_metadata.avatar_url
        });
}

// 訂閱參與者變化
supabaseClient
    .channel('participants')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `meeting_id=eq.${MEETING_ID}`
    }, (payload) => {
        updateParticipantList();
    })
    .subscribe();

// 訂閱字幕
supabaseClient
    .channel('captions')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'captions',
        filter: `meeting_id=eq.${MEETING_ID}`
    }, (payload) => {
        displayCaption(payload.new);
    })
    .subscribe();
```

---

## 📋 建議

**短期**（現在）：
- 先測試語音識別功能
- 確認 Whisper AI 是否正常

**中期**（之後）：
- 整合完整版模組
- 實現真正的多人會議

---

## ❓ 您的選擇

1. **現在就要多人功能** - 我幫您整合完整版
2. **先測試語音識別** - 之後再加多人功能

告訴我您的決定！😊
