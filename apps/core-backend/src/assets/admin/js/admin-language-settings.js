/**
 * Admin Language Settings Management
 * i18n 시스템과 통합된 언어 설정 관리
 */

class LanguageSettingsManager {
    constructor() {
        this.currentLanguage = 'ko';
        this.supportedLanguages = [
            { code: 'ko', name: '한국어', nativeName: '한국어', flag: '🇰🇷' },
            { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
            { code: 'ja', name: '日本語', nativeName: '日本語', flag: '🇯🇵' }
        ];
        this.init();
    }

    async init() {
        // i18n 시스템이 로드될 때까지 대기
        await this.waitForI18n();
        this.currentLanguage = window.getCurrentLanguage();
        this.setupLanguageChangeListener();
    }

    /**
     * i18n 시스템이 로드될 때까지 대기
     */
    waitForI18n() {
        return new Promise((resolve) => {
            if (typeof window.i18n !== 'undefined') {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (typeof window.i18n !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            }
        });
    }

    /**
     * 언어 변경 이벤트 리스너 설정
     */
    setupLanguageChangeListener() {
        document.addEventListener('languageChanged', (event) => {
            this.currentLanguage = event.detail.language;
            this.updateLanguageDisplay();
            console.log(`[LanguageSettings] Language changed to: ${this.currentLanguage}`);
        });
    }

    /**
     * 언어 설정 탭 컨텐츠 생성
     */
    createLanguageSettingsContent() {
        const currentLangInfo = this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
        
        return `
            <div class="card">
                <div class="card-content">
                    <h3 class="text-primary mb-4">
                        <i class="fas fa-language"></i> ${window.t ? window.t('admin.settings.language.title') : 'Language Settings'}
                    </h3>
                    
                    <div class="form-group">
                        <label class="form-label">
                            ${window.t ? window.t('admin.settings.language.current') : 'Current Language'}
                        </label>
                        <div class="current-language-display">
                            <div class="language-badge">
                                <span class="language-flag">${currentLangInfo.flag}</span>
                                <span class="language-name">${currentLangInfo.nativeName}</span>
                                <span class="language-code">(${currentLangInfo.code.toUpperCase()})</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            ${window.t ? window.t('admin.settings.language.change') : 'Change Language'}
                        </label>
                        <p class="text-secondary mb-3">
                            ${window.t ? window.t('admin.settings.language.description') : 'Select the display language for admin pages'}
                        </p>
                        
                        <div class="language-options">
                            ${this.supportedLanguages.map(lang => `
                                <div class="language-option ${lang.code === this.currentLanguage ? 'active' : ''}" 
                                     data-lang="${lang.code}">
                                    <div class="language-option-content">
                                        <span class="language-flag">${lang.flag}</span>
                                        <div class="language-info">
                                            <div class="language-native">${lang.nativeName}</div>
                                            <div class="language-english">${lang.name}</div>
                                        </div>
                                        <div class="language-radio">
                                            <input type="radio" name="language" value="${lang.code}" 
                                                   ${lang.code === this.currentLanguage ? 'checked' : ''}
                                                   id="lang-${lang.code}">
                                            <label for="lang-${lang.code}"></label>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-primary" id="save-language-btn">
                            <i class="fas fa-save"></i> ${window.t ? window.t('admin.actions.apply') : 'Apply'}
                        </button>
                        <button type="button" class="btn btn-secondary ml-2" id="reset-language-btn">
                            <i class="fas fa-undo"></i> ${window.t ? window.t('admin.actions.cancel') : 'Cancel'}
                        </button>
                    </div>
                </div>
            </div>

            <style>
                .current-language-display {
                    margin-bottom: 1.5rem;
                }

                .language-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: var(--glass-bg-strong);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    backdrop-filter: var(--blur-light);
                }

                .language-flag {
                    font-size: 1.25rem;
                }

                .language-name {
                    font-weight: var(--font-weight-semibold);
                    color: var(--text-primary);
                }

                .language-code {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }

                .language-options {
                    display: grid;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .language-option {
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    background: var(--glass-bg);
                    backdrop-filter: var(--blur-light);
                    transition: var(--transition);
                    cursor: pointer;
                    overflow: hidden;
                }

                .language-option:hover {
                    border-color: var(--border-color-hover);
                    background: var(--glass-bg-hover);
                    transform: translateY(-1px);
                }

                .language-option.active {
                    border-color: var(--primary-blue);
                    background: rgba(59, 130, 246, 0.1);
                }

                .language-option-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                }

                .language-info {
                    flex: 1;
                }

                .language-native {
                    font-weight: var(--font-weight-semibold);
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .language-english {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }

                .language-radio {
                    position: relative;
                }

                .language-radio input[type="radio"] {
                    opacity: 0;
                    position: absolute;
                }

                .language-radio label {
                    display: block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-color);
                    border-radius: 50%;
                    background: var(--glass-bg);
                    cursor: pointer;
                    position: relative;
                    margin: 0;
                }

                .language-radio input[type="radio"]:checked + label {
                    border-color: var(--primary-blue);
                    background: var(--primary-blue);
                }

                .language-radio input[type="radio"]:checked + label::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: white;
                }

                .form-actions {
                    display: flex;
                    align-items: center;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                }

                .ml-2 {
                    margin-left: 0.5rem;
                }
            </style>
        `;
    }

    /**
     * 언어 설정 이벤트 리스너 설정
     */
    setupLanguageSettingsEvents() {
        // 언어 옵션 클릭 이벤트
        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', () => {
                const langCode = option.dataset.lang;
                this.selectLanguage(langCode);
            });
        });

        // 적용 버튼 클릭 이벤트
        const saveBtn = document.getElementById('save-language-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.applyLanguageChange();
            });
        }

        // 취소 버튼 클릭 이벤트
        const resetBtn = document.getElementById('reset-language-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetLanguageSelection();
            });
        }
    }

    /**
     * 언어 선택
     */
    selectLanguage(langCode) {
        // 모든 옵션에서 active 클래스 제거
        document.querySelectorAll('.language-option').forEach(option => {
            option.classList.remove('active');
        });

        // 선택된 옵션에 active 클래스 추가
        const selectedOption = document.querySelector(`[data-lang="${langCode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        // 라디오 버튼 체크
        const radioButton = document.getElementById(`lang-${langCode}`);
        if (radioButton) {
            radioButton.checked = true;
        }
    }

    /**
     * 언어 변경 적용
     */
    async applyLanguageChange() {
        const selectedLang = document.querySelector('input[name="language"]:checked')?.value;
        
        if (!selectedLang) {
            alert('Please select a language');
            return;
        }

        if (selectedLang === this.currentLanguage) {
            alert('Selected language is already active');
            return;
        }

        try {
            // 로딩 상태 표시
            const saveBtn = document.getElementById('save-language-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
            saveBtn.disabled = true;

            // 언어 변경
            await window.setLanguage(selectedLang);
            
            // 성공 메시지
            alert(`Language changed to ${this.supportedLanguages.find(lang => lang.code === selectedLang)?.nativeName || selectedLang}`);
            
            // 페이지 새로고침 (완전한 언어 적용을 위해)
            setTimeout(() => {
                window.location.reload();
            }, 500);

        } catch (error) {
            console.error('Failed to change language:', error);
            alert('Failed to change language. Please try again.');
            
            // 버튼 상태 복원
            const saveBtn = document.getElementById('save-language-btn');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    /**
     * 언어 선택 초기화
     */
    resetLanguageSelection() {
        this.selectLanguage(this.currentLanguage);
    }

    /**
     * 언어 표시 업데이트
     */
    updateLanguageDisplay() {
        // 현재 언어 배지 업데이트
        const currentLangInfo = this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
        const languageBadge = document.querySelector('.language-badge');
        
        if (languageBadge && currentLangInfo) {
            languageBadge.innerHTML = `
                <span class="language-flag">${currentLangInfo.flag}</span>
                <span class="language-name">${currentLangInfo.nativeName}</span>
                <span class="language-code">(${currentLangInfo.code.toUpperCase()})</span>
            `;
        }

        // 활성 상태 업데이트
        this.selectLanguage(this.currentLanguage);
    }
}

// 전역 인스턴스 생성
window.LanguageSettingsManager = LanguageSettingsManager;