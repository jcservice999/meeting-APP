// 語音識別模組
class SpeechRecognition {
    constructor() {
        this.recognition = null;
        this.isRecognizing = false;
        this.currentLanguage = 'zh-TW';
    }

    // 初始化
    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('您的瀏覽器不支援語音識別功能。請使用 Chrome 或 Edge 瀏覽器。');
            return false;
        }

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognitionAPI();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;

        // 監聽結果
        this.recognition.onresult = (event) => {
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                }
            }

            if (finalTranscript.trim()) {
                this.handleTranscript(finalTranscript.trim());
            }
        };

        // 錯誤處理
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // 靜音時自動重啟
                if (this.isRecognizing) {
                    setTimeout(() => this.recognition.start(), 100);
                }
            }
        };

        // 自動重啟
        this.recognition.onend = () => {
            if (this.isRecognizing) {
                this.recognition.start();
            }
        };

        return true;
    }

    // 開始識別
    start() {
        if (!this.recognition) {
            console.error('Speech recognition not initialized');
            return;
        }

        try {
            this.recognition.start();
            this.isRecognizing = true;
            console.log('Speech recognition started');
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
        }
    }

    // 停止識別
    stop() {
        if (this.recognition && this.isRecognizing) {
            this.recognition.stop();
            this.isRecognizing = false;
            console.log('Speech recognition stopped');
        }
    }

    // 切換語言
    setLanguage(language) {
        const langMap = {
            'zh': 'zh-TW',
            'en': 'en-US'
        };

        this.currentLanguage = langMap[language] || language;

        if (this.recognition) {
            this.recognition.lang = this.currentLanguage;
        }
    }

    // 處理轉錄結果
    handleTranscript(text) {
        // 儲存到字幕管理器
        if (captionManager) {
            const language = this.currentLanguage.startsWith('zh') ? 'zh' : 'en';
            captionManager.addCaptionToFirebase(text, language);
        }
    }

    // 清理
    cleanup() {
        this.stop();
    }
}

// 建立全域實例
window.speechRecognition = new SpeechRecognition();
