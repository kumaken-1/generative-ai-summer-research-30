const schoolPrompt = (prompt) =>
  `個人情報を含まない架空・公開の内容で試します。${prompt}`;

const questPowers = {
  1: ["dialogue", "agency"],
  2: ["instruction", "dialogue"],
  3: ["finishing", "instruction"],
  4: ["finishing", "dialogue"],
  5: ["dialogue", "instruction"],
  6: ["instruction", "finishing"],
  7: ["instruction", "dialogue"],
  8: ["verification", "dialogue"],
  9: ["instruction", "agency"],
  10: ["delegation", "agency"],
  11: ["delegation", "verification"],
  12: ["safety", "delegation"],
  13: ["verification", "safety"],
  14: ["delegation", "instruction"],
  15: ["verification", "safety"],
  16: ["instruction", "safety"],
  17: ["verification", "instruction"],
  18: ["finishing", "dialogue"],
  19: ["agency", "instruction"],
  20: ["finishing", "agency"],
  21: ["dialogue", "agency"],
  22: ["instruction", "dialogue"],
  23: ["dialogue", "agency"],
  24: ["agency", "finishing"],
  25: ["dialogue", "delegation"],
  26: ["verification", "safety"],
  27: ["verification", "safety"],
  28: ["finishing", "safety"],
  29: ["delegation", "instruction"],
  30: ["agency", "delegation"],
};

const quest = ({
  id,
  area,
  title,
  ability,
  inputMode,
  daily,
  school,
  reflectPrompt,
  factCheck = { required: false, method: "" },
  related,
}) => {
  const [primaryPower, supportingPower] = questPowers[id];
  return {
    id,
    area,
    title,
    ability,
    inputMode,
    daily,
    school: {
      ...school,
      firstPrompt: schoolPrompt(school.firstPrompt),
    },
    reflectPrompt,
    safety: "児童・保護者・職員の名前や、個人が分かる情報、学校の機密情報は入力しません。",
    factCheck,
    related,
    primaryPower,
    supportingPower,
  };
};

