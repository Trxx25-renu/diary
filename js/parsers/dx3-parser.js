// ==========================================
// 🔍 DX3rd テキスト解析パーサー（正規表現エスケープ修正・完全版）
// ==========================================
function parseDX3Text(text, targetSysId) {
    const result = {
        name: '',
        nameKana: '',
        codeName: '',
        codeNameKana: '',
        age: '',
        gender: '',
        birthday: '',
        works: '',
        cover: '',
        syndrome: '',
        dRoyce: '',
        colorCode: '',
        memo: '',
        body: '',
        sensation: '',
        mind: '',
        social: '',
        hp: '',
        erosion: '',
        action: '',
        fields: {}
    };

    let mainPart = text;
    let memoPart = '';
    const memoSplitKeyword = text.includes('【メモ】') ? '【メモ】' : (text.includes('メモ：') ? 'メモ：' : null);
    if (memoSplitKeyword) {
        const parts = text.split(memoSplitKeyword);
        mainPart = parts[0];
        memoPart = parts.slice(1).join(memoSplitKeyword);
        result.memo = memoSplitKeyword + memoPart.trim();
    }

    const toNum = (str) => {
        if (!str) return '';
        return str.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).trim();
    };

    // 1. 名前とコードネームの基本抽出（上部から）
    const nameMatch = mainPart.match(/(?:キャラクター名|名前)[：:\s]+([^\r\n（\(]+?)(?:[\s ]*[\（\(](.*?)[\）\)])?$/m) ||
                      mainPart.match(/(?:キャラクター名|名前)[：:\s]+([^\r\n]+)/);
    if (nameMatch) {
        result.name = nameMatch[1].trim();
    }

    const codeLineMatch = mainPart.match(/(?:コードネーム|二つ名)[：:\s]+([^\r\n]+)/);
    let cnRaw = "";
    const directCnMatch = text.match(/CN[：:\s]+([^\r\n]+)/);
    if (directCnMatch) {
        cnRaw = directCnMatch[1].trim();
    } else if (codeLineMatch) {
        cnRaw = codeLineMatch[1].trim();
    }

    if (cnRaw) {
        const parenMatch = cnRaw.match(/^([^\r\n（\(]+?)[\s ]*[\（\(](.*?)[\）\)]/);
        if (parenMatch) {
            result.codeName = parenMatch[1].replace(/[「“"‘」”"’]/g, '').trim();
            result.codeNameKana = parenMatch[2].trim();
        } else {
            result.codeName = cnRaw.replace(/[「“"‘」”"’]/g, '').trim();
        }
    }

    // ==========================================
    // 🌟 2. ■その他■（下部コマ欄など）から正確な読み仮名を補完抽出
    // ==========================================
    const otherSectionMatch = text.match(/■その他■[\s\S]*/);
    const searchTarget = otherSectionMatch ? otherSectionMatch[0] : text;

    // A. 名前の読み仮名抽出（例：春宮 小毬(はるみや こまり) または 春宮 小毬（はるみや こまり））
    if (result.name) {
        const escapedName = result.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 文字クラス内での不要なエスケープを削除して修正
        const nameKanaRegex = new RegExp(escapedName + '[\\s ]*[（(](.*?)[）)]', 'u');
        const nKanaMatch = searchTarget.match(nameKanaRegex);
        if (nKanaMatch && nKanaMatch[1]) {
            result.nameKana = nKanaMatch[1].trim();
        }
    }

    // B. コードネームの読み仮名抽出（例：光輪の小爪 (スタークロウ) または 光輪の小爪(スタークロウ)）
    if (result.codeName) {
        const escapedCn = result.codeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const cnKanaRegex = new RegExp(escapedCn + '[\\s ]*[（(](.*?)[）)]', 'u');
        const cKanaMatch = searchTarget.match(cnKanaRegex);
        if (cKanaMatch && cKanaMatch[1]) {
            result.codeNameKana = cKanaMatch[1].trim();
        }
    }

    // 万が一、上部からコードネームが取れていなくて下部（■その他■）にある場合
    if (!result.codeName) {
        const altCnMatch = searchTarget.match(/(?:コードネーム|CN)[：:\s]*([^\s（\(]+)[\s ]*[（(](.*?)?[）\)]/);
        if (altCnMatch) {
            result.codeName = altCnMatch[1].trim();
            result.codeNameKana = altCnMatch[2] ? altCnMatch[2].trim() : '';
        }
    }

    // 3. 年齢・性別の抽出
    const ageMatch = mainPart.match(/年齢[：:\s]*([0-9０-９]+)/);
    if (ageMatch) result.age = toNum(ageMatch[1]);

    const genderMatch = mainPart.match(/性別[：:\s]*([男女不明ほか]+)/);
    if (genderMatch) {
        const gRaw = genderMatch[1].trim();
        if (gRaw === '男' || gRaw === '男性') result.gender = '男性';
        else if (gRaw === '女' || gRaw === '女性') result.gender = '女性';
        else result.gender = gRaw || '不明';
    }

    // 4. ワークス・カヴァー・シンドローム
    const worksMatch = mainPart.match(/ワークス[：:\s]*([^\r\n\/]+)/);
    if (worksMatch) result.works = worksMatch[1].replace(/^[：:\s]+/, '').trim();

    const coverMatch = mainPart.match(/(?:カヴァ|カバー|カヴァー)[：:\s]*([^\r\n\/]+)/);
    if (coverMatch) {
        let cText = coverMatch[1].trim();
        cText = cText.replace(/^[ー\s:：]+/, '');
        result.cover = cText;
    }

    if (!result.works || !result.cover) {
        const wcLineMatch = mainPart.match(/(?:ワークス|カバー|カヴァー)[\/\s]*(?:カバー|カヴァー)?[：:\s]*([^\r\n\/]+)[\/\s]+([^\r\n]+)/);
        if (wcLineMatch) {
            if (!result.works) result.works = wcLineMatch[1].replace(/^[：:\s]+/, '').trim();
            if (!result.cover) result.cover = wcLineMatch[2].replace(/^[：:\s]+/, '').trim();
        }
    }

    const syndMatch = mainPart.match(/シンドローム[：:\s]*([^\r\n]+)/);
    if (syndMatch) result.syndrome = syndMatch[1].trim();

    // 5. Dロイスの抽出（ロイスセクション内または / Dロイス から正確に取得）
    let dRoyceName = '';
    const roiseSectionMatch = text.match(/■ロイス■[\s\S]*?(?=■|$)/);
    if (roiseSectionMatch) {
        const roiseText = roiseSectionMatch[0];
        const droyceLineMatch = roiseText.match(/[\|]?\s*([^\r\n\|\/]+?)\s*\/+\s*Dロイス/);
        if (droyceLineMatch) {
            dRoyceName = droyceLineMatch[1].trim();
        }
    }
    if (!dRoyceName) {
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes('Dロイス') && !line.includes('エフェクト') && !line.includes('マイナー')) {
                const match = line.match(/[\|]?\s*([^\r\n\|\/]+?)\s*\/+\s*Dロイス/);
                if (match) {
                    dRoyceName = match[1].trim();
                    break;
                }
            }
        }
    }
    if (dRoyceName) {
        result.dRoyce = dRoyceName;
    }

    // 6. 誕生日の抽出
    const bdayMatch = text.match(/誕生日[\s\u3000:|｜]*([^\s\u3000|｜]+)/);
    if (bdayMatch) {
        let bdayStr = bdayMatch[1].trim();
        const slashMatch = bdayStr.match(/^([0-9０-９]{1,2})[/／]([0-9０-９]{1,2})$/);
        if (slashMatch) {
            const m = toNum(slashMatch[1]);
            const d = toNum(slashMatch[2]);
            result.birthday = `${m}月${d}日`;
        } else {
            result.birthday = bdayStr;
        }
    }

    // 7. カラーコードの抽出
    const colorMatch = text.match(/(?:カラーコード|カラー|色|背景)[\s\u3000:|｜]*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i) || text.match(/(?<![#0-9a-fA-F])([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/);
    if (colorMatch) {
        let rawColor = colorMatch[1] || colorMatch[0];
        result.colorCode = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    }

    // 8. 能力値
    const extractDXStat = (key) => {
        const regA = new RegExp(`(?:【)?${key}(?:】)?[：:\\s]*([0-9０-９]+)`, 'i');
        const mA = text.match(regA);
        if (mA) return toNum(mA[1]);

        const regB = new RegExp(`\\|\\s*${key}\\s*\\|\\s*([0-9０-９]+)\\s*\\|`, 'i');
        const mB = text.match(regB);
        if (mB) return toNum(mB[1]);

        return '';
    };

    result.body = extractDXStat('肉体');
    result.sensation = extractDXStat('感覚');
    result.mind = extractDXStat('精神');
    result.social = extractDXStat('社会');

    result.hp = extractDXStat('HP') || extractDXStat('ＨＰ');
    result.erosion = extractDXStat('侵蝕基本値') || extractDXStat('侵蝕');
    result.action = extractDXStat('行動値') || extractDXStat('行動');

    // 9. 動的カスタムフィールド定義との突合
    const extractedValues = {
        "ワークス": result.works,
        "カヴァー": result.cover,
        "カバー": result.cover,
        "シンドローム": result.syndrome,
        "Dロイス": result.dRoyce,
        "コードネーム": result.codeName,
        "二つ名": result.codeName,
        "肉体": result.body,
        "感覚": result.sensation,
        "精神": result.mind,
        "社会": result.social,
        "HP": result.hp,
        "ＨＰ": result.hp,
        "侵蝕基本値": result.erosion,
        "行動値": result.action
    };

    if (targetSysId && window.systemCustomFields && window.systemCustomFields[targetSysId]) {
        const sysFields = window.systemCustomFields[targetSysId];
        ['status', 'text'].forEach(type => {
            if (sysFields[type]) {
                sysFields[type].forEach(field => {
                    const label = field.label.trim();
                    if (extractedValues[label] !== undefined && extractedValues[label] !== "") {
                        result.fields[field.id] = extractedValues[label];
                    }
                });
            }
        });
    }

    return result;
}

// 🌐 グローバル登録
window.parseDX3Text = parseDX3Text;
