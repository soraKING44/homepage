document.addEventListener("DOMContentLoaded", function() {

    // サイトのデフォルト配色を定義
    const DEFAULT_COLORS = {
        main: '#8B2C3A',
        sub: '#1A234B'
    };

    const root = document.documentElement;
    const basePath = document.body.dataset.basePath;

    // --- ユーティリティ関数群 ---

    /**
     * 指定された16進数カラーコードを暗くする
     */
    function darkenColor(hex, percent) {
        if (!hex || !hex.startsWith('#')) return '#000000';
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);
        const toHex = c => ('0' + Math.max(0, c).toString(16)).slice(-2);
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * 背景色から適切な文字色（白/黒）を決定する
     */
    function getTextColorForBackground(hexcolor) {
        if (!hexcolor || !hexcolor.startsWith('#')) return '#1f2937';
        const r = parseInt(hexcolor.substring(1, 3), 16);
        const g = parseInt(hexcolor.substring(3, 5), 16);
        const b = parseInt(hexcolor.substring(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1f2937' : '#ffffff';
    }

    /**
     * 通常の文字色から少し薄い文字色を生成する
     */
    function getMutedTextColor(textColor) {
        // return (textColor === '#ffffff') ? '#d1d5db' : '#4b5563';
        return (textColor === '#ffffff') ? '#e5e7eb' : '#374151';
    }

    /**
     * 色の輝度を計算する
     */
    function getLuminance(hexcolor) {
        if (!hexcolor || !hexcolor.startsWith('#')) return 0;
        const r = parseInt(hexcolor.substring(1, 3), 16);
        const g = parseInt(hexcolor.substring(3, 5), 16);
        const b = parseInt(hexcolor.substring(5, 7), 16);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
    }

    // --- メイン処理関数群 ---

    /**
     * ヘッダーとフッターを読み込み、イベントリスナーを設定する
     */
    function loadCommonComponents() {
        fetch(basePath + 'header.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('header-placeholder').innerHTML = data;
                const resetButton = document.getElementById('color-reset-button');
                if (resetButton) {
                    resetButton.addEventListener('click', () => {
                        localStorage.removeItem('reone-main-color');
                        localStorage.removeItem('reone-sub-color');
                        localStorage.removeItem('reone-main-darker');
                        localStorage.removeItem('reone-sub-darker');
                        window.location.reload();
                    });
                }

                const mobileMenuButton = document.getElementById('mobile-menu-button');
                const navMenu = document.getElementById('nav-menu');

                if (mobileMenuButton && navMenu) {
                // ヘッダー要素を取得
                    const header = document.querySelector('header');
                    const logo = header ? header.querySelector('.text-2xl') : null;

                    mobileMenuButton.addEventListener('click', () => {
                        const isMenuClosed = navMenu.classList.contains('hidden');
                        
                        // メニューのスタイル定義
                        const mobileMenuClasses = [
                            'fixed', 'inset-0', 'z-40',
                            'bg-main-darker',
                            'pt-20',
                            'px-8',
                            'flex', 'flex-col',
                            'items-start',
                            'space-y-8',
                            'text-xl',
                            'overflow-y-auto'
                        ];

                        // ボタン自体のスタイル定義
                        const buttonClasses = ['relative', 'z-50'];

                        if (isMenuClosed) {
                            // 開くとき
                            navMenu.classList.remove('hidden');
                            navMenu.classList.add(...mobileMenuClasses);
                            
                            // ボタンが隠れないように、メニューより手前(z-50)に持ってくる
                            mobileMenuButton.classList.add(...buttonClasses);
                            if (logo) logo.classList.add(...buttonClasses);

                            // ヘッダーのぼかし解除
                            if(header) header.classList.remove('backdrop-blur-md');
                        } else {
                            // 閉じるとき
                            navMenu.classList.add('hidden');
                            navMenu.classList.remove(...mobileMenuClasses);
                            
                            // ボタンのスタイルを元に戻す
                            mobileMenuButton.classList.remove(...buttonClasses);
                            if (logo) logo.classList.remove(...buttonClasses);

                            // ヘッダーのぼかし復帰
                            if(header) header.classList.add('backdrop-blur-md');
                        }
                    });
                }
            });

        fetch(basePath + 'footer.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('footer-placeholder').innerHTML = data;
            });
    }

    /**
     * テーマカラーを決定し、CSS変数に適用する
     */
    function applyThemeColors() {
        let mainColor = localStorage.getItem('reone-main-color');
        let subColor = localStorage.getItem('reone-sub-color');

        // 色が保存されていない場合は、デフォルトの色を設定する
        if (!mainColor || mainColor === 'null') {
            mainColor = DEFAULT_COLORS.main;
            subColor = DEFAULT_COLORS.sub;
            localStorage.setItem('reone-main-color', mainColor);
            localStorage.setItem('reone-sub-color', subColor);
        }

        const mainDarker = darkenColor(mainColor, 10);
        const subDarker = darkenColor(subColor, 10);

        root.style.setProperty('--main-color', mainColor);
        root.style.setProperty('--sub-color', subColor);
        root.style.setProperty('--main-color-darker', mainDarker);
        root.style.setProperty('--sub-color-darker', subDarker);

        const textOnMain = getTextColorForBackground(mainColor);
        const textOnSub = getTextColorForBackground(subColor);
        root.style.setProperty('--text-on-main', textOnMain);
        root.style.setProperty('--text-on-sub', textOnSub);
        root.style.setProperty('--text-on-main-muted', getMutedTextColor(textOnMain));
        root.style.setProperty('--text-on-sub-muted', getMutedTextColor(textOnSub));

        adjustCardUI(mainColor, subColor);
    }

    /**
     * 背景色の明暗に応じてカードUIのスタイルを調整する
     */
    function adjustCardUI(mainColor, subColor) {
        const luminanceThreshold = 150;
        const isMainDark = getLuminance(mainColor) < luminanceThreshold;
        const isSubDark = getLuminance(subColor) < luminanceThreshold;

        const styles = {
            black: '#1f2937',
            darkGray: '#4b5563',
            whiteBg: '#ffffff',
            shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            noBorder: '1px solid transparent',
            transparentBg: 'transparent',
            visibleBorder: `1px solid #4b5563`
        };

        if (isMainDark && isSubDark) {
            setCardProperties('main', styles.whiteBg, styles.shadow, styles.noBorder, mainColor, subColor);
            setCardProperties('sub', styles.whiteBg, styles.shadow, styles.noBorder, mainColor, subColor);
        } else if (isMainDark && !isSubDark) {
            setCardProperties('main', styles.whiteBg, styles.shadow, styles.noBorder, mainColor, styles.black);
            setCardProperties('sub', styles.transparentBg, styles.shadow, styles.visibleBorder, mainColor, styles.black);
        } else if (!isMainDark && isSubDark) {
            setCardProperties('main', styles.transparentBg, styles.shadow, styles.visibleBorder, subColor, styles.black);
            setCardProperties('sub', styles.whiteBg, styles.shadow, styles.noBorder, subColor, styles.black);
        } else {
            setCardProperties('main', styles.transparentBg, styles.shadow, styles.visibleBorder, styles.black, styles.darkGray);
            setCardProperties('sub', styles.transparentBg, styles.shadow, styles.visibleBorder, styles.black, styles.darkGray);
        }
    }

    /**
     * カードのCSSプロパティを一括で設定する
     */
    function setCardProperties(type, bg, shadow, border, heading, text) {
        root.style.setProperty(`--card-bg-on-${type}`, bg);
        root.style.setProperty(`--card-shadow-on-${type}`, shadow);
        root.style.setProperty(`--card-border-on-${type}`, border);
        root.style.setProperty(`--card-heading-on-${type}`, heading);
        root.style.setProperty(`--card-text-on-${type}`, text);
    }

    // --- 初期化処理の実行 ---
    loadCommonComponents();
    applyThemeColors();

});