export const quests = [
  quest({
    id: 1,
    area: "text",
    title: "AIに自己紹介せよ",
    ability: "普通の言葉で相談する",
    inputMode: "text",
    daily: {
      situation: "生成AIに初めて話しかける",
      firstPrompt: "はじめまして。私は体を動かすことが好きな小学校教員です。休みの日を気持ちよく過ごす方法を1つ教えてください。",
      followUp: {
        template: "「____」も伝えておけばよかったです。その情報を足して、もう一度聞いてみます。",
        hints: ["体力に自信がないこと", "早起きが苦手なこと", "一人で過ごしたい気持ち"],
      },
    },
    school: {
      situation: "職場で生成AIに初めて話しかける",
      firstPrompt: "はじめまして。私は小学校で担任をしています。放課後の残り時間を気持ちよく使う方法を1つ教えてください。",
      followUp: {
        template: "「____」という条件も伝えていませんでした。それを足して聞き直してください。",
        hints: ["空き時間が15分しかないこと", "職員室で一人になれること", "体を動かしたい気持ち"],
      },
    },
    reflectPrompt: "AIの返事の中で、あなたに合うところと違うところはどこですか？",
    related: [5, 10],
  }),
  quest({
    id: 2,
    area: "text",
    title: "短い質問を投げてみよ",
    ability: "一文だけで尋ねる",
    inputMode: "text",
    daily: {
      situation: "身近な疑問を気軽に聞きたい",
      firstPrompt: "雨の日に家で気分転換する方法は？",
      followUp: {
        template: "試したいのは「____」です。その条件に合う案を一つ選んでください。",
        hints: ["体を少し動かす方法", "気分が明るくなる方法", "短時間で終わる方法"],
      },
    },
    school: {
      situation: "授業の導入を短く考えたい",
      firstPrompt: "算数の授業で、子どもが考えたくなる最初の問いは？",
      followUp: {
        template: "好みは「____」問いです。別の問いにしてください。",
        hints: ["答えが一つに決まらない", "子どもによって考え方が分かれる", "日常の場面から始まる"],
      },
    },
    reflectPrompt: "一文で聞いた答えは、あなたが知りたかったことに合っていましたか？",
    related: [1, 8],
  }),
  quest({
    id: 3,
    area: "text",
    title: "止まった文章を救え",
    ability: "続きを一緒に考える",
    inputMode: "text",
    daily: {
      situation: "短いメッセージの続きが浮かばない",
      firstPrompt: "「久しぶりです。元気にしていますか。」に続く、気軽な一文を3案ください。",
      followUp: {
        template: "「____」に違和感があります。もっと普段の言葉にしてください。",
        hints: ["かしこまりすぎた言い回し", "丁寧すぎる敬語", "距離を感じる表現"],
      },
    },
    school: {
      situation: "お便りの書き出しで止まった",
      firstPrompt: "学級だよりの書き出し「夏休みまであと少しです。」に続く一文を考えてください。",
      followUp: {
        template: "「____」が伝わる文にしたいです。その考えを足してください。",
        hints: ["子どもの頑張り", "保護者への感謝", "次学期への期待"],
      },
    },
    reflectPrompt: "AIの続きをそのまま使わず、あなたならどこを直しますか？",
    related: [6, 28],
  }),
  quest({
    id: 4,
    area: "text",
    title: "相手に届く言葉に変えよ",
    ability: "相手に合わせて言い換える",
    inputMode: "text",
    daily: {
      situation: "お願いをやわらかく伝えたい",
      firstPrompt: "「明日までに返してください」を、友人にやわらかく伝える言葉に変えてください。",
      followUp: {
        template: "ここは「____」にしてほしいです。その考えを入れた言い方に直してください。",
        hints: ["急かさない言い方", "都合を尋ねる形", "理由を添える一言"],
      },
    },
    school: {
      situation: "連絡文を読みやすくしたい",
      firstPrompt: "「提出期限を厳守してください」を、保護者向けに穏やかに言い換えてください。",
      followUp: {
        template: "一つだけ、「____」も添えたいです。その考えを入れた文にしてください。",
        hints: ["短い理由の説明", "感謝の一言", "次回への配慮"],
      },
    },
    reflectPrompt: "相手を思い浮かべたとき、あなたが採用したい言い方はどれですか？",
    related: [18, 28],
  }),
  quest({
    id: 5,
    area: "text",
    title: "「もう少し」で答えを変えよ",
    ability: "追加の一言で調整する",
    inputMode: "text",
    daily: {
      situation: "提案が自分には少し難しい",
      firstPrompt: "休みの日にスマホの写真を整理する方法を3つ教えてください。",
      followUp: {
        template: "気になったのは「____」です。自分にはもう少し簡単な方法にしてください。",
        hints: ["整理に使える時間が少ないこと", "スマホの操作が苦手なこと", "一気に終わらせたい気持ち"],
      },
    },
    school: {
      situation: "活動案を教室に合わせたい",
      firstPrompt: "学級でできる短い交流活動を3つ考えてください。",
      followUp: {
        template: "「____」でできる方法にしたいです。その条件でもう少し簡単にしてください。",
        hints: ["準備物なし", "5分以内", "声かけだけ"],
      },
    },
    reflectPrompt: "どんな一言を足すと、答えがあなた向きになりましたか？",
    related: [1, 22],
  }),
  quest({
    id: 6,
    area: "text",
    title: "バラバラのメモをつなげよ",
    ability: "メモを文章にする",
    inputMode: "text",
    daily: {
      situation: "買い物の相談メモを文章にしたい",
      firstPrompt: "次のメモを短い相談文にしてください。「土曜／駅前／昼ごろ／待ち合わせ」",
      followUp: {
        template: "好みは「____」です。かたい部分を直してください。",
        hints: ["親しみやすい言い回し", "絵文字なしでも柔らかい調子", "短く言い切る形"],
      },
    },
    school: {
      situation: "公開用の行事メモを案内文にしたい",
      firstPrompt: "次の公開メモを一文にしてください。「作品展／体育館／午後／上履き」",
      followUp: {
        template: "「____」を目立たせたいです。その考えで並びを変えてください。",
        hints: ["持ち物の指定", "集合時刻", "上履きの注意"],
      },
    },
    reflectPrompt: "できた文章に、あなたの言葉として残したくない表現はありませんか？",
    related: [3, 9],
  }),
  quest({
    id: 7,
    area: "text",
    title: "アイデアを10個集めよ",
    ability: "選択肢を広げる",
    inputMode: "text",
    daily: {
      situation: "休日の小さな楽しみを増やしたい",
      firstPrompt: "家でできる、お金のかからない小さな楽しみを10個出してください。",
      followUp: {
        template: "できれば「____」にしたいです。合うものを残し、別案も足してください。",
        hints: ["音を出さずにできること", "一人でも楽しめること", "片付けが要らないこと"],
      },
    },
    school: {
      situation: "授業の振り返り方法を増やしたい",
      firstPrompt: "個人情報なしでできる、授業の短い振り返り方法を10個考えてください。",
      followUp: {
        template: "選びたいのは「____」です。その条件で候補を絞ってください。",
        hints: ["3分以内に終わる方法", "道具を使わない方法", "一人でできる方法"],
      },
    },
    reflectPrompt: "10個のうち、あなたが試す案・変える案・使わない案はどれですか？",
    related: [20, 25],
  }),
  quest({
    id: 8,
    area: "text",
    title: "分かるまで聞き直せ",
    ability: "説明方法を変えさせる",
    inputMode: "text",
    daily: {
      situation: "聞いた説明が難しかった",
      firstPrompt: "「クラウド保存」を初めて聞く人向けに説明してください。",
      followUp: {
        template: "まだ「____」ができません。自分がイメージできるよう、身近なたとえで説明し直してください。",
        hints: ["頭の中でイメージすること", "自分の言葉で説明し直すこと", "具体例を思い浮かべること"],
      },
    },
    school: {
      situation: "公開された教育用語を簡単に理解したい",
      firstPrompt: "公開資料に出てくる「協働的な学び」を、難しい言葉を避けて説明してください。",
      followUp: {
        template: "「____」を思い浮かべたいです。自分の教室に近い例を一つ加えてください。",
        hints: ["実際の授業場面", "子どもたちの様子", "具体的な活動の一コマ"],
      },
    },
    reflectPrompt: "どの説明なら、あなた自身の言葉で言い直せそうですか？",
    factCheck: {
      required: true,
      method: "公的資料の原文（学習指導要領や解説など）に戻り、AIの説明と用語の定義・範囲がずれていないか確かめます。",
    },
    related: [2, 15],
  }),
  quest({
    id: 9,
    area: "text",
    title: "長い話から必要なことを選べ",
    ability: "困りごとを言葉で説明して整理する",
    inputMode: "text",
    daily: {
      situation: "いくつも重なった用事を整理したい",
      firstPrompt: "書類の記入と、贈り物選びと、家計のメモ整理が同じ週に重なっています。優先順位をつけて3つに分けてください。",
      followUp: {
        template: "先にしたいのは「____」です。その考えに合わせて順番を変えてください。",
        hints: ["締め切りが近いもの", "時間がかからないもの", "気持ちの負担が軽いもの"],
      },
    },
    school: {
      situation: "仕事の混み合いを整理したい",
      firstPrompt: "教材準備、公開資料の確認、会議の準備が重なっています。やることを整理してください。",
      followUp: {
        template: "「____」から考えたいです。その条件で質問を返してください。",
        hints: ["期限が近いもの", "一人で完結するもの", "確認が必要なもの"],
      },
    },
    reflectPrompt: "AIが分けた中で、あなたにとって本当に大事な困りごとはどれですか？",
    related: [6, 19],
  }),
  quest({
    id: 10,
    area: "text",
    title: "小さな困りごとを相談せよ",
    ability: "使い道を自分の生活から探す",
    inputMode: "text",
    daily: {
      situation: "毎日の小さな面倒を減らしたい",
      firstPrompt: "毎日の体調管理として続けやすい小さな工夫を3つ考えてください。",
      followUp: {
        template: "「____」なら続けられます。その考えに合う方法だけ残してください。",
        hints: ["1分でできること", "道具を使わないこと", "朝でも夜でもできること"],
      },
    },
    school: {
      situation: "日々の小さな校務を楽にしたい",
      firstPrompt: "校務として、机上の公開資料を短時間で整理する工夫を3つください。",
      followUp: {
        template: "「____」なら続けられそうです。その考えに合う方法だけ残してください。",
        hints: ["毎日5分でできること", "片手間にできること", "休み時間内に終わること"],
      },
    },
    reflectPrompt: "あなたの生活や仕事で、AIを材料として試せる小さな場面はどこですか？",
    related: [1, 29],
  }),
  quest({
    id: 11,
    area: "media",
    title: "二つの候補をくらべよ",
    ability: "比較する",
    inputMode: "paste",
    daily: {
      situation: "二つの商品の説明文を読み比べたい",
      firstPrompt: "気になっている二つの商品の説明文を、それぞれ「候補A」「候補B」として貼り付けてください。持ち歩きやすさの観点で比べてもらいます。",
      followUp: {
        template: "優先したいのは「____」です。その好みを入れても、見落とす条件がないか教えてください。",
        hints: ["軽さ", "値段の安さ", "丈夫さ"],
      },
    },
    school: {
      situation: "二つの教材の説明文を読み比べたい",
      firstPrompt: "比べたい二つの教材の説明文を、それぞれ「教材A」「教材B」として貼り付けてください。準備時間と参加しやすさの観点で比べてもらいます。",
      followUp: {
        template: "「____」を重く見ます。その考えで比較し直してください。",
        hints: ["全員が参加しやすいこと", "準備時間の短さ", "進め方の分かりやすさ"],
      },
    },
    reflectPrompt: "比べた結果を見て、あなたは何を基準に採用・不採用を決めますか？",
    factCheck: {
      required: true,
      method: "貼り付けた二つの説明文の原文に戻り、比較した条件が実際にそこに書かれているか一つずつ照合します。",
    },
    related: [22, 24],
  }),
  quest({
    id: 12,
    area: "media",
    title: "写真を撮って聞いてみよ",
    ability: "初めて写真を撮影・添付する",
    inputMode: "camera",
    daily: {
      situation: "身の回りの物の使い道を考えたい",
      firstPrompt: "個人情報が写っていない、公開可能な机上の文房具を撮影しました。写っている物を使った整理の案を3つください。",
      followUp: {
        template: "大事にしたいのは「____」です。その条件に合わない案は外してください。",
        hints: ["机を広く使うこと", "短時間で片付くこと", "道具を増やさないこと"],
      },
    },
    school: {
      situation: "公開できる備品写真から使い方を考えたい",
      firstPrompt: "教室を想定した備品写真です。授業での使い方を3つ考えてください。",
      followUp: {
        template: "「____」を大事にしたいです。その考えを入れて案を選び直してください。",
        hints: ["準備時間を短くすること", "子どもだけでできること", "片付けも含めること"],
      },
    },
    reflectPrompt: "写真を見たAIの説明に、あなたが見て違うと思う点はありませんか？",
    related: [13, 17],
  }),
  quest({
    id: 13,
    area: "media",
    title: "写真から忘れ物を防げ",
    ability: "写真を添付してチェックリスト化する",
    inputMode: "camera",
    daily: {
      situation: "外出前の持ち物を確認したい",
      firstPrompt: "名前や住所が写っていない、公開できる持ち物の写真です。見えている物だけをチェックリストにしてください。",
      followUp: {
        template: "「____」も必要だと思います。自分の目で確かめたいので、写真にない物は推測と分かるように分けてください。",
        hints: ["飲み物", "常備薬", "雨具"],
      },
    },
    school: {
      situation: "行事の公開用備品を確認したい",
      firstPrompt: "備品写真です。見えている物を確認表にしてください。",
      followUp: {
        template: "「____」も確認したいです。自分で見比べたいので、画像で確認済みか、追加候補かを分けてください。",
        hints: ["延長コード", "予備の電池", "記録用の用紙"],
      },
    },
    reflectPrompt: "AIの一覧と実物を見比べて、あなたが追加・削除する物は何ですか？",
    related: [12, 17],
  }),
  quest({
    id: 14,
    area: "media",
    title: "無理のない予定に組み直せ",
    ability: "予定を調整する",
    inputMode: "paste",
    daily: {
      situation: "一日の予定が詰まりすぎている",
      firstPrompt: "今日、自分がやろうと思っている用事を書き出して貼り付けてください。無理のない順に組み直します。",
      followUp: {
        template: "先に取りたいのは「____」です。その考えを入れ、余白も作ってください。",
        hints: ["休憩の時間", "移動の時間", "一番気が重い用事"],
      },
    },
    school: {
      situation: "行事の準備予定を整えたい",
      firstPrompt: "今日の校務でやろうと思っている予定を書き出して貼り付けてください。無理のない順に組み直します。",
      followUp: {
        template: "「____」を優先したいです。その条件で無理がないか見直してください。",
        hints: ["会場準備", "資料確認", "休憩の確保"],
      },
    },
    reflectPrompt: "AIの予定案のうち、あなたが現実に合わせて動かす時間はどこですか？",
    related: [9, 22],
  }),
  quest({
    id: 15,
    area: "media",
    title: "むずかしい説明をやさしくせよ",
    ability: "文章・文書を渡して簡単にし原文へ戻る",
    inputMode: "document",
    daily: {
      situation: "公開された説明文を読みやすくしたい",
      firstPrompt: "個人情報を含まない公開文書を添付しました。指定した一段落を、初めて読む人向けに短く説明してください。",
      followUp: {
        template: "「____」という書き方に引っかかります。自分で原文を確かめたいので、どこに書かれているか示してください。",
        hints: ["「必ず」と読める言い切り", "期限に関する言葉", "義務っぽい言い回し"],
      },
    },
    school: {
      situation: "公的な教育資料の一節を理解したい",
      firstPrompt: "添付した公的資料から、指定した一段落だけをやさしく説明してください。",
      followUp: {
        template: "心配なのは「____」です。自分で読み比べたいので、原文の該当箇所と説明を並べてください。",
        hints: ["意味が変わっていないこと", "大事な条件が抜けていないこと", "強すぎる表現になっていないこと"],
      },
    },
    reflectPrompt: "やさしい説明を原文と比べ、あなたが直す必要を感じた部分はどこですか？",
    factCheck: {
      required: true,
      method: "添付した原文の該当段落へ戻り、省略や意味の変化がないか文ごとに確かめます。",
    },
    related: [8, 26],
  }),
  quest({
    id: 16,
    area: "media",
    title: "聞くべき質問を集めよ",
    ability: "質問を作る",
    inputMode: "camera",
    daily: {
      situation: "公開イベントの掲示写真を見て質問を考えたい",
      firstPrompt: "個人情報が写っていない架空イベントの掲示写真です。参加前に確認する質問を5つ作ってください。",
      followUp: {
        template: "気になるのは「____」です。その考えを入れ、掲示に答えがある質問は分けてください。",
        hints: ["持ち物の指定", "集合場所", "参加費の有無"],
      },
    },
    school: {
      situation: "公開掲示の写真から確認事項を考えたい",
      firstPrompt: "イベント掲示の写真です。担当者に確認する質問を5つ考えてください。",
      followUp: {
        template: "先に確かめたいのは「____」です。その条件で質問の順番を変えてください。",
        hints: ["安全面", "持ち物", "当日の連絡先"],
      },
    },
    reflectPrompt: "AIが作った質問から、あなたが本当に聞きたいものをどう選びますか？",
    related: [12, 25],
  }),
  quest({
    id: 17,
    area: "media",
    title: "画像の見落としを探せ",
    ability: "写真・スクリーンショットを添付して観点を増やす",
    inputMode: "image",
    daily: {
      situation: "公開画面のスクリーンショットを別の目で見たい",
      firstPrompt: "個人情報を隠した架空の案内画面です。初めて見る人が迷いそうな点を挙げてください。",
      followUp: {
        template: "「____」も気になります。その違和感を加えて、重要な順にしてください。",
        hints: ["文字の小ささ", "色の見分けにくさ", "ボタンの分かりにくさ"],
      },
    },
    school: {
      situation: "公開用資料の画像に見落としがないか探したい",
      firstPrompt: "案内資料の画像です。読み手が迷う点を観点別に挙げてください。",
      followUp: {
        template: "見ていて「____」が気になりました。その考えを含めて見直してください。",
        hints: ["日付の見つけにくさ", "連絡先の位置", "注意書きの目立たなさ"],
      },
    },
    reflectPrompt: "AIの指摘を画像で確かめ、あなたが採用する指摘と見送る指摘はどれですか？",
    factCheck: {
      required: true,
      method: "AIの指摘を原文に当たる元画像と一つずつ照らし合わせ、実際に見える内容だけを残します。",
    },
    related: [13, 27],
  }),
  quest({
    id: 18,
    area: "media",
    title: "角の立たない言い方を探せ",
    ability: "頼み方・断り方を考える",
    inputMode: "paste",
    daily: {
      situation: "受け取った誘いに角の立たない返事をしたい",
      firstPrompt: "受け取った誘いや依頼の文章を貼り付けてください。感謝を伝えつつ、やんわり断る返事を考えます。",
      followUp: {
        template: "「____」でもかまいません。その条件を守った言い方に直してください。",
        hints: ["次の機会", "短い時間だけの対応", "一部だけの協力"],
      },
    },
    school: {
      situation: "依頼への返事を穏やかにしたい",
      firstPrompt: "受け取った依頼の文章を貼り付けてください。個人情報を含まない範囲で、丁寧に調整の返事を考えます。",
      followUp: {
        template: "「____」なら出せます。その考えを添えつつ、約束しすぎない文にしてください。",
        hints: ["代案", "来週の対応", "一部だけの協力"],
      },
    },
    reflectPrompt: "AIの文を声に出したとき、あなたらしくないと感じる表現はどこですか？",
    related: [4, 23],
  }),
  quest({
    id: 19,
    area: "media",
    title: "頭の中のもやもやを分けよ",
    ability: "考えを整理する",
    inputMode: "paste",
    daily: {
      situation: "気持ちが整理できず、もやもやしている",
      firstPrompt: "頭の中にあるもやもやを、箇条書きで書き出して貼り付けてください。気持ち・事実・決めることの3層に分けます。",
      followUp: {
        template: "気持ちは「____」に少し傾いています。その考えも含め、決めつけずに整理してください。",
        hints: ["休む方", "予定通り進める方", "誰かに相談する方"],
      },
    },
    school: {
      situation: "校務への迷いを整理したい",
      firstPrompt: "校務について頭にあるもやもやを、箇条書きで書き出して貼り付けてください。期待・心配・確認事項の3層に分けます。",
      followUp: {
        template: "「____」なら試したいです。その条件を入れ、最後の判断は私に残してください。",
        hints: ["短時間の試行", "一クラスだけで先に試すこと", "期限を決めて見直すこと"],
      },
    },
    reflectPrompt: "整理された項目を見て、あなた自身が最初に考えたいことは何ですか？",
    related: [9, 23],
  }),
  quest({
    id: 20,
    area: "media",
    title: "AIの案に自分の案を足せ",
    ability: "AI案を完成品にせず自分の考えを加える",
    inputMode: "paste",
    daily: {
      situation: "AIの献立案に自分の食べたい物を足したい",
      firstPrompt: "以前AIが出した案を貼り付けます。それを下書きとして、私の考えを一つ足して組み合わせてください。",
      followUp: {
        template: "ここに「____」を足したいです。元の案を完成品にせず、私の案と組み合わせてください。",
        hints: ["温かい汁物を一品", "もう一つの選択肢", "次の日にも使える工夫"],
      },
    },
    school: {
      situation: "授業案に自分の工夫を加えたい",
      firstPrompt: "以前AIが出した授業案を貼り付けます。それを下書きとして、私の工夫を一つ足して組み合わせてください。",
      followUp: {
        template: "「____」を加えたいです。その考えとAI案を組み合わせてください。",
        hints: ["ペアで一言話す時間", "振り返りカードの記入", "次回への一言メモ"],
      },
    },
    reflectPrompt: "AIの材料にあなた自身の案を加えると、どこが良くなりましたか？",
    related: [7, 24],
  }),
  quest({
    id: 21,
    area: "thinking",
    title: "自分の好みを伝えよ",
    ability: "好みを言葉にする",
    inputMode: "text",
    daily: {
      situation: "自分に合う休み方を探したい",
      firstPrompt: "短い休憩の過ごし方を3つ提案してください。",
      followUp: {
        template: "好みは「____」です。それに合う案に変えてください。",
        hints: ["一人で静かに過ごせる時間", "画面を見ない過ごし方", "短時間で終わる工夫"],
      },
    },
    school: {
      situation: "自分らしい公開資料の見せ方を考えたい",
      firstPrompt: "公開資料を見やすくする工夫を3つ挙げてください。",
      followUp: {
        template: "「____」見せ方のほうが好みです。その考えに合わせてください。",
        hints: ["色を増やさない", "余白を使う", "文字を大きくする"],
      },
    },
    reflectPrompt: "答えを変えたのは、あなたのどんな好みの言葉でしたか？",
    related: [5, 23],
  }),
  quest({
    id: 22,
    area: "thinking",
    title: "条件を一つずつ足せ",
    ability: "条件を追加する",
    inputMode: "text",
    daily: {
      situation: "外出案を少しずつ自分向けにしたい",
      firstPrompt: "日帰りで行けるお出かけ先を3つ考えてください。",
      followUp: {
        template: "まずは「____」を条件にしてください。二つ目以降の条件はまた伝えます。",
        hints: ["雨でもできること", "歩く時間が短いこと", "予算をあまりかけないこと"],
      },
    },
    school: {
      situation: "行事の案内文を少しずつ整えたい",
      firstPrompt: "地域の行事を保護者に知らせる案内文を3つ考えてください。",
      followUp: {
        template: "まずは「____」を条件にしてください。次の条件はまた伝えます。",
        hints: ["日時を最初に書くこと", "持ち物を明記すること", "一文を短くすること"],
      },
    },
    reflectPrompt: "条件を足した前後で、あなたに合う答えはどう変わりましたか？",
    related: [5, 11],
  }),
  quest({
    id: 23,
    area: "thinking",
    title: "「これは違う」を伝えよ",
    ability: "違和感を言葉にして対話を続ける",
    inputMode: "text",
    daily: {
      situation: "提案は悪くないが何かが合わない",
      firstPrompt: "朝の少しの時間でできる、学び直しの習慣を3つ考えてください。",
      followUp: {
        template: "「____」というところが引っかかります。自分の起きる時刻は変えない案にしてください。",
        hints: ["早起きが前提になっていること", "気合いを求められること", "長く続けないといけない感じ"],
      },
    },
    school: {
      situation: "文案の調子が自分に合わない",
      firstPrompt: "公開お知らせの明るい書き出しを2案ください。",
      followUp: {
        template: "「____」は自分の考えと違います。落ち着いた調子に直してください。",
        hints: ["元気すぎる表現", "子どもっぽい言い回し", "勢いだけの言葉"],
      },
    },
    reflectPrompt: "「これは違う」の理由を、あなたはどんな言葉で伝えられましたか？",
    related: [18, 21],
  }),
  quest({
    id: 24,
    area: "thinking",
    title: "良いところだけ残せ",
    ability: "部分的に採用する",
    inputMode: "paste",
    daily: {
      situation: "提案の一部だけを使いたい",
      firstPrompt: "気になっている提案文を貼り付けてください。使える部分と合わない部分に分けてもらいます。",
      followUp: {
        template: "採用したいのは「____」だけです。残りを無理に勧めず、私の案として整えてください。",
        hints: ["短く歩くこと", "記録をつけること", "週末の振り返り"],
      },
    },
    school: {
      situation: "活動案から一部を選びたい",
      firstPrompt: "検討している公開用の活動案を貼り付けてください。使う部分と外す部分に分けてもらいます。",
      followUp: {
        template: "「____」だけ採用します。その考えを中心に5分の案へ直してください。",
        hints: ["短い話し合い", "発表の一部", "説明の要点"],
      },
    },
    reflectPrompt: "AI案のどこを採用・修正・不採用にするか、あなたはどう決めましたか？",
    related: [11, 20],
  }),
  quest({
    id: 25,
    area: "thinking",
    title: "「ほかには？」で視野を広げよ",
    ability: "最初の案を唯一とせず別の見方を集める",
    inputMode: "text",
    daily: {
      situation: "最初の解決案以外も見たい",
      firstPrompt: "初めて使う家電の操作に迷ったときの調べ方を一つ提案してください。",
      followUp: {
        template: "「____」も気になっています。「ほかには？」と別の考え方を3つ出してください。",
        hints: ["唯一の正解ではない可能性", "もっと簡単なやり方があること", "人によって合う方法が違うこと"],
      },
    },
    school: {
      situation: "課題への見方を増やしたい",
      firstPrompt: "話し合いが静かなときの対応を一つ考えてください。",
      followUp: {
        template: "「____」もありそうだと考えます。個人を決めつけず、ほかの見方を3つください。",
        hints: ["時間帯の影響", "話題への慣れの差", "場の雰囲気の影響"],
      },
    },
    reflectPrompt: "増えた見方の中で、あなたが確かめたいものと採らないものはどれですか？",
    related: [7, 16],
  }),
  quest({
    id: 26,
    area: "thinking",
    title: "AIに「本当？」と聞け",
    ability: "公開資料を添付し回答を原文と比べる",
    inputMode: "document",
    daily: {
      situation: "AIの説明が公開資料どおりか確かめたい",
      firstPrompt: "個人情報を含まない公的機関の公開資料を添付しました。指定した項目を説明し、根拠となるページ・見出し・該当箇所を示してください。",
      followUp: {
        template: "「____」は自分で確かめます。原文の見出しとページを示し、推測は分けてください。",
        hints: ["その説明が本当かどうか", "数字の根拠", "引用された条件"],
      },
    },
    school: {
      situation: "公的な教育資料とAI回答を比べたい",
      firstPrompt: "添付した公的教育資料について、指定した項目だけを説明し、根拠となるページ・見出し・該当箇所を示してください。",
      followUp: {
        template: "「____」はそのまま採用せず、自分で確かめます。原文のページと文脈を示してください。",
        hints: ["AIの言葉", "要約された部分", "省略されているかもしれない条件"],
      },
    },
    reflectPrompt: "原文へ戻ったとき、AIの答えと違う点をあなたは見つけましたか？",
    factCheck: {
      required: true,
      method: "公的資料の原文・発行元・更新日を確認し、AI回答の各主張を該当ページと照合します。",
    },
    related: [15, 27],
  }),
  quest({
    id: 27,
    area: "thinking",
    title: "確かめ方を教えてもらえ",
    ability: "スクリーンショットや回答から検証方法を尋ねる",
    inputMode: "image",
    daily: {
      situation: "画面に出た情報の確かめ方を知りたい",
      firstPrompt: "個人情報を隠した架空の回答画面です。この内容を自分で確かめる手順と、探す一次情報を教えてください。",
      followUp: {
        template: "「____」だけでは決めたくありません。自分で確かめられるよう、公的資料と別の情報源を比べる手順にしてください。",
        hints: ["検索結果一つ", "AIの説明だけ", "一つのサイトの情報"],
      },
    },
    school: {
      situation: "公開情報のスクリーンショットを検証したい",
      firstPrompt: "情報画面です。学校で使う前に確かめる順番を教えてください。",
      followUp: {
        template: "「____」も確認したいです。その考えを入れ、原文へたどる方法を示してください。",
        hints: ["発行元", "更新日", "一次資料の有無"],
      },
    },
    reflectPrompt: "AIが示した確認手順のうち、あなたが実際に行って判断できるものはどれですか？",
    factCheck: {
      required: true,
      method: "スクリーンショットの元ページへ戻り、発行元・更新日・一次資料を確認して複数情報源と比べます。",
    },
    related: [17, 26],
  }),
  quest({
    id: 28,
    area: "thinking",
    title: "AIの言葉を自分に戻せ",
    ability: "自分の言葉に直す",
    inputMode: "document",
    daily: {
      situation: "AIが整えた下書きを自分らしく直したい",
      firstPrompt: "個人情報を含まない架空の下書きを添付しました。かたい表現を3つ挙げて、言い換えの候補を出してください。",
      followUp: {
        template: "「____」は残したくありません。候補を材料に、最後は自分で書き直します。",
        hints: ["普段使わない言葉", "堅苦しい言い回し", "よそいきに聞こえる表現"],
      },
    },
    school: {
      situation: "公開文書案を自分の文体に戻したい",
      firstPrompt: "添付した文書案から、かたい表現を3つ挙げてください。",
      followUp: {
        template: "好みは「____」です。候補だけ示し、採用する言葉は私が決めます。",
        hints: ["簡潔な文体", "柔らかい言い回し", "話し言葉に近い表現"],
      },
    },
    reflectPrompt: "AIらしい言葉を外したあと、あなた自身の言葉になったと感じる部分はどこですか？",
    related: [3, 4],
  }),
  quest({
    id: 29,
    area: "thinking",
    title: "自分専用の相談文を作れ",
    ability: "よく使う入口を決める",
    inputMode: "text",
    daily: {
      situation: "何を相談するか迷わない入口がほしい",
      firstPrompt: "日常の困りごとを相談するとき、生成AIに最初に入力する文章を3案ください。",
      followUp: {
        template: "「____」言い方のほうが好みです。自分で直せる下書きにしてください。",
        hints: ["短く済ませられる", "答えを決めつけない", "気軽に始められる"],
      },
    },
    school: {
      situation: "校務相談で使う安全な入口を作りたい",
      firstPrompt: "校務を整理するとき、生成AIに最初に入力する文章を3案ください。",
      followUp: {
        template: "毎回「____」を入れたいです。その考えを入れた短い形にしてください。",
        hints: ["個人情報を入れない確認", "相談内容を一言で示すこと", "答えを急がせない言い方"],
      },
    },
    reflectPrompt: "3案から選び直した、あなた専用の生成AIへの入力文はどんな文章ですか？",
    related: [10, 30],
  }),
  quest({
    id: 30,
    area: "thinking",
    title: "自分の「マイ孫の手」を発見せよ",
    ability: "体験を振り返る",
    inputMode: "text",
    daily: {
      situation: "30回の体験から自分に合う使い道を見つけたい",
      firstPrompt: "この夏、私は{{cleared}}を試しました。この経験に共通する、私に向いていそうな生成AIの使い道を3つ挙げてください。",
      followUp: {
        template: "「____」を思い出して選びます。AIの例を完成品にせず、自分で振り返る質問をしてください。",
        hints: ["一番楽になった場面", "一番迷った場面", "一番自分らしく直した場面"],
      },
    },
    school: {
      situation: "安全に使える自分の校務場面を振り返りたい",
      firstPrompt: "この夏、校務では{{cleared}}を試しました。この経験に共通する使い道を、振り返り用に3分類にまとめてください。",
      followUp: {
        template: "続けられそうな「____」場面だけ選びます。採用・修正・不採用を自分で決める質問をしてください。",
        hints: ["安全に続けられる", "時間をかけずに続けられる", "次の学期でも使えそうな"],
      },
    },
    reflectPrompt: "AIを使う・直す・使わないをあなた自身で決められる「マイ孫の手」は何ですか？",
    related: [20, 29],
  }),
];
