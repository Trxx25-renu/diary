// ==========================================
// 💡 TRPG キャラクターシート流し込み制御モジュール (sheet-importer.js)
// ==========================================

// 補助関数：単一要素への安全なセット
function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== "") {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// 補助関数：複数候補から一致する要素を探してセット
function setFieldValues(idsOrNames, value) {
    if (!value) return;
    idsOrNames.forEach(key => {
        const selectors = [
            `#${key}`,
            `[name="${key}"]`,
            `[id*="${key}"]`,
            `[name*="${key}"]`
        ];
        const targets = document.querySelectorAll(selectors.join(', '));
        targets.forEach(el => {
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });
}

// 🚀 キャラシテキスト読み込み・流し込みのメイン実行関数
function importCharacterSheetText(event) {
    const textEl = document.getElementById('sheetImportText');
    if (!textEl) {
        alert('読み込み元のテキストエリア（sheetImportText）が見つかりません。');
        return;
    }
    const rawText = textEl.value;
    if (!rawText.trim()) {
        alert('キャラクターシートのテキストを入力してください。');
        return;
    }

    // 1. システム選択のセレクトボックスを複数の候補から柔軟に取得
    const systemSelect = document.getElementById('charSystemSelect') || 
                         document.getElementById('systemSelect') || 
                         document.getElementById('characterSystemSelect') || 
                         document.getElementById('sheetSystemSelect') ||
                         document.querySelector('select[name*="system"]');
                         
    let targetSysId = systemSelect ? systemSelect.value : '';

    let sysName = '';
    if (targetSysId && window.systems) {
        const currentSys = window.systems.find(s => s.id === targetSysId);
        if (currentSys) sysName = currentSys.name;
    }

    // 💡 システム判定（将来ここに INSANE などの条件も追加可能）
    const isDX3 = sysName.includes('ダブルクロス') || 
                  sysName.includes('DX3') || 
                  targetSysId === 'dx3' || 
                  rawText.includes('シンドローム') || 
                  rawText.includes('侵蝕基本値') ||
                  rawText.includes('コードネーム');

    let data;
    if (isDX3) {
        if (!targetSysId && window.systems) {
            const foundDx = window.systems.find(s => s.name.includes('ダブルクロス') || s.name.includes('DX3'));
            if (foundDx) targetSysId = foundDx.id;
        }
        // js/parsers/dx3-parser.js で定義された関数を呼び出し
        if (typeof parseDX3Text === 'function') {
            data = parseDX3Text(rawText, targetSysId);
        } else {
            alert('DX3rd用パーサー（parseDX3Text）が見つかりません。');
            return;
        }
    } else {
        if (!targetSysId && window.systems) {
            const foundCoc = window.systems.find(s => s.name.includes('クトゥルフ') || s.name.includes('CoC'));
            if (foundCoc) targetSysId = foundCoc.id;
        }
        // js/parsers/coc-parser.js で定義された関数を呼び出し
        if (typeof parseCoCText === 'function') {
            data = parseCoCText(rawText, targetSysId);
        } else {
            alert('CoC用パーサー（parseCoCText）が見つかりません。');
            return;
        }
    }

    // 2. 基本情報（名前、ヨミガナ、年齢、性別、誕生日）のセット
    setFieldValue('charName', data.name);
    setFieldValue('charNameKana', data.nameKana);
    setFieldValue('charAge', data.age);
    setFieldValue('charGender', data.gender);
    setFieldValue('charBirthdate', data.birthday);

    // 二つ名・コードネームの反映
    if (data.codeName) {
        setFieldValues(['charEpithet', 'codeName', 'epithet', 'cn'], data.codeName);
    }
    if (data.codeNameKana) {
        setFieldValues(['charEpithetKana', 'codeNameKana', 'epithetKana', 'cnKana', 'codename_kana', 'code_kana'], data.codeNameKana);
    }

    // 3. カラーコードの反映
    if (data.colorCode) {
        const colorVal = data.colorCode.startsWith('#') ? data.colorCode : `#${data.colorCode}`;
        setFieldValues(['themeColor', 'charThemeColor', 'charThemeColorText'], colorVal);
        
        if (typeof currentCharacter !== 'undefined' && currentCharacter) {
            currentCharacter.themeColor = colorVal;
        }
        if (typeof handleThemeColorInput === 'function') {
            handleThemeColorInput(colorVal);
        }
    }

    // A. 編集中のキャラクターデータオブジェクト（currentCharacter）への反映
    if (typeof currentCharacter !== 'undefined' && currentCharacter) {
        if (data.name) currentCharacter.name = data.name;
        if (data.nameKana) currentCharacter.nameKana = data.nameKana;
        if (data.age) currentCharacter.age = Number(data.age) || data.age;
        if (data.gender) currentCharacter.gender = data.gender;
        if (data.birthday) currentCharacter.birthdate = data.birthday;
        if (targetSysId) currentCharacter.systemId = targetSysId;

        if (data.codeName) {
            currentCharacter.epithet = data.codeName;
            currentCharacter.epithetKana = data.codeNameKana || '';
            currentCharacter.codeName = data.codeName;
        }

        if (!currentCharacter.customValues) {
            currentCharacter.customValues = {};
        }
        const cv = currentCharacter.customValues;

        const sysFields = window.systemCustomFields?.[targetSysId] || { status: [], text: [] };
        const statusFieldIds = new Set(sysFields.status ? sysFields.status.map(s => s.id) : []);

        if (data.fields) {
            for (const [fieldId, val] of Object.entries(data.fields)) {
                if (val === "" || val === undefined || val === null) continue;

                if (statusFieldIds.has(fieldId)) {
                    const numericVal = Number(val) || 0;
                    if (!cv[fieldId] || typeof cv[fieldId] !== 'object') {
                        cv[fieldId] = { base: numericVal, growth: '' };
                    } else {
                        cv[fieldId].base = numericVal;
                    }
                } else {
                    cv[fieldId] = String(val);
                }
            }
        }
    }

    // B. 画面上の入力欄（DOM）への直接反映（基本値のみにセット）
    if (data.fields) {
        for (const [fieldId, val] of Object.entries(data.fields)) {
            if (val === "" || val === undefined || val === null) continue;

            const selectors = [
                `#custom_status_base_${fieldId}`,
                `#custom_text_${fieldId}`,
                `[name="custom_status_base_${fieldId}"]`,
                `[name="custom_text_${fieldId}"]`,
                `#${fieldId}`,
                `[data-field="${fieldId}"]`
            ];

            const targets = document.querySelectorAll(selectors.join(', '));
            targets.forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.id && el.id.includes('growth')) return;

                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    }

    // 4. プレビュー更新やモーダル内フォーム再描画の呼び出し
    if (typeof handleSystemChangeInModal === 'function') {
        handleSystemChangeInModal(currentCharacter?.customValues || {}, targetSysId, true);
    }
    if (typeof updateCharacterPreview === 'function') {
        updateCharacterPreview();
    }

    // 5. 完了のフィードバック（ボタンアニメーション）
    const btn = (event && event.target) || document.querySelector('button[onclick*="importCharacterSheetText"]') || document.activeElement;
    if (btn && btn.tagName === 'BUTTON') {
        const originalText = btn.textContent;
        
        btn.textContent = '読み込み中…';
        btn.classList.add('bg-amber-600', 'hover:bg-amber-700');
        btn.classList.remove('stone-800', 'hover:bg-stone-700');

        setTimeout(() => {
            btn.textContent = '✔ 読み込み完了！';
            btn.classList.replace('bg-amber-600', 'bg-emerald-600');
            btn.classList.replace('hover:bg-amber-700', 'hover:bg-emerald-700');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                btn.classList.add('stone-800', 'hover:bg-stone-700');
            }, 1500);
        }, 400);
    }
}

// 🌐 グローバル登録
window.importCharacterSheetText = importCharacterSheetText;
