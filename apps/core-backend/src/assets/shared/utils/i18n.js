/**
 * Weaver2 자체 구현 i18n 시스템
 * 경량화된 국제화 라이브러리
 */

class WeaverI18n {
    constructor() {
        this.currentLang = this.getDefaultLanguage();
        this.translations = {};
        this.fallbackLang = 'en';
        this.loadedLanguages = new Set();
        
        // 전역 접근 가능하도록 설정
        window.i18n = this;
    }

    /**
     * 기본 언어 감지 (브라우저 설정, localStorage 순서)
     */
    getDefaultLanguage() {
        // localStorage에 저장된 언어 설정 확인
        const savedLang = localStorage.getItem('weaver_admin_language');
        if (savedLang) {
            return savedLang;
        }

        // 브라우저 언어 감지
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0]; // 'ko-KR' -> 'ko'
        
        // 지원하는 언어 목록
        const supportedLangs = ['ko', 'en', 'ja'];
        
        return supportedLangs.includes(langCode) ? langCode : 'en';
    }

    /**
     * 언어 파일 로딩
     * @param {string} lang - 언어 코드 (ko, en, ja)
     */
    async loadLanguage(lang) {
        if (this.loadedLanguages.has(lang)) {
            return; // 이미 로딩됨
        }

        try {
            const response = await fetch(`/shared/utils/languages/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Language file not found: ${lang}.json`);
            }
            
            const translations = await response.json();
            this.translations[lang] = translations;
            this.loadedLanguages.add(lang);
            
            console.log(`[i18n] Loaded language: ${lang}`);
        } catch (error) {
            console.error(`[i18n] Failed to load language ${lang}:`, error);
            
            // fallback 언어도 로딩 실패 시 빈 객체로 초기화
            if (!this.translations[lang]) {
                this.translations[lang] = {};
            }
        }
    }

    /**
     * 언어 변경
     * @param {string} lang - 변경할 언어 코드
     */
    async setLanguage(lang) {
        await this.loadLanguage(lang);
        this.currentLang = lang;
        
        // localStorage에 저장
        localStorage.setItem('weaver_admin_language', lang);
        
        // 언어 변경 이벤트 발생
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
        
        console.log(`[i18n] Language changed to: ${lang}`);
    }

    /**
     * 번역 함수
     * @param {string} key - 번역 키 (예: 'admin.dashboard.title')
     * @param {Object} params - 치환할 매개변수
     * @returns {string} 번역된 텍스트
     */
    t(key, params = {}) {
        let translation = this.getTranslation(key, this.currentLang);
        
        // 현재 언어에서 번역을 찾지 못한 경우 fallback 언어 시도
        if (!translation && this.currentLang !== this.fallbackLang) {
            translation = this.getTranslation(key, this.fallbackLang);
        }
        
        // 번역을 찾지 못한 경우 키 자체를 반환 (개발 시 확인용)
        if (!translation) {
            console.warn(`[i18n] Missing translation for key: ${key}`);
            return key;
        }
        
        // 매개변수 치환
        return this.interpolate(translation, params);
    }

    /**
     * 중첩된 키로 번역 값 가져오기
     * @param {string} key - 점으로 구분된 키 (예: 'admin.dashboard.title')
     * @param {string} lang - 언어 코드
     * @returns {string|null} 번역 값
     */
    getTranslation(key, lang) {
        const langTranslations = this.translations[lang];
        if (!langTranslations) {
            return null;
        }

        const keys = key.split('.');
        let current = langTranslations;
        
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return null;
            }
        }
        
        return typeof current === 'string' ? current : null;
    }

    /**
     * 문자열에서 매개변수 치환
     * @param {string} text - 치환할 텍스트
     * @param {Object} params - 매개변수 객체
     * @returns {string} 치환된 텍스트
     */
    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params.hasOwnProperty(key) ? params[key] : match;
        });
    }

    /**
     * 현재 언어 가져오기
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * 지원하는 언어 목록
     */
    getSupportedLanguages() {
        return [
            { code: 'ko', name: '한국어', nativeName: '한국어' },
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'ja', name: 'Japanese', nativeName: '日本語' }
        ];
    }

    /**
     * 초기화 (페이지 로드 시 호출)
     */
    async initialize() {
        await this.loadLanguage(this.currentLang);
        
        // fallback 언어도 미리 로딩
        if (this.currentLang !== this.fallbackLang) {
            await this.loadLanguage(this.fallbackLang);
        }
        
        console.log(`[i18n] Initialized with language: ${this.currentLang}`);
    }
}

// 전역 i18n 인스턴스 생성
const weaverI18n = new WeaverI18n();

// DOM 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    weaverI18n.initialize();
});

// 편의성을 위한 단축 함수들
window.t = (key, params) => weaverI18n.t(key, params);
window.setLanguage = (lang) => weaverI18n.setLanguage(lang);
window.getCurrentLanguage = () => weaverI18n.getCurrentLanguage();

export default weaverI18n;