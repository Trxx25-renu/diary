
// ==========================================
// 💡 キャラシテキスト読み込み・流し込み関数（現在値・基本値への代入徹底版）
// ==========================================
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

    // 1. システム選択の取得
    const systemSelect = document.getElementById('systemSelect') || 
                         document.getElementById('characterSystemSelect') || 
                         document.getElementById('sheetSystemSelect') ||
                         document.querySelector('select[name*="system"]');
                         
    let targetSysId = systemSelect ? systemSelect.value : '';

    let sysName = '';
    if (targetSysId && window.systems) {
        const currentSys = window.systems.find(s => s.id === targetSysId);
        if (currentSys) sysName = currentSys.name;
    }

    let data;
    const isDX3 = sysName.includes('ダブルクロス') || sysName.includes('DX3') || targetSysId === 'dx3';

    if (isDX3) {
        if (!targetSysId && window.systems) {
            const foundDx = window.systems.find(s => s.name.includes('ダブルクロス') || s.name.includes('DX3'));
            if (foundDx) targetSysId = foundDx.id;
        }
        data = parseDX3Text(rawText, targetSysId);
    } else {
        if (!targetSysId && window.systems) {
            const foundCoc = window.systems.find(s => s.name.includes('クトゥルフ') || s.name.includes('CoC'));
            if (foundCoc) targetSysId = foundCoc.id;
        }
        data = parseCoCText(rawText, targetSysId);
    }

    // 2. 基本情報（名前、ヨミガナ、年齢、性別、誕生日）のセット
    setFieldValue('charName', data.name);
    setFieldValue('charNameKana', data.nameKana);
    setFieldValue('charAge', data.age);
    setFieldValue('charGender', data.gender);
    setFieldValue('charBirthdate', data.birthday);
    if (data.codeName) {
        setFieldValue('codeName', data.codeName);
        setFieldValue('codeNameKana', data.codeNameKana);
    }

    // 3. カラーコードの反映
    if (data.colorCode) {
        const colorVal = data.colorCode.startsWith('#') ? data.colorCode : `#${data.colorCode}`;
        setFieldValue('themeColor', colorVal);
        setFieldValue('charThemeColor', colorVal);
        setFieldValue('charThemeColorText', colorVal);
        
        if (typeof currentCharacter !== 'undefined' && currentCharacter) {
            currentCharacter.themeColor = colorVal;
        }
        if (typeof handleThemeColorInput === 'function') {
            handleThemeColorInput(colorVal);
        }
    }

    // 4. 編集中のキャラクターデータオブジェクト（currentCharacter）へのカスタム値の安全な反映
    if (typeof currentCharacter !== 'undefined' && currentCharacter) {
        if (data.name) currentCharacter.name = data.name;
        if (data.nameKana) currentCharacter.nameKana = data.nameKana;
        if (data.age) currentCharacter.age = Number(data.age) || data.age;
        if (data.gender) currentCharacter.gender = data.gender;
        if (data.birthday) currentCharacter.birthdate = data.birthday;
        if (data.codeName) currentCharacter.codeName = data.codeName;
        if (targetSysId) currentCharacter.systemId = targetSysId;

        if (!currentCharacter.customValues) {
            currentCharacter.customValues = {};
        }
        const cv = currentCharacter.customValues;

        // システムカスタムフィールドの定義（status と text）を取得
        const sysFields = window.systemCustomFields?.[targetSysId] || { status: [], text: [] };
        const statusFieldIds = new Set(sysFields.status.map(s => s.id));

        // data.fields に格納された動的フィールドの値を反映
        if (data.fields) {
            for (const [fieldId, val] of Object.entries(data.fields)) {
                if (val === "" || val === undefined || val === null) continue;

                if (statusFieldIds.has(fieldId)) {
                    // 📊 ステータス系（数値）：基本値（base）にのみ代入し、成長値（growth）は維持・初期化
                    const numericVal = Number(val) || 0;
                    if (!cv[fieldId] || typeof cv[fieldId] !== 'object') {
                        cv[fieldId] = { base: numericVal, growth: '' }; // 成長値は空に
                    } else {
                        cv[fieldId].base = numericVal; // 成長値（growth）はそのまま触らない
                    }
                } else {
                    // 📝 テキスト系：文字列として保持
                    cv[fieldId] = String(val);
                }
            }
        }
    }

    // 5. 画面上の入力欄（DOM）への直接反映（基本値入力欄のみをターゲットにする）
    if (data.fields) {
        for (const [fieldId, val] of Object.entries(data.fields)) {
            if (val === "" || val === undefined || val === null) continue;

            // 🌟 成長値ではなく、基本値（base）の入力欄のみに値を流し込む
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
                    // 念のため成長値のinputに誤爆しないようガード
                    if (el.id && el.id.includes('growth')) return;

                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    }

    // 6. プレビュー更新やフォーム再描画の呼び出し
    if (typeof handleSystemChangeInModal === 'function') {
        handleSystemChangeInModal(currentCharacter?.customValues || {}, targetSysId, true);
    }
    if (typeof updateCharacterPreview === 'function') {
        updateCharacterPreview();
    }

    // 7. 完了のフィードバック（ボタンアニメーション）
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

// 補助関数
function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== "") {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

window.importCharacterSheetText = importCharacterSheetText;
