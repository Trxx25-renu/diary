// ==========================================
// 🔍 DX3rd テキスト解析パーサー（表形式・表記揺れ対応版）
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
        move: '',
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

    // 全角・半角数字の相互変換ヘルパー
    const toNum = (str) => {
        if (!str) return '';
        return str.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).trim();
    };

    // 1. 基本情報の抽出
    const nameMatch = mainPart.match(/(?:キャラクター名|名前)[：:\s]*([^\r\n（\(]+)(?:\((.*?)\))?/m);
    if (nameMatch) {
        result.name = nameMatch[1].trim();
        if (nameMatch[2]) result.nameKana = nameMatch[2].trim();
    }
    const pcKanaMatch = mainPart.match(/PC[：:\s]*([^\r\n]+)/);
    if (pcKanaMatch && !result.nameKana) {
        result.nameKana = pcKanaMatch[1].trim();
    }

    // コードネーム
    const codeMatch = mainPart.match(/コードネーム[：:\s]*([^\r\n（\(]+)(?:\((.*?)\))?/m);
    if (codeMatch) {
        result.codeName = codeMatch[1].trim();
        if (codeMatch[2]) result.codeNameKana = codeMatch[2].trim();
    }
    const cnMatch = mainPart.match(/CN[：:\s]*([^\r\n]+)/);
    if (cnMatch) {
        let cnText = cnMatch[1].trim();
        if (!result.codeName) {
            const qMatch = cnText.match(/[「“"‘](.+?)[」”"’]/);
            if (qMatch) result.codeName = qMatch[1];
        }
        if (!result.codeNameKana) {
            result.codeNameKana = cnText.replace(/[「“"‘].*?[」”"’]/g, '').trim();
        }
    }

    // 年齢・性別
    const ageMatch = mainPart.match(/年齢[：:\s]*([0-9０-９]+)/);
    if (ageMatch) result.age = toNum(ageMatch[1]);

    const genderMatch = mainPart.match(/性別[：:\s]*([男女不明ほか]+)/);
    if (genderMatch) {
        const gRaw = genderMatch[1].trim();
        if (gRaw === '男' || gRaw === '男性') result.gender = '男性';
        else if (gRaw === '女' || gRaw === '女性') result.gender = '女性';
        else result.gender = gRaw || '不明';
    }

    // 2. ワークス・カヴァー
    const worksMatch = mainPart.match(/ワークス[：:\s]*([^\r\n\/]+)/);
    if (worksMatch) result.works = worksMatch[1].trim();

    const coverMatch = mainPart.match(/(?:カヴァ|カバー|カヴァー)[：:\s]*([^\r\n\/]+)/);
    if (coverMatch) result.cover = coverMatch[1].trim();

    if (!result.works || !result.cover) {
        const wcLineMatch = mainPart.match(/(?:ワークス|カバー|カヴァー)[\/\s]*(?:カバー|カヴァー)?[：:\s]*([^\r\n\/]+)[\/\s]+([^\r\n]+)/);
        if (wcLineMatch) {
            if (!result.works) result.works = wcLineMatch[1].trim();
            if (!result.cover) result.cover = wcLineMatch[2].trim();
        }
    }

    // シンドローム・Dロイス
    const syndMatch = mainPart.match(/シンドローム[：:\s]*([^\r\n]+)/);
    if (syndMatch) result.syndrome = syndMatch[1].trim();

    const dRoyceMatch = mainPart.match(/([^\r\n]+)\s*\/\s*Dロイス/) || mainPart.match(/Dロイス[：:\s]*([^\r\n]+)/);
    if (dRoyceMatch) {
        result.dRoyce = dRoyceMatch[1].trim();
    }

    // 🌟 3. 誕生日の抽出（「:   誕生日   | 12月12日」や「7/11」等の表形式・記号・空白に対応）
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

    // 🌟 4. カラーコードの抽出（「: カラーコード | #B0E0E6」の表形式・記号・空白に対応）
    const colorMatch = text.match(/(?:カラーコード|カラー|色|背景)[\s\u3000:|｜]*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i) || text.match(/(?<![#0-9a-fA-F])([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/);
    if (colorMatch) {
        let rawColor = colorMatch[1] || colorMatch[0];
        result.colorCode = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    }

    // 5. 能力値
    const extractDXStat = (key) => {
        const reg = new RegExp(`(?:【)?\\b${key}\\b(?:】)?[：:\\s]*([0-9０-９]+)`, 'i');
        const m = mainPart.match(reg);
        if (m) return toNum(m[1]);
        return '';
    };

    result.body = extractDXStat('肉体');
    result.sensation = extractDXStat('感覚');
    result.mind = extractDXStat('精神');
    result.social = extractDXStat('社会');

    result.hp = extractDXStat('HP') || extractDXStat('ＨＰ');
    result.erosion = extractDXStat('侵蝕基本値') || extractDXStat('侵蝕');
    result.action = extractDXStat('行動値') || extractDXStat('行動');

    // 6. 動的カスタムフィールドとの突合
    const extractedValues = {
        "ワークス": result.works,
        "カヴァー": result.cover,
        "カバー": result.cover,
        "シンドローム": result.syndrome,
        "Dロイス": result.dRoyce,
        "コードネーム": result.codeName,
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

window.parseDX3Text = parseDX3Text;
