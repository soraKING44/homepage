document.addEventListener('DOMContentLoaded', () => {

    // --- ページ判定 ---
    // ページ内にあるユニークなIDで、どちらのHTMLかを判定します
    const isIntroPage = document.getElementById('page-home') !== null;
    const isGamePage = document.querySelector('#page-recollection, #page-assign, #page-character-list') !== null;

    // =================================================================
    // --- 導入ページ (index.html) の処理 ---
    // =================================================================
    if (isIntroPage) {
        async function initializeIntroPage() {
            try {
                // 必要なテキストファイルを並行して読み込む
                const [verResponse, introResponse, precResponse, howToPlayResponse] = await Promise.all([
                    fetch('./version.json'),
                    fetch('./text/introduction.txt'),
                    fetch('./text/precautions.txt'),
                    fetch('./text/how_to_play.txt')
                ]);

                // すべてのレスポンスが正常か確認
                const responses = [verResponse, introResponse, precResponse, howToPlayResponse];
                for (const res of responses) {
                    if (!res.ok) {
                        throw new Error(`Failed to fetch ${res.url}: ${res.statusText}`);
                    }
                }

                // バージョン情報をフッターに表示
                const verData = await verResponse.json();
                const versionNumberEl = document.getElementById('version-number');
                if (versionNumberEl) {
                    versionNumberEl.textContent = verData.version;
                }

                // 平文用の表示関数
                const renderTextToContainer = async (response, containerId) => {
                    const text = await response.text();
                    const lines = text.trim().split(/\r?\n/);
                    const title = lines[0];
                    const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                    const container = document.getElementById(containerId);
                    if (container) {
                         container.innerHTML = `<h3>${title}</h3><div>${body}</div>`;
                    }
                };
                
                // HTML用の表示関数
                const renderHTMLToContainer = async (response, containerId) => {
                     const text = await response.text();
                     const container = document.getElementById(containerId);
                     if(container){
                        // 1行目をタイトル、2行目以降を本文として分割・表示
                        const lines = text.trim().split(/\r?\n/);
                        const title = lines[0];
                        const body = lines.slice(1).join('');
                        container.innerHTML = `<h3>${title}</h3><div>${body}</div>`;
                     }
                };

                // 各コンテナに内容を表示
                await renderTextToContainer(introResponse, 'introduction-box');
                // 注意事項とゲームのはじめ方はHTML用関数を使用
                await renderHTMLToContainer(precResponse, 'precautions-box');
                await renderHTMLToContainer(howToPlayResponse, 'how-to-play-box');

            } catch (error) {
                console.error("導入ページの読み込みに失敗しました: ", error);
                alert("ゲームデータの読み込みに失敗しました。ページをリフレッシュしてください。");
            }
        }
        // 導入ページの初期化を実行
        initializeIntroPage();
    }


    // =================================================================
    // --- ゲームページ (game.html) の処理 ---
    // =================================================================
    if (isGamePage) {

        class TimerComponent {
            constructor(options) {
                this.minutesEl = document.getElementById(options.minutesElId);
                this.secondsEl = document.getElementById(options.secondsElId);
                this.setMinutesEl = document.getElementById(options.setMinutesElId);
                
                this.initialSeconds = options.initialMinutes * 60;
                this.secondsRemaining = this.initialSeconds;
                this.timerId = null;

                // 対応する要素がない場合は、処理を中断
                if (!this.minutesEl) return;

                document.getElementById(options.startButtonId)?.addEventListener('click', () => this.start());
                document.getElementById(options.stopButtonId)?.addEventListener('click', () => this.stop());
                document.getElementById(options.resetButtonId)?.addEventListener('click', () => this.reset());
                document.getElementById(options.setButtonId)?.addEventListener('click', () => this.set());

                this.updateDisplay();
            }

            updateDisplay() {
                const minutes = Math.floor(this.secondsRemaining / 60);
                const seconds = this.secondsRemaining % 60;
                this.minutesEl.textContent = String(minutes).padStart(2, '0');
                this.secondsEl.textContent = String(seconds).padStart(2, '0');
            }

            start() {
                if (this.timerId) return;
                this.timerId = setInterval(() => {
                    this.secondsRemaining--;
                    this.updateDisplay();
                    if (this.secondsRemaining <= 0) {
                        this.stop();
                        this.secondsRemaining = 0;
                        this.updateDisplay();
                        playTimerEndSound(); // グローバルな効果音関数を呼び出し
                        showModal("時間が終了しました。"); // グローバルなモーダル関数を呼び出し
                    }
                }, 1000);
            }

            stop() {
                clearInterval(this.timerId);
                this.timerId = null;
            }

            reset() {
                this.stop();
                this.secondsRemaining = this.initialSeconds;
                // 設定入力欄も初期値に戻す
                if (this.setMinutesEl) {
                    this.setMinutesEl.value = this.initialSeconds / 60;
                }
                this.updateDisplay();
            }
            
            set() {
                const minutes = parseInt(this.setMinutesEl.value, 10);
                if (minutes > 0 && minutes <= 120) {
                    this.stop();
                    this.secondsRemaining = minutes * 60;
                    this.updateDisplay();
                } else {
                    showModal("1～120分で設定してください。");
                }
            }
        }

        let gameRoles = [];
        let gameData = {
            introduction: null,
            recollection: null
        };
        let currentState = {
            currentPage: 'home',
            selectedRole: null,
            soundInitialized: false
        };
        let sounds = {};

        // --- サウンド設定 (Tone.js) ---
        function initializeSounds() {
            if (currentState.soundInitialized) return;
            try {
                sounds.click = new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.1, envelope: { attack: 0.001, decay: 0.2, sustain: 0 }, }).toDestination();
                sounds.timerEnd = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 }, }).toDestination();
                currentState.soundInitialized = true;
            } catch (e) {
                console.error("Could not initialize sounds:", e);
            }
        }
        function playClickSound() { if (!currentState.soundInitialized || !sounds.click) return; try { sounds.click.triggerAttackRelease("C2", "8n", Tone.now()); } catch (e) { console.error("Error playing click sound:", e); } }
        function playTimerEndSound() { if (!currentState.soundInitialized || !sounds.timerEnd) return; try { const now = Tone.now(); sounds.timerEnd.triggerAttackRelease("G5", "8n", now); sounds.timerEnd.triggerAttackRelease("G5", "8n", now + 0.2); sounds.timerEnd.triggerAttackRelease("G5", "8n", now + 0.4); } catch (e) { console.error("Error playing timer end sound:", e); } }
        function startAudioContext() { if (Tone.context.state !== 'running') { Tone.start().then(() => { initializeSounds(); }).catch(e => { console.error("Could not start AudioContext:", e); }); } else if (!currentState.soundInitialized) { initializeSounds(); } }

        // --- DOM要素 ---
        const pages = document.querySelectorAll('.page');
        const appContainer = document.getElementById('app-container');
        const modal = document.getElementById('custom-modal');
        const modalText = document.getElementById('modal-text');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const infoModal = document.getElementById('info-modal');
        const infoModalTitle = document.getElementById('info-modal-title');
        const infoModalBody = document.getElementById('info-modal-body');
        const infoModalCloseBtn = document.getElementById('info-modal-close-btn');
        const infoSidebar = document.getElementById('info-sidebar');

        // --- モーダル関数 ---
        function showModal(message) { modalText.innerHTML = message; modal.classList.add('active'); }
        function hideModal() { modal.classList.remove('active'); }
        function showInfoModal(title, contentHTML) {
            const infoModalBody = document.getElementById('info-modal-body');
            infoModalTitle.innerHTML = title;
            infoModalBody.innerHTML = contentHTML;
            
            infoModal.classList.add('active');
            document.body.classList.add('modal-open');

            // ポップアップが表示された直後に、中身のスクロールを一番上に戻す
            if (infoModalBody) {
                infoModalBody.scrollTop = 0;
            }
        }
        function hideInfoModal() { infoModal.classList.remove('active'); document.body.classList.remove('modal-open'); }

        // --- ナビゲーション & ルーティング ---
        function navigateTo(pageId) { window.location.hash = pageId; }
        
        function showPage(pageId) {
            // ページIDと表示するボタンの対応表
            const sidebarConfig = {
                'character-hub':       ['intro', 'recollection1', 'recollection2', 'recollection3', 'info1', 'info2'],
                'conference':          ['intro', 'recollection1', 'recollection2', 'recollection3', 'info1', 'info2', 'patrol-log'],
                'conference-2':        ['intro', 'recollection1', 'recollection2', 'recollection3', 'info1', 'info2', 'patrol-log', 'conference1'],
                'mansion-exploration': ['intro', 'recollection1', 'recollection2', 'recollection3', 'info1', 'info2', 'patrol-log', 'conference1', 'conference2'],
                'final-discussion':    ['intro', 'recollection1', 'recollection2', 'recollection3', 'info1', 'info2', 'patrol-log', 'conference1', 'conference2', 'exploration'],
            };

            const allButtons = {
                'intro': document.getElementById('btn-show-intro-sidebar'),
                'recollection1': document.getElementById('btn-show-recollection-1'),
                'recollection2': document.getElementById('btn-show-recollection-2'),
                'recollection3': document.getElementById('btn-show-recollection-3'),
                'info1': document.getElementById('btn-show-info-1'),
                'info2': document.getElementById('btn-show-info-2'),
                'patrol-log': document.getElementById('btn-show-patrol-log'),
                'conference1': document.getElementById('btn-show-conference-1'),
                'conference2': document.getElementById('btn-show-conference-2'),
                'exploration': document.getElementById('btn-show-exploration-sidebar'),
            };

            const visibleButtons = sidebarConfig[pageId] || [];
            // const infoSidebar = document.getElementById('info-sidebar');
            const infoSidebar = document.getElementById('info-sidebar');
            const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
            const hasButtons = visibleButtons.length > 0;
            const isMobile = window.innerWidth <= 768;

            // サイドバーのコンテナ自体を表示するかどうか
            if (infoSidebar) {
                infoSidebar.style.display = hasButtons ? 'flex' : 'none';
            }

            // トグルボタンを表示するかどうか（モバイルかつボタンがある場合のみ）
            if (sidebarToggleBtn) {
                sidebarToggleBtn.style.display = (isMobile && hasButtons) ? 'block' : 'none';
            }
            
            // サイドバーの開閉状態を決定する
            if (infoSidebar && hasButtons) {
                if (isMobile) {
                    // モバイルの場合は、常に閉じた状態から開始
                    infoSidebar.classList.remove('visible');
                } else {
                    // PCの場合は、常に開いた状態から開始
                    infoSidebar.classList.add('visible');
                }
            }

            // 各ボタンの表示・非表示を切り替え
            for (const key in allButtons) {
                if (allButtons[key]) {
                    allButtons[key].style.display = visibleButtons.includes(key) ? 'block' : 'none';
                }
            }

            pages.forEach(page => {
                page.classList.toggle('active', page.id === `page-${pageId}`);
            });
            currentState.currentPage = pageId;
            window.scrollTo(0, 0);
        }

        async function handleRouteChange() {
            const hash = window.location.hash.substring(1);
            const pageId = hash || 'recollection';

            // ページごとの描画処理
            if (pageId.startsWith('role-')) {
                const roleId = pageId.replace('role-', '');
                await renderCharacterHub(roleId);
                showPage('character-hub');
            } else if (pageId === 'assign') {
                showPage('assign');
            } else if (pageId === 'recollection') {
                await renderRecollectionScenes();
                showPage('recollection');
            } else if (pageId === 'character-list') {
                await renderCharacterList();
                showPage('character-list');
            } else if (pageId.startsWith('confirm-')) {
                const roleId = pageId.replace('confirm-', '');
                const roleData = gameRoles.find(r => r.id === roleId);
                currentState.selectedRole = roleId;
                document.getElementById('confirm-character-name').textContent = `【 ${roleData ? roleData.name : '不明'} 】`;
                showPage('confirm');
            } else if (pageId === 'ending') {
                await renderEnding();
                showPage('ending');
            } else if (pageId === 'conference') {
                await renderConferencePage();
                showPage('conference');
            } else if (pageId === 'conference-2') {
                await renderConferencePage2();
                showPage('conference-2');
            } else if (pageId === 'mansion-exploration') {
                await renderMansionExplorationPage();
                showPage('mansion-exploration');
            } else if (pageId === 'final-discussion') {
                await renderFinalDiscussion();
                showPage('final-discussion');
            } else if (pageId === 'wrong-end') {
                await renderWrongEnd();
                showPage('wrong-end');
            } else if (pageId === 'normal-end') {
                await renderNormalEnd();
                showPage('normal-end');
            } else if (pageId === 'true-end') {
                await renderTrueEnd();
                showPage('true-end');
            } else {
                showPage(pageId); // その他のページ
            }
        }

        // --- ページ描画関数 (内容は変更なし) ---
        async function renderRecollectionScenes() {
            try {
                const [scene1Res, scene2Res, scene3Res] = await Promise.all([
                    fetch('./text/reminiscence1.txt'),
                    fetch('./text/reminiscence2.txt'),
                    fetch('./text/reminiscence3.txt')
                ]);
                const scenes = [
                    { res: scene1Res, containerId: 'recollection-scene-1' },
                    { res: scene2Res, containerId: 'recollection-scene-2' },
                    { res: scene3Res, containerId: 'recollection-scene-3' }
                ];
                for (const scene of scenes) {
                    if (!scene.res.ok) throw new Error(`Failed to fetch ${scene.res.url}`);
                    const text = await scene.res.text();
                    const lines = text.trim().split(/\r?\n/);
                    const title = lines[0];
                    const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                    const container = document.getElementById(scene.containerId);
                    if (container) container.innerHTML = `<h3>${title}</h3><div>${body}</div>`;
                }
            } catch (error) { console.error('回想シーンの読み込みに失敗:', error); showModal('回想シーンの読み込みに失敗しました。'); }
        }
        async function renderCharacterList() {
            try {
                const response = await fetch('./text/meta.json');
                if (!response.ok) throw new Error('Network response was not ok.');
                const meta = await response.json();
                const grid = document.getElementById('character-grid');
                grid.innerHTML = '';
                meta.roles.forEach(role => {
                    const card = document.createElement('div');
                    card.className = `character-card ${role.id}`;
                    card.dataset.roleId = role.id;
                    card.innerHTML = `<div><h3>${role.name}</h3></div>`;
                    card.addEventListener('click', () => navigateTo(`confirm-${role.id}`));
                    grid.appendChild(card);
                });
            } catch (error) { console.error('キャラクターリストの読み込みに失敗:', error); showModal('キャラクターリストの読み込みに失敗しました。'); }
        }
        async function renderCharacterHub(roleId) {
            try {
                const response = await fetch(`./text/${roleId}.json`);
                if (!response.ok) throw new Error('Network response was not ok.');
                const role = await response.json();
                document.getElementById('hub-character-name').textContent = role.name;
                const contentContainer = document.getElementById('hub-content');
                contentContainer.innerHTML = `
                    <div class="info-section mb-3"><h3>【個人の情報】</h3><div style="padding: 1rem 1.5rem;"><p>巡回記録は【個人の情報】です<br>ご自身はいつでも自由に読み返して構いませんが、このページを他のプレイヤーに見せてはいけません<br>書かれている内容を伝える場合は自分の言葉で伝えてください<br><br>導入・回想・情報1, 2は全員に公開されています。いつでも読み返せる情報です</p>時間の管理にタイマーをお使いください。目安は5分です<br></div></div>
                    <div class="info-section"><h3>巡回記録</h3><div style="padding: 1rem 1.5rem;"><p>警備員の皆様はオークションが行われている間、館内の4ヶ所を巡回します<br>巡回するエリアは4人とも同じですが、巡回するタイミングが異なります</p></div><div id="investigation-list">
                    ${role.investigation.map(item => `<div><div class="info-item"><span>${item.title}</span><i class="fas fa-chevron-down"></i></div><div class="info-content"><p>${item.content.replace(/\n/g, '<br>')}</p></div></div>`).join('')}
                    </div></div>`;
            } catch (error) {
                console.error('キャラクター情報の読み込みに失敗:', error);
                showModal('キャラクター情報の読み込みに失敗しました。<br>キャラクター選択画面に戻ります。');
                navigateTo('character-list');
            }
        }

        async function renderEnding() {
            const renderExplanation = async (filePath, containerId) => {
                try {
                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
                    const text = await response.text();
                    
                    const lines = text.trim().split(/\r?\n/);
                    const title = lines[0];

                    const body = lines.slice(1).map(line => {
                        if (line.startsWith('#### ')) {
                            return `<h4>${line.substring(5)}</h4>`;
                        }
                        const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        return `<p>${boldedLine || '&nbsp;'}</p>`;
                    }).join('');

                    const container = document.getElementById(containerId);
                    if (container) {
                        container.innerHTML = `
                            <h3>${title}</h3>
                            <div>${body}</div>
                        `;
                    }
                } catch (error) {
                    console.error(`解説ファイルの読み込みに失敗: ${filePath}`, error);
                    showModal('解説の読み込みに失敗しました。');
                }
            };

            // 両方の解説を描画
            await renderExplanation('./text/explanation_trick.txt', 'explanation-trick-content');
            await renderExplanation('./text/explanation_choice.txt', 'explanation-choice-content');
            await renderExplanation('./text/epilogue.txt', 'epilogue-content');
        }

        async function renderConferencePage() {
            // ファイルを読み込んで指定の枠に表示するヘルパー関数
            const renderScenePart = async (filePath, containerId) => {
                try {
                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
                    const text = await response.text();
                    
                    const lines = text.trim().split(/\r?\n/);
                    const title = lines[0];
                    const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');

                    const container = document.getElementById(containerId);
                    if (container) {
                        container.innerHTML = `
                            <h3>${title}</h3>
                            <div>${body}</div>
                        `;
                    }
                } catch (error) {
                    console.error(`シーンファイルの読み込みに失敗: ${filePath}`, error);
                    showModal('物語の読み込みに失敗しました。');
                }
            };

            // 2つのパートをそれぞれ描画
            await renderScenePart('./text/scene1_part1.txt', 'conference-scene1-part1');
            await renderScenePart('./text/scene1_part2.txt', 'conference-scene1-part2');
        }
        async function renderConferencePage2() {
            try {
                const res = await fetch('./text/scene2.txt'); if (!res.ok) throw new Error('scene2.txt not found');
                const text = await res.text();
                const lines = text.trim().split(/\r?\n/);
                const title = lines[0]; const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                document.getElementById('conference-scene2').innerHTML = `<h3 class="section-title">${title}</h3><div>${body}</div>`;
            } catch (error) { console.error('会議ページ2の読み込み失敗:', error); showModal('会議ページの読み込みに失敗しました。'); }
        }
        async function renderMansionExplorationPage() {
            if (!currentState.selectedRole) {
                showModal('キャラクターが選択されていません。<br>キャラクター選択画面に戻ります。');
                navigateTo('character-list'); return;
            }
            try {
                const response = await fetch(`./text/${currentState.selectedRole}.json`);
                if (!response.ok) throw new Error('Network response was not ok.');
                const roleData = await response.json();
                
                // 注意書きのHTML
                const disclaimerHTML = `
                    <div class="info-section mb-3">
                        <h3>【個人の情報】</h3>
                        <div style="padding: 1rem 1.5rem;">
                            <p>この館内探索で得た情報は【個人の情報】です。<br>ご自身はいつでも自由に読み返して構いませんが、このページを他のプレイヤーに見せてはいけません。<br>書かれている内容を伝える場合は自分の言葉で伝えてください。</p>
                        </div>
                    </div>`;
                    
                // 本文のHTML
                const bodyHTML = `
                    <div class="info-section">
                        <h3>${roleData.exploration.title}</h3>
                        <div style="padding: 1rem 1.5rem;">
                        <div>${roleData.exploration.body.split(/\n/g).map(line => `<p>${line || '&nbsp;'}</p>`).join('')}</div>
                    </div>`;

                document.getElementById('exploration-content').innerHTML = disclaimerHTML + bodyHTML;
                
                // ボタンも動的に生成
                document.getElementById('page-mansion-exploration').querySelector('.button-group').innerHTML = `
                    <button id="btn-back-to-conference-2" class="btn btn-neutral"><i class="fas fa-arrow-left"></i> 結帳檻の調査記録</button>
                    <button id="btn-go-final-discussion" class="btn btn-primary"><i class="fas fa-gavel"></i> 最後の議論へ進む</button>
                `;

            } catch (error) { console.error('探索情報の読み込み失敗:', error); showModal('探索情報の読み込みに失敗しました。'); }
        }

        async function renderSimpleTextPage(filePath, contentId, title) {
            try {
                const res = await fetch(filePath);
                if (!res.ok) throw new Error(`${filePath} not found`);
                const text = await res.text();
                const lines = text.trim().split(/\r?\n/);
                const pageTitle = lines[0];
                const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                const container = document.getElementById(contentId);
                if (container) {
                    container.innerHTML = `<h3>${pageTitle}</h3><div>${body}</div>`;
                }
            } catch (error) {
                console.error(`${title}の読み込み失敗:`, error);
                showModal(`${title}の読み込みに失敗しました。`);
            }
        }

        const renderFinalDiscussion = () => renderSimpleTextPage('./text/final_discussion.txt', 'final-discussion-content', '最後の議論');
        const renderWrongEnd = () => renderSimpleTextPage('./text/wrong_end.txt', 'wrong-end-content', '間違い選択ページ');
        const renderNormalEnd = () => renderSimpleTextPage('./text/normal_end.txt', 'normal-end-content', 'ノーマルエンド');
        const renderTrueEnd = () => renderSimpleTextPage('./text/true_end.txt', 'true-end-content', 'トゥルーエンド');

        // --- タイマーロジック ---
        const timerMinutesDisplay = document.getElementById('timer-minutes');
        const timerSecondsDisplay = document.getElementById('timer-seconds');
        const conferenceTimerMinutesDisplay = document.getElementById('conference-timer-minutes');
        const conferenceTimerSecondsDisplay = document.getElementById('conference-timer-seconds');

        // --- イベントリスナー ---
        document.body.addEventListener('click', startAudioContext, { once: true });
        document.body.addEventListener('touchend', startAudioContext, { once: true });
        modalCloseBtn?.addEventListener('click', hideModal);
        modal?.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
        infoModalCloseBtn?.addEventListener('click', hideInfoModal);
        infoModal?.addEventListener('click', (e) => { if (e.target === infoModal) hideInfoModal(); });
        
        // サイドバー
        async function showInfoFromTextFile(filePath, title) { 
            try { 
                const response = await fetch(filePath); 
                if (!response.ok) throw new Error(`Network error for ${filePath}`); 
                const text = await response.text();
                
                // テキストを行に分割
                const lines = text.trim().split(/\r?\n/);
                // 最初の行をサブタイトルとしてh3タグで囲む
                const subtitle = `<h3>${lines[0]}</h3>`;
                // 残りの行を本文としてpタグで囲む
                const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                // サブタイトルと本文を結合してHTMLを生成
                const contentHTML = `${subtitle}<div>${body}</div>`;

                showInfoModal(title, contentHTML); 
            } catch (error) { 
                showModal(`${title}の読み込みに失敗しました。`); 
            } 
        }
        document.getElementById('btn-show-intro-sidebar')?.addEventListener('click', () => showInfoFromTextFile('./text/introduction.txt', '導入'));
        document.getElementById('btn-show-recollection-1')?.addEventListener('click', () => showInfoFromTextFile('./text/reminiscence1.txt', '回想シーン1'));
        document.getElementById('btn-show-recollection-2')?.addEventListener('click', () => showInfoFromTextFile('./text/reminiscence2.txt', '回想シーン2'));
        document.getElementById('btn-show-recollection-3')?.addEventListener('click', () => showInfoFromTextFile('./text/reminiscence3.txt', '回想シーン3'));
        document.getElementById('btn-show-info-1')?.addEventListener('click', () => showInfoFromTextFile('./text/information1.txt', '情報1'));
        document.getElementById('btn-show-info-2')?.addEventListener('click', () => showInfoFromTextFile('./text/information2.txt', '情報2'));

        // ページ遷移ボタン
        document.getElementById('btn-go-character-list')?.addEventListener('click', () => navigateTo('character-list'));
        document.getElementById('btn-back-to-recollection')?.addEventListener('click', () => navigateTo('recollection'));
        document.getElementById('btn-go-conference')?.addEventListener('click', () => navigateTo('conference'));
        document.getElementById('btn-go-conference-2')?.addEventListener('click', () => navigateTo('conference-2'));
        document.getElementById('btn-go-exploration')?.addEventListener('click', () => navigateTo('mansion-exploration'));
        document.getElementById('btn-back-to-hub-from-exploration')?.addEventListener('click', () => { if (currentState.selectedRole) navigateTo(`role-${currentState.selectedRole}`); else navigateTo('character-list'); });
        document.getElementById('btn-confirm-yes')?.addEventListener('click', () => { if (currentState.selectedRole) navigateTo(`role-${currentState.selectedRole}`); });
        document.getElementById('btn-confirm-no')?.addEventListener('click', () => navigateTo('character-list'));
        document.getElementById('btn-back-to-list')?.addEventListener('click', () => navigateTo('character-list'));
        
        // 各選択肢ページからの戻る/進むボタン
        document.getElementById('btn-back-to-final-discussion-from-wrong')?.addEventListener('click', () => navigateTo('final-discussion'));
        document.getElementById('btn-go-ending-from-wrong')?.addEventListener('click', () => {
            if (confirm("本当に解説に進みますか？\nこれにより、物語の全ての謎が明らかになります。")) {
                navigateTo('ending');
            }
        });
        document.getElementById('btn-back-to-final-discussion-from-normal')?.addEventListener('click', () => navigateTo('final-discussion'));
        document.getElementById('btn-go-ending-from-normal')?.addEventListener('click', () => {
            if (confirm("本当に解説に進みますか？\nこれにより、物語の全ての謎が明らかになります。")) {
                navigateTo('ending');
            }
        });
        document.getElementById('btn-go-ending-from-true')?.addEventListener('click', () => navigateTo('ending'));

        // 役職割り振り
        document.getElementById('btn-assign-roles')?.addEventListener('click', async () => {
            try {
                if (!gameRoles || gameRoles.length === 0) { const res = await fetch('./text/meta.json'); const meta = await res.json(); gameRoles = meta.roles; }
                const players = document.getElementById('player-names').value.split('\n').filter(name => name.trim() !== '');
                if (players.length === 0 || players.length > gameRoles.length) { showModal(`参加者の人数（${players.length}人）が不正です。<br>キャラクターの数（${gameRoles.length}人）以下の人数で入力してください。`); return; }
                const shuffledRoles = [...gameRoles].sort(() => Math.random() - 0.5);
                const resultsContainer = document.getElementById('assign-results');
                resultsContainer.innerHTML = players.map((player, index) => `<p><strong>${player}</strong> さん → <strong>${shuffledRoles[index].name}</strong></p>`).join('');
                document.getElementById('assign-results-container').classList.remove('hidden');
            } catch (error) { console.error('割り振りエラー:', error); showModal('エラーが発生しました。役職データを読み込めませんでした。'); }
        });
        document.getElementById('btn-copy-results')?.addEventListener('click', () => { const text = document.getElementById('assign-results').innerText; navigator.clipboard.writeText(text).then(() => showModal('コピーしました！'), () => showModal('コピーに失敗しました。')); });

        // アコーディオン
        appContainer?.addEventListener('click', (e) => { const header = e.target.closest('.info-item'); if (header) { header.classList.toggle('open'); header.nextElementSibling.classList.toggle('open'); } });

        // フェードインアニメーション
        function setupFadeInAnimation() {
            const targets = document.querySelectorAll('.content-box, .choice-card, .page-title, .hub-header, .timer-section, .main-title, .subtitle, .character-card');
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
            }, { 
                rootMargin: '0px 0px -150px 0px' /* 変更：画面下から150pxの位置で発火 */
            });
            targets.forEach(target => { target.classList.add('fade-in'); observer.observe(target); });
        }

        // ===== 最後の議論 選択肢ロジック =====
        // 選択肢グループのクリックイベント
        document.querySelectorAll('.choice-group').forEach(group => {
            group.addEventListener('click', (e) => {
                const selectedCard = e.target.closest('.final-choice-card');
                if (!selectedCard) return;

                // 同じグループ内の他の選択肢から 'selected' クラスを削除
                group.querySelectorAll('.final-choice-card').forEach(card => {
                    card.classList.remove('selected');
                });

                // クリックされたカードに 'selected' クラスを追加
                selectedCard.classList.add('selected');
            });
        });

        // 決定ボタンのクリックイベント
        document.getElementById('btn-submit-final-choice')?.addEventListener('click', () => {
            const person = document.querySelector('#choice-group-person .selected')?.dataset.value;
            const content = document.querySelector('#choice-group-content .selected')?.dataset.value;

            if (!person || !content) {
                showModal("「誰に」「何を」伝えるか、両方を選択してください。");
                return;
            }

            if (content === 'truth') {
                if (person === 'gilbert') {
                    navigateTo('normal-end'); // ①+④ ノーマルエンド
                } else if (person === 'merril') {
                    navigateTo('true-end');   // ②+④ トゥルーエンド
                }
            } else { // content === 'culprit' の場合
                navigateTo('wrong-end');      // ①+③ or ②+③ 間違いの選択肢
            }
        });

        // ===== サイドバー追加項目のクリックイベント =====

        // 「巡回記録」ボタン
        document.getElementById('btn-show-patrol-log')?.addEventListener('click', async () => {
            if (!currentState.selectedRole) {
                showModal('キャラクターが選択されていません。');
                return;
            }
            try {
                const response = await fetch(`./text/${currentState.selectedRole}.json`);
                if (!response.ok) throw new Error('Network response was not ok.');
                const role = await response.json();
                const contentHTML = role.investigation.map(item => `
                    <div class="info-item" style="cursor: default;"><span>${item.title}</span></div>
                    <div class="info-content open"><p>${item.content.replace(/\n/g, '<br>')}</p></div>
                `).join('');
                showInfoModal('巡回記録', `<div class="info-section"><div id="investigation-list">${contentHTML}</div></div>`);
            } catch (error) {
                showModal('巡回記録の読み込みに失敗しました。');
            }
        });

        // 「推理パート」ボタン
        document.getElementById('btn-show-conference-1')?.addEventListener('click', async () => {
            try {
                // 2つのパートを両方取得
                const [res1, res2] = await Promise.all([
                    fetch('./text/scene1_part1.txt'),
                    fetch('./text/scene1_part2.txt')
                ]);

                if (!res1.ok || !res2.ok) throw new Error('Failed to fetch scene parts');

                const text1 = await res1.text();
                const text2 = await res2.text();

                // テキストをHTML形式に変換する内部関数
                const textToHtml = (text) => {
                    const lines = text.trim().split(/\r?\n/);
                    const title = `<h3>${lines[0]}</h3>`;
                    const body = lines.slice(1).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                    return `${title}<div>${body}</div>`;
                };
                
                // 2つのパートのHTMLを結合
                const combinedHtml = textToHtml(text1) + '<hr class="section-divider">' + textToHtml(text2);

                showInfoModal('推理パート', combinedHtml);
            } catch (error) {
                console.error('推理パートのサイドバー表示に失敗:', error);
                showModal('情報の読み込みに失敗しました。');
            }
        });

        // 「ヴィクの報告」ボタン
        document.getElementById('btn-show-conference-2')?.addEventListener('click', () => {
            showInfoFromTextFile('./text/scene2.txt', '結帳檻の調査記録');
        });

        // 「館内探索」ボタン
        document.getElementById('btn-show-exploration-sidebar')?.addEventListener('click', async () => {
            if (!currentState.selectedRole) {
                showModal('キャラクターが選択されていません。');
                return;
            }
            try {
                const response = await fetch(`./text/${currentState.selectedRole}.json`);
                if (!response.ok) throw new Error('Network response was not ok.');
                const roleData = await response.json();
                const contentHTML = roleData.exploration.body.split(/\n/g).map(line => `<p>${line || '&nbsp;'}</p>`).join('');
                showInfoModal(roleData.exploration.title, contentHTML);
            } catch (error) {
                showModal('館内探索の情報の読み込みに失敗しました。');
            }
        });

        // ===== ページ遷移ボタンのクリックイベント（統合版） =====
        document.body.addEventListener('click', (event) => {
            // クリックされた要素がボタンでない場合は何もしない
            const button = event.target.closest('.btn');
            if (!button) return;

            const buttonId = button.id;

            // ボタンのIDに応じてページを遷移させる
            switch (buttonId) {
                case 'btn-back-to-hub-from-conference':
                    if (currentState.selectedRole) navigateTo(`role-${currentState.selectedRole}`);
                    else navigateTo('character-list');
                    break;
                case 'btn-back-to-conference':
                    navigateTo('conference');
                    break;
                case 'btn-back-to-conference-2':
                    navigateTo('conference-2');
                    break;
                case 'btn-go-final-discussion': // ←「最後の議論へ進む」ボタンの処理を追加
                    navigateTo('final-discussion');
                    break;
            }
        });

        // --- ゲームページの初期化 ---
        async function initializeApp() {
            try {
                const [metaResponse, verResponse] = await Promise.all([ fetch('./text/meta.json'), fetch('./version.json') ]);
                for (const res of [metaResponse, verResponse]) { if (!res.ok) throw new Error(`Failed to fetch ${res.url}`); }
                const meta = await metaResponse.json();
                gameRoles = meta.roles;
                const verData = await verResponse.json();
                const verEl = document.getElementById('version-number');
                if (verEl) verEl.textContent = verData.version;
            } catch (error) {
                console.error("ゲームの初期データ読み込みに失敗: ", error);
                showModal("ゲームデータの読み込みに失敗しました。ページをリフレッシュしてください。");
            }
            // ハブページのタイマーを生成
            new TimerComponent({
                minutesElId: 'timer-minutes',
                secondsElId: 'timer-seconds',
                setMinutesElId: 'timer-set-minutes',
                startButtonId: 'btn-timer-start',
                stopButtonId: 'btn-timer-stop',
                resetButtonId: 'btn-timer-reset',
                setButtonId: 'btn-timer-set',
                initialMinutes: 5
            });

            // 推理パートのタイマーを生成
            new TimerComponent({
                minutesElId: 'conference-timer-minutes',
                secondsElId: 'conference-timer-seconds',
                setMinutesElId: 'conference-timer-set-minutes',
                startButtonId: 'btn-conference-timer-start',
                stopButtonId: 'btn-conference-timer-stop',
                resetButtonId: 'btn-conference-timer-reset',
                setButtonId: 'btn-conference-timer-set',
                initialMinutes: 20
            });

            // 最後の議論ページのタイマーを生成
            new TimerComponent({
                minutesElId: 'final-timer-minutes',
                secondsElId: 'final-timer-seconds',
                setMinutesElId: 'final-timer-set-minutes',
                startButtonId: 'btn-final-timer-start',
                stopButtonId: 'btn-final-timer-stop',
                resetButtonId: 'btn-final-timer-reset',
                setButtonId: 'btn-final-timer-set',
                initialMinutes: 15
            });

            window.addEventListener('hashchange', handleRouteChange);
            await handleRouteChange();
            setupFadeInAnimation();

            const infoSidebar = document.getElementById('info-sidebar');
            if (infoSidebar) {
                if (window.innerWidth > 768) {}
                else {
                    infoSidebar.classList.remove('visible');
                }
            }
        }
        
        initializeApp();
    }
    // --- サイドバー開閉機能（スマホ向け） ---
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const infoSidebarForToggle = document.getElementById('info-sidebar');

    if (sidebarToggleBtn && infoSidebarForToggle) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // イベントの伝播を停止
            infoSidebarForToggle.classList.toggle('visible');
        });

        // サイドバーの外側をクリックした時に閉じる
        document.body.addEventListener('click', (e) => {
            // スマートフォン表示の場合のみ、この機能を有効にする
            if (window.innerWidth <= 768) {
                // サイドバーが表示されていて、クリックがサイドバー本体でもトグルボタンでもない場合
                if (infoSidebarForToggle.classList.contains('visible') && 
                    !infoSidebarForToggle.contains(e.target) && 
                    !sidebarToggleBtn.contains(e.target)) {
                    infoSidebarForToggle.classList.remove('visible');
                }
            }
        });
    }
});
