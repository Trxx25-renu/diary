// ==========================================
// 🔍 DX3rd テキスト解析パーサー（CN読み仮名抽出・完全対応版）
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

    // 1. 名前とヨミガナの抽出
    const nameMatch = mainPart.match(/(?:キャラクター名|名前)[：:\s]+([^\r\n（\(]+?)(?:\((.*?)\))?$/m) ||
                      mainPart.match(/(?:キャラクター名|名前)[：:\s]+([^\r\n]+)/);
    if (nameMatch) {
        result.name = nameMatch[1].trim();
        if (nameMatch[2]) result.nameKana = nameMatch[2].trim();
    }

    const pcKanaMatch = mainPart.match(/^PC[：:\s]+([^\r\n]+)/m);
    if (pcKanaMatch) {
        let pcText = pcKanaMatch[1].trim();
        if (!result.nameKana || result.nameKana.length > 20 || result.nameKana.includes('ダメージ')) {
            result.nameKana = pcText;
        }
    }
    if (result.nameKana && (result.nameKana.includes('ダメージ') || result.nameKana.length > 25)) {
        result.nameKana = '';
    }

    // 2. 二つ名・コードネーム・CNの抽出
    const codeLineMatch = mainPart.match(/(?:コードネーム|二つ名)[：:\s]+([^\r\n]+)/);
    
    let cnRaw = "";
    const directCnMatch = text.match(/CN[：:\s]+([^\r\n]+)/);
    if (directCnMatch) {
        cnRaw = directCnMatch[1].trim();
    } else if (codeLineMatch) {
        cnRaw = codeLineMatch[1].trim();
    }

    if (cnRaw) {
        const parenMatch = cnRaw.match(/^([^\r\n（\(]+)\((.*?)\)/);
        if (parenMatch) {
            result.codeName = parenMatch[1].replace(/[「“"‘」”"’]/g, '').trim();
            result.codeNameKana = parenMatch[2].trim();
        } else {
            const quoteWrappedMatch = cnRaw.match(/^([“"‘「„‚].*?[”"’」”‘]|[^\s ]+)(?:[\s ]+)(.+)$/);
            if (quoteWrappedMatch) {
                result.codeName = quoteWrappedMatch[1].replace(/[「“"‘」”"’]/g, '').trim();
                result.codeNameKana = quoteWrappedMatch[2].replace(/[「“"‘」”"’]/g, '').trim();
            } else {
                const spaceParts = cnRaw.split(/[\s ]+/);
                if (spaceParts.length >= 2) {
                    result.codeName = spaceParts[0].replace(/[「“"‘」”"’]/g, '').trim();
                    result.codeNameKana = spaceParts.slice(1).join(' ').replace(/[「“"‘」”"’]/g, '').trim();
                } else {
                    result.codeName = cnRaw.replace(/[「“"‘」”"’]/g, '').trim();
                }
            }
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

    // 4. ワークス・カヴァー
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

    const dRoyceMatch = mainPart.match(/([^\r\n]+)\s*\/\s*Dロイス/) || mainPart.match(/Dロイス[：:\s]*([^\r\n]+)/);
    if (dRoyceMatch) {
        result.dRoyce = dRoyceMatch[1].trim();
    }

    // 5. 誕生日の抽出
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

    // 6. カラーコードの抽出
    const colorMatch = text.match(/(?:カラーコード|カラー|色|背景)[\s\u3000:|｜]*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i) || text.match(/(?<![#0-9a-fA-F])([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/);
    if (colorMatch) {
        let rawColor = colorMatch[1] || colorMatch[0];
        result.colorCode = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    }

    // 7. 能力値
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

    // 8. 動的カスタムフィールド定義との突合
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
