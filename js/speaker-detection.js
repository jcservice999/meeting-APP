// 說話者檢測模組
class SpeakerDetection {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isDetecting = false;
        this.isSpeaking = false;
        this.threshold = 30; // 音量閾值
        this.smoothingFactor = 0.8;
    }

    // 初始化
    async init() {
        try {
            // 請求麥克風權限
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // 建立音訊分析器
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = this.smoothingFactor;

            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            console.log('Speaker detection initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize speaker detection:', error);
            alert('無法存取麥克風。請確認已授予麥克風權限。');
            return false;
        }
    }

    // 開始檢測
    startDetection() {
        if (!this.analyser) {
            console.error('Speaker detection not initialized');
            return;
        }

        this.isDetecting = true;
        this.detectLoop();
    }

    // 停止檢測
    stopDetection() {
        this.isDetecting = false;
        if (this.isSpeaking) {
            this.setSpeakingStatus(false);
        }
    }

    // 檢測循環
    detectLoop() {
        if (!this.isDetecting) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        // 計算平均音量
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

        // 判斷是否在說話
        const speaking = average > this.threshold;

        if (speaking !== this.isSpeaking) {
            this.isSpeaking = speaking;
            this.setSpeakingStatus(speaking);
        }

        // 繼續檢測
        requestAnimationFrame(() => this.detectLoop());
    }

    // 設定說話狀態
    setSpeakingStatus(isSpeaking) {
        // 更新 Firebase
        if (meetingRoom && meetingRoom.isJoined) {
            meetingRoom.updateSpeakingStatus(isSpeaking);
        }

        // 觸發事件
        window.dispatchEvent(new CustomEvent('speakingStatusChanged', {
            detail: { isSpeaking }
        }));
    }

    // 調整閾值
    setThreshold(value) {
        this.threshold = value;
    }

    // 清理
    cleanup() {
        this.stopDetection();
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// 建立全域實例
window.speakerDetection = new SpeakerDetection();
