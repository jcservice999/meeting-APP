# Whisper.cpp WebAssembly 整合指南

## 📋 概述

Whisper.cpp 是 OpenAI Whisper 模型的 C++ 實作，可以編譯成 WebAssembly 在瀏覽器中運行。

**優點**：
- ✅ **完全免費** - 開源軟體，無需 API 金鑰
- ✅ **高準確度** - 比 Web Speech API 準確很多
- ✅ **隱私保護** - 所有運算在本地執行
- ✅ **離線可用** - 不需要網路連線

**缺點**：
- ⚠️ 首次載入需要下載模型（約 75MB）
- ⚠️ 需要較多記憶體（約 200-500MB）
- ⚠️ 處理速度較慢（非即時）

---

## 🚀 整合步驟

### 方案 1：使用預編譯的 whisper.cpp（推薦）

使用社群維護的 whisper.cpp WebAssembly 版本。

#### 1. 下載 whisper.cpp

```bash
# 在專案目錄下
mkdir lib
cd lib
git clone https://github.com/ggerganov/whisper.cpp.git
```

#### 2. 下載 Whisper 模型

選擇一個模型（建議使用 `base` 或 `small`）：

| 模型 | 大小 | 記憶體 | 速度 | 準確度 |
|------|------|--------|------|--------|
| tiny | 75 MB | ~390 MB | 最快 | 較低 |
| base | 142 MB | ~500 MB | 快 | 中等 |
| small | 466 MB | ~1.0 GB | 中等 | 高 |

```bash
# 下載 base 模型（推薦）
cd whisper.cpp/models
./download-ggml-model.sh base
```

#### 3. 編譯 WebAssembly

```bash
cd ..
mkdir build
cd build
emcmake cmake ..
emmake make whisper.wasm
```

---

### 方案 2：使用 CDN（更簡單）

使用已經編譯好的版本：

```html
<!-- 載入 whisper.cpp WebAssembly -->
<script src="https://cdn.jsdelivr.net/npm/@ggerganov/whisper.cpp@1.5.4/whisper.js"></script>
```

---

## 💻 程式碼整合

### 1. 建立 Whisper 管理器

```javascript
class WhisperManager {
    constructor() {
        this.whisper = null;
        this.model = null;
        this.isLoaded = false;
    }

    async init() {
        // 載入 whisper.cpp
        this.whisper = await createWhisper();
        
        // 載入模型
        const modelUrl = 'models/ggml-base.bin';
        this.model = await this.whisper.loadModel(modelUrl);
        
        this.isLoaded = true;
        console.log('✅ Whisper 已載入');
    }

    async transcribe(audioBlob) {
        if (!this.isLoaded) {
            throw new Error('Whisper 尚未載入');
        }

        // 轉換音訊格式
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioData = new Float32Array(audioBuffer);

        // 執行轉錄
        const result = await this.whisper.transcribe(this.model, audioData, {
            language: 'zh',
            translate: false
        });

        return result.text;
    }
}
```

### 2. 整合到會議介面

```javascript
let whisperManager = null;

// 初始化
async function initWhisper() {
    const statusEl = document.getElementById('status');
    statusEl.textContent = '正在載入 Whisper 模型...';
    
    whisperManager = new WhisperManager();
    await whisperManager.init();
    
    statusEl.textContent = '✅ Whisper 已就緒';
}

// 錄音並轉錄
async function recordAndTranscribe() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const text = await whisperManager.transcribe(audioBlob);
        addCaption(text);
    };

    // 錄音 5 秒
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000);
}
```

---

## ⚠️ 注意事項

### 1. 模型大小

- **tiny**: 適合測試，準確度較低
- **base**: 推薦用於生產環境
- **small**: 準確度高但較慢

### 2. 記憶體使用

Whisper 需要較多記憶體，建議：
- 使用 `base` 模型
- 定期清理記憶體
- 避免同時處理多個音訊

### 3. 處理速度

Whisper 不是即時的：
- 5 秒音訊約需 2-5 秒處理
- 建議分段錄音（每 5-10 秒）
- 顯示處理進度

---

## 🎯 實際使用建議

### 混合方案（推薦）

1. **即時顯示** - 使用 Web Speech API
2. **後處理修正** - 使用 Whisper.cpp

```javascript
// 即時顯示（Web Speech API）
recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    showTemporaryCaption(transcript); // 即時顯示
};

// 後處理（Whisper）
mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(chunks);
    const accurateText = await whisperManager.transcribe(audioBlob);
    updateCaption(accurateText); // 更新為準確版本
};
```

---

## 📦 完整範例

請參考 `meeting-whisper.html` 的完整實作。

---

## 🔧 疑難排解

**Q: 模型載入失敗**  
A: 確認模型檔案路徑正確，檔案完整下載

**Q: 記憶體不足**  
A: 使用更小的模型（tiny 或 base）

**Q: 處理太慢**  
A: 縮短錄音片段長度（5-10 秒）

**Q: 準確度不佳**  
A: 使用更大的模型（small），確保音訊品質良好

---

## ✅ 總結

Whisper.cpp WebAssembly 提供了高準確度的語音識別，完全免費且保護隱私。

**建議配置**：
- 模型：base
- 錄音長度：5-10 秒
- 混合使用 Web Speech API 提供即時反饋
