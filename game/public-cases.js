// What happens on the night, as data: the small calls and the patients.
//
// A bed is a short script of choices. Each option is something you could do at the bedside; the
// best one moves the case on, the others make the patient worse and explain why. Every option
// names how many minutes it takes, so a slow night shows on the clock.
//
// Written for the public: no drug doses, no jargon on the monitor. Anything clinical here should
// be checked by a physician before it ships -- see README.md (醫療內容).
//
// This template ships two sample beds (HYPO, STROKE). Add a bed by copying one of them, giving it its own id and bed, and listing it in PUBLIC_CASES at the end;
// `npm test` checks the shape. AGENTS.md has the full list of fields.

// The calls that need nobody at the bed: two ring in the evening, two after lights out. The
// point is what it is like to be called, and woken, for each of them anyway. `visit` is the
// scripted scene if the doctor goes to look (see CASES in game.js); `night` keeps one after dark.
export const PUBLIC_CALLS = [
  { id: 'new', short: '新病人報到', need: 'none', bed: '03B', visit: 'v-new',
    text: '醫師，{bed} 剛從急診上來一位新病人，肺炎，生命徵象都很穩，跟你報告一下。',
    phone: '好，有變化再叫我', phoneReply: '怡君：「好，醫師晚安～」',
    sleepNote: '其實不回也沒事，護理師只是照規定跟你報告。' },
  { id: 'ins', short: '病人睡不著', need: 'phone', bed: '08A', visit: 'v-ins', night: true,
    text: '醫師，{bed} 的阿伯說睡不著，可以給他一顆平常吃的安眠藥嗎？',
    phone: '可以，給他平常那一顆', phoneReply: '小雯：「好，我去給他。」',
    sleepNote: '沒回電話，阿伯醒著看電視到天亮，小雯有點不爽。' },
  { id: 'iv', short: '點滴打完了', need: 'phone', bed: '03A', visit: 'v-iv',
    text: '醫師，{bed} 的點滴打完了，要再接一瓶一樣的嗎？',
    phone: '再接一瓶一樣的', phoneReply: '怡君：「好，我接上。」',
    sleepNote: '等不到你回電，怡君先把點滴調到最慢，沒事。' },
  { id: 'fam', short: '家屬問出院時間', need: 'phone', bed: '11A', visit: 'v-fam',
    text: '醫師，{bed} 的家屬想問，明天早上幾點可以辦出院？',
    phone: '明天主治醫師查房時會說明', phoneReply: '佳穎：「好，我跟家屬說。」',
    sleepNote: '家屬在護理站等了半小時，佳穎只好自己先安撫。' },
];
// Two more just before the day shift, every night, around the morning's patient: the phone
// still rings for small things. The insomniac from midnight wants a laxative; the new patient's 06:00
// pressure is reported because the rules say so.
export const DAWN_CALLS = [
  { id: 'stool', short: '三天沒大便', need: 'phone', bed: '08A', visit: 'v-stool',
    text: '醫師，{bed} 的阿伯又按鈴了，說他三天沒大便，想要一顆軟便藥。',
    phone: '可以，給他一顆軟便藥', phoneReply: '小雯：「好，我拿給他。」',
    sleepNote: '沒回電話，阿伯又按了兩次叫人鈴，小雯只好跟他說等白班醫師。' },
  { id: 'bp', short: '早上血壓有點高', need: 'none', bed: '03B', visit: 'v-bp',
    text: '醫師，跟你報告一下，{bed} 昨天新來的病人，早上六點量血壓 148/86，他說沒有不舒服。',
    phone: '好，沒有不舒服就先觀察，交班時我會說', phoneReply: '怡君：「好～醫師你再睡一下，快交班了。」',
    sleepNote: '其實不回也沒事：血壓有一點高、人沒有不舒服，本來就可以等白班。' },
];
// The dead of night, every night: the patient going home tomorrow runs a low temperature and the
// rules say the doctor is told. It wakes the doctor not long before the patient of the dead of night.
export const DEEP_CALLS = [
  { id: 'temp', short: '體溫 37.8 度', need: 'phone', bed: '11A', visit: 'v-temp',
    text: '醫師，跟你報告一下，{bed} 明天要出院的病人體溫 37.8 度，沒有發抖、沒有不舒服，睡得還不錯。',
    phone: '先多喝水，一小時後再量，超過 38 度或有發抖、喘再叫我', phoneReply: '佳穎：「好，我一小時後再量。」',
    sleepNote: '沒回電話，佳穎一小時後再量一次：37.4，沒事。' },
];
// what goes through the doctor's head after hanging up, one at random
export const AFTER_PHONE = [
  '眼睛閉上了，腦袋還在想剛剛那床。',
];

// Each bed below has the same shape:
//   id, bed, nurse, name, who        who the patient is and where
//   call, again                      the phone call, and the second one if the doctor slept on it
//   phone, callWhy                   what a doctor might say on the phone instead of coming (the
//                                    call offers it like any other call), and why this one needed
//                                    someone at the bed; the nurse's second call says it
//   intro, introLate, late           what the nurse says at the bed; `late` is the state a
//                                    patient is found in after the doctor slept on the call
//   extra, extraOk, extraWarn        the monitor's fourth reading: 'sugar', 'ekg', 'breath', 'urine',
//                                    'skin', 'head', 'fit', 'temp', 'rr', 'stool' or 'rhythm', and which of its
//                                    words read as fine or as a worry
//   states                           the monitor in plain words; undefined keeps the last reading
//   steps                            the questions (see below); the first is `first`
//   warn                             what happens at danger 3: the first sign it is going badly
//   arrest step + cprNext/cprLine    when danger reaches 5 the heart stops; compressions are the
//                                    last chance. A bed with no arrest step fails instead (fail).
//   results                          a line per outcome, for the end of the bed and the summary
//   option draw: true                the choice draws blood as part of the care; it counts as the
//                                    bed's one blood test, and its report is the labs below
//   labs                             what a blood draw at this bed shows, LAB_WAIT game minutes
//                                    later: rows of [項目, 結果, 單位, 參考值, H/L] and a plain note
//                                    (a result written as a string, '1.0', is shown exactly so)
//   card                             what the public should take home

// One bed: an old man with diabetes, found sweaty and hard to wake at night.
export const HYPO = {
  id: 'phypo', bed: '03C', nurse: '怡君', name: '王阿伯', who: '王阿伯 · 72 歲 · 糖尿病',
  short: '叫不太醒，一直冒冷汗', late: 'seize', extra: 'sugar',
  results: { stable: '王阿伯穩住了', icu: '王阿伯救回來了，轉進加護病房' },
  labs: {
    rows: [['血糖 Glucose', 38, 'mg/dL', '70–100', 'L'], ['肌酸酐 Creatinine（腎功能）', 1.6, 'mg/dL', '0.7–1.3', 'H'],
      ['鉀 K', 3.9, 'mmol/L', '3.5–5.1'], ['血紅素 Hb', 12.8, 'g/dL', '12–16']],
    note: '抽血的血糖也是 38，跟床邊血糖機一樣低。血糖機一分鐘就有答案，抽血要等半小時，所以叫不醒的人先用血糖機。腎功能偏差，降血糖藥在身體裡排得慢，低血糖更容易發生，也更容易再來。',
  },
  call: '醫師！{bed} 的王阿伯叫不太醒，一直冒冷汗！',
  // if the doctor sleeps on the first call
  again: '醫師！{bed} 的阿伯開始抽搐了，叫都叫不醒，你快來！',
  phone: '先幫他擦擦汗、量個血壓，有變化再叫我',
  callWhy: '有糖尿病的人叫不太醒、冒冷汗，要先想到低血糖。要有人到床邊測血糖、補糖，量血壓等不到答案。',
  intro: '醫師，這是王阿伯，72 歲，有糖尿病。剛剛巡房發現他叫不太醒，一直冒冷汗。',
  introLate: '醫師你終於來了！阿伯剛剛開始抽，現在叫都叫不醒！',
  // The bedside monitor, in plain words. `sugar: undefined` keeps the last reading shown.
  states: {
    start: { hr: 108, bp: [104, 64], spo2: 96, sugar: null, mind: '叫不太醒，只會哼一聲' },
    worse: { hr: 122, bp: [100, 60], spo2: 95, sugar: undefined, mind: '叫不醒，冷汗直流' },
    seize: { hr: 138, bp: [150, 90], spo2: 88, sugar: undefined, mind: '全身抽搐，叫不醒' },
    low: { hr: 112, bp: [102, 62], spo2: 96, sugar: 38, mind: '叫不太醒' },
    choke: { hr: 132, bp: [112, 70], spo2: 82, sugar: 38, mind: '嗆咳不止，嘴唇發紫' },
    cleared: { hr: 118, bp: [106, 64], spo2: 92, sugar: 38, mind: '叫不醒' },
    awake: { hr: 92, bp: [122, 74], spo2: 97, sugar: 142, mind: '清醒，會回答' },
    relapse: { hr: 110, bp: [108, 66], spo2: 96, sugar: 52, mind: '又冒冷汗、叫不太醒' },
    arrest: { hr: 0, bp: null, spo2: null, sugar: undefined, mind: '沒有反應、沒有呼吸' },
    rosc: { hr: 118, bp: [96, 58], spo2: 94, sugar: 136, mind: '還沒醒，但心跳回來了' },
  },
  // grade: best moves on; ok and bad make the patient worse (danger +1 / +2) and are crossed
  // out with `why`. Too much danger and the patient seizes, then arrests.
  steps: {
    first: {
      ask: '阿伯叫不太醒、全身冒冷汗。你先做什麼？',
      askWarn: '阿伯在抽搐、叫不醒。你先做什麼？',
      options: [
        { id: 'sugar', text: '扎一下手指，測血糖', grade: 'best', min: 2, state: 'low', next: 'treat',
          say: '血糖機「嗶」一聲：38。怡君：「38！好低。」（一般人空腹大約 70 到 100）' },
        { id: 'letsleep', text: '讓他睡，可能只是太累了', grade: 'bad', min: 10, state: 'worse',
          say: '十分鐘後，怡君又跑來：「醫師，他冷汗越來越多，叫都叫不醒耶……」',
          why: '叫不醒不是睡著。有糖尿病的人冒冷汗、叫不醒，要先想到低血糖。' },
        { id: 'ct', text: '推去照腦部電腦斷層，怕是中風', grade: 'ok', min: 15, state: 'worse',
          say: '排檢查、推床過去要好一陣子，阿伯的冷汗一直沒停。',
          why: '中風也可能叫不醒，但測血糖只要一分鐘。叫不醒的人，先排除低血糖。' },
      ],
    },
    treat: {
      ask: '血糖只有 {sugar}，阿伯叫不太醒。接下來？',
      options: [
        { id: 'd50', text: '從點滴打一支高濃度葡萄糖', grade: 'best', min: 3, state: 'awake', next: 'after',
          say: '葡萄糖推進去沒幾分鐘，阿伯眼睛慢慢睜開：「我……怎麼了？」' },
        { id: 'feed', text: '扶他坐起來，餵他喝糖水', grade: 'bad', min: 2, state: 'choke', next: 'choke', quiet: true,
          say: '阿伯吞不下去，糖水嗆進氣管，一直咳，嘴唇開始發紫！',
          why: '叫不醒的人不能從嘴巴餵東西，會嗆到，甚至堵住呼吸道。' },
        { id: 'wait', text: '再觀察 15 分鐘看看', grade: 'bad', min: 15, state: 'seize',
          say: '十五分鐘後，阿伯突然全身抽搐！',
          why: '血糖這麼低，腦部沒有能量，拖越久越危險，要馬上補糖。' },
      ],
    },
    choke: {
      ask: '糖水嗆到了，阿伯一直咳、嘴唇發紫！你要？',
      options: [
        { id: 'side', text: '讓他側躺、抽痰，不要再餵了', grade: 'best', min: 3, state: 'cleared', next: 'treat',
          say: '抽出好多糖水，嘴唇慢慢不紫了。可是血糖還是很低，人還是叫不醒。' },
        { id: 'more', text: '繼續餵，糖分一定要補進去', grade: 'bad', min: 2, next: 'arrest',
          say: '糖水整個堵住了呼吸道……阿伯不動了。',
          why: '嗆到的時候繼續餵，只會把呼吸道堵死。' },
      ],
    },
    after: {
      ask: '阿伯醒了，血糖 142。接下來？',
      options: [
        { id: 'keep', text: '接上葡萄糖點滴、請他吃點東西、先停降血糖藥，一小時後再測血糖', grade: 'best', min: 5, next: 'done', outcome: 'stable',
          say: '阿伯吃了半個麵包：「醫師，不好意思，晚餐我只吃兩口……」他吃的那種降血糖藥，腎不好的人藥效會拖很久。怡君：「那我今晚多測幾次。」' },
        { id: 'gosleep', text: '好了，回去睡覺', grade: 'bad', min: 60, state: 'relapse', next: 'treat',
          say: '你才躺下一個小時，電話又響了：「醫師，阿伯又冒冷汗了，血糖 52！」你只好又爬起來。',
          why: '低血糖常常會再來，尤其是吃降血糖藥或打胰島素的人。醒了要吃東西、接點滴，過一陣子再測。' },
        { id: 'stopmed', text: '把降血糖藥停掉就好，不用再測血糖', grade: 'ok', min: 3,
          say: '藥停了，可是今晚吃下去的藥還在作用。',
          why: '停藥是對的，但已經吃下去的藥還會作用好幾個小時，腎不好的人更久。還是要接葡萄糖點滴、吃東西、再測血糖。' },
      ],
    },
    arrest: {
      ask: '阿伯沒有反應、沒有呼吸！你要？',
      options: [
        { id: 'cpr', text: '拍拍病人、大聲叫，確認沒反應、沒呼吸，馬上廣播急救、請護理師推 AED 來，開始壓胸', grade: 'best', min: 0, cpr: true },
        { id: 'recheck', text: '先再測一次血糖，確定是不是低血糖', grade: 'bad', min: 2,
          death: '沒有呼吸心跳的時候，每拖一分鐘，救回來的機會就少很多。這時候要先壓胸、叫人拿 AED。' },
      ],
    },
    rosc: {
      ask: '阿伯的心跳回來了，但人還沒醒。接下來？',
      options: [
        { id: 'icu', text: '聯絡加護病房，轉過去密切照顧', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '加護病房的護理師推床來接阿伯。你在病歷上補完紀錄，窗外天快亮了。' },
        { id: 'stay', text: '留在一般病房觀察就好', grade: 'ok', min: 3,
          say: '怡君：「醫師……他剛剛心跳停過耶，我一個人顧整排病人，顧不來。」',
          why: '心跳停過的病人，要在加護病房密切監測。' },
      ],
    },
  },
  warn: { state: 'seize', line: '怡君：「醫師！阿伯開始抽搐了！」', log: '王阿伯開始抽搐' },
  arrestLine: '怡君：「醫師！阿伯沒有呼吸了！摸不到脈搏！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '壓了兩分鐘，怡君同時從點滴推進葡萄糖。「醫師！摸得到脈搏了！」',
  // what the public should take home, shown when the bed ends either way
  card: {
    title: '低血糖：你可以記住的四件事',
    points: [
      '有糖尿病的人突然冒冷汗、發抖、心跳快、講話怪怪的或叫不醒，要先想到低血糖。',
      '還清醒、能自己吞：先吃大約 15 公克的糖（約 120–150 毫升果汁或含糖汽水，或 3–4 顆方糖），15 分鐘後再測一次血糖。',
      '叫不醒、吞不下：不要硬餵，會嗆到。讓他側躺，馬上打 119。家裡如果有醫師開的升糖素（鼻噴或注射），可以先用。',
      '醒了之後要吃點東西。低血糖常常會再來，尤其是吃降血糖藥或打胰島素的人。',
    ],
  },
};

// A woman whose right arm and speech go in the night. The point: 微笑、舉手、說你好, the time she
// was last well, and no food, water or aspirin before the scan. A stroke left too long is not
// a cardiac arrest; it fails as a missed window and a life with one side that does not move.
export const STROKE = {
  id: 'pstroke', bed: '08B', nurse: '小雯', name: '陳阿嬤', who: '陳阿嬤 · 68 歲 · 高血壓',
  short: '右手突然沒力、講話怪怪的', late: 'worse', extra: 'sugar',
  results: { stable: '陳阿嬤打上了血栓溶解劑，右手慢慢有力了' },
  labs: {
    rows: [['血糖 Glucose', 132, 'mg/dL', '70–140'], ['血小板 Platelet', 210, '×10³/µL', '150–400'],
      ['凝血 INR', '1.0', '', '0.8–1.2'], ['鈉 Na', 138, 'mmol/L', '135–145']],
    note: '血糖正常，表示不是低血糖造成的；血小板和凝血功能正常，打血栓溶解劑比較安全。不過不用等這張報告才去照斷層：中風每一分鐘都重要，報告可以邊做邊等。',
  },
  call: '醫師，{bed} 的陳阿嬤剛剛起來上廁所，右手拿不住杯子，講話也怪怪的。',
  again: '醫師！{bed} 的陳阿嬤右邊整個不能動了，叫她也比較不醒！',
  phone: '可能剛睡醒還迷糊，讓她先躺著休息，有變化再叫我',
  callWhy: '手突然沒力、講話怪怪的，要先想到中風。中風的治療有時間限制，不能「睡一覺看看」。',
  intro: '醫師，這是陳阿嬤，68 歲，有高血壓。剛剛起來上廁所，右手拿不住杯子，講話也怪怪的。',
  introLate: '醫師你來了……阿嬤右邊整個不能動了，叫她也比較不醒。',
  states: {
    start: { hr: 88, bp: [188, 102], spo2: 97, sugar: null, mind: '清醒，但講話含糊、右手沒力' },
    fast: { hr: 88, bp: [188, 102], spo2: 97, sugar: undefined, mind: '右邊嘴角下垂、右手舉不起來、講話不清' },
    worse: { hr: 94, bp: [198, 108], spo2: 95, sugar: undefined, mind: '叫比較不醒，右邊都不能動' },
    choke: { hr: 104, bp: [192, 104], spo2: 89, sugar: undefined, mind: '嗆咳，右手不能動' },
    slow: { hr: 90, bp: [186, 100], spo2: 97, sugar: undefined, mind: '講話含糊、右手沒力' },
    treated: { hr: 82, bp: [164, 92], spo2: 97, sugar: 132, mind: '清醒，講話慢慢清楚，右手可以抬一點' },
    warned: { hr: 96, bp: [204, 112], spo2: 94, sugar: undefined, mind: '叫不太醒，右半邊完全不能動' },
  },
  steps: {
    first: {
      ask: '陳阿嬤講話含糊、右手沒力。你先做什麼？',
      askWarn: '阿嬤右邊越來越不能動、叫不太醒。你先做什麼？',
      options: [
        { id: 'fast', text: '請她微笑、舉起雙手、說一聲「你好」', grade: 'best', min: 2, state: 'fast', next: 'time',
          say: '阿嬤一笑，右邊嘴角垂下來；兩手舉高，右手慢慢掉下去；「你好」說得含含糊糊。小雯：「三個都有……」' },
        { id: 'sleep', text: '讓她先睡，明天早上再看', grade: 'bad', min: 30, state: 'worse',
          say: '半小時後，小雯又打來：「醫師，阿嬤叫比較不醒了，右邊都不能動！」',
          why: '突然講話不清楚、一隻手沒力，是中風的警訊。睡一覺，就可能錯過治療時間。' },
        { id: 'aspirin', text: '先給她吃一顆阿斯匹靈', grade: 'bad', min: 5, state: 'choke',
          say: '小雯：「醫師，她吞不太下去，一直嗆……」',
          why: '中風也可能是腦出血，還沒照電腦斷層前，不能先給阿斯匹靈。中風的人也常常吞不好，吃藥喝水容易嗆到。' },
      ],
    },
    time: {
      ask: '看起來很像中風。接下來最重要的是？',
      options: [
        { id: 'lkw', text: '問清楚她「最後一次還正常」是幾點', grade: 'best', min: 2, next: 'act',
          say: '小雯翻了一下紀錄：「一個小時前我巡房，她還跟我聊天，好好的。」——還在治療的黃金時間內。' },
        { id: 'wait', text: '等明天早上神經科醫師上班再說', grade: 'bad', min: 30, state: 'worse',
          say: '時間一分一秒過去，阿嬤的右手越來越不能動。',
          why: '中風治療要搶時間。血管塞住的時候，每拖一分鐘，大約就有兩百萬個腦細胞死掉。' },
        { id: 'bp', text: '先用藥把血壓降到正常再說', grade: 'ok', min: 10, state: 'slow',
          say: '血壓降了一點，阿嬤的右手還是一樣沒力。',
          why: '中風時血壓高，常常是身體在努力把血送到腦部，降到「正常」反而傷腦。只有要打血栓溶解劑時，才要先降到 185/110 以下，而且要慢慢降。現在最要緊的是搞清楚發作時間。' },
      ],
    },
    act: {
      ask: '最後正常是一個小時前，還來得及。接下來？',
      options: [
        { id: 'team', text: '測血糖，同時通知中風小組、馬上照腦部電腦斷層', grade: 'best', min: 25, state: 'treated', next: 'after',
          say: '血糖 132，不是低血糖。斷層沒有出血，血管攝影也同時照了，看要不要再用導管把血栓拉出來。血壓還在打藥的上限 185 以上，先用點滴藥慢慢降到 180 以下，神經科醫師才說：「可以打血栓溶解劑。」打上藥半小時後，阿嬤的右手可以抬起來一點了。' },
        { id: 'ctonly', text: '先照電腦斷層，血糖等一下再測', grade: 'ok', min: 10,
          say: '推床去照斷層的路上，小雯問：「醫師，血糖要不要先測一下？」',
          why: '低血糖也會讓人手沒力、講話不清楚，看起來很像中風。測血糖只要一分鐘，要一起做。' },
        { id: 'later', text: '先觀察一個小時，看會不會自己好', grade: 'bad', min: 60, state: 'worse',
          say: '一個小時後，阿嬤的右手完全抬不起來了。',
          why: '中風的症狀有時候會暫時變好，但還是要馬上檢查。等它自己好，往往就錯過治療時間。' },
      ],
    },
    after: {
      ask: '阿嬤打完藥，右手可以抬起來一點了。接下來？',
      options: [
        { id: 'icu', text: '轉加護病房，密切注意血壓和手腳力氣', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '加護病房的護理師來接阿嬤。臨走前，阿嬤含糊地說：「醫師……謝謝。」' },
        { id: 'ward', text: '回一般病房，明天早上再看', grade: 'ok', min: 3,
          say: '小雯：「醫師，打完這個藥不是要一直看血壓跟神經狀況嗎？我們這排就我一個人……」',
          why: '打完血栓溶解劑，可能會腦出血。最初一天要在加護病房密切監測。' },
        { id: 'eat', text: '她說肚子餓，先讓她吃點東西', grade: 'bad', min: 5, state: 'choke',
          say: '阿嬤吃了一口稀飯，就嗆得滿臉通紅。',
          why: '中風的人要先檢查吞嚥，確定吞得好才能吃東西，不然容易嗆到、得吸入性肺炎。' },
      ],
    },
  },
  warn: { state: 'warned', line: '小雯：「醫師！阿嬤右邊整個不能動了，叫她也比較不醒！」', log: '陳阿嬤右半邊完全不能動' },
  fail: {
    title: '陳阿嬤錯過了治療時間',
    text: '她活下來了，但右半邊可能從此不能動，也很難再說出完整的話。中風拖得越久，留下的後遺症越多。',
  },
  card: {
    title: '中風：你可以記住的四件事',
    points: [
      '記住「微笑、舉手、說你好」：嘴角歪一邊、一隻手舉不起來、講話不清楚，任何一個突然出現，都可能是中風。',
      '看一下時間，記住他「最後一次還正常」是幾點。醫師要靠這個時間，決定能不能打血栓溶解劑或取出血栓。',
      '馬上打 119，不要「睡一覺看看」。中風治療要搶時間，越早越好。',
      '先不要讓他吃東西、喝水或吃藥（包括阿斯匹靈）。中風的人容易嗆到，也可能是腦出血。',
    ],
  },
};

// Pocket Medicine 9th 臨床案例 1: 急性心肌梗塞 / STEMI
export const ACS = {
  id: 'pacs', bed: '04A', nurse: '怡君', name: '李伯伯', who: '李伯伯 · 65 歲 · 冠心病史',
  short: '胸口劇痛、冒冷汗，輻射到下巴', late: 'arrest', extra: 'ekg',
  results: { stable: '李伯伯即時完成心導管打通血管，病情穩住了', icu: '李伯伯已轉入心臟加護病房 (CCU) 密切觀察' },
  labs: {
    rows: [
      ['Troponin I（心肌酵素）', '4.82', 'ng/mL', '<0.04', 'H'],
      ['CK-MB（心肌同功酶）', '52', 'U/L', '0–25', 'H'],
      ['鉀 K', '4.1', 'mmol/L', '3.5–5.1'],
      ['血紅素 Hb', '13.6', 'g/dL', '13–18']
    ],
    note: 'Pocket Medicine 指引：高敏感心肌酵素顯著超標，印證急性心肌梗塞。心肌在缺血 20 分鐘後開始壞死，儘速冠狀動脈再灌流是降低死亡率與心衰竭最關鍵的處置。'
  },
  call: '醫師！{bed} 的李伯伯胸口壓迫性劇痛，一直冒冷汗！',
  again: '醫師！{bed} 的李伯伯痛到臉色發灰、量不到血壓了！你快來！',
  phone: '先給他量個血壓，讓他深呼吸，有變化再叫我',
  callWhy: '有冠心病史突然劇烈壓迫性胸痛、冷汗，要先想到急性心肌梗塞。10 分鐘內必須做 12 導程心電圖，不能在電話中等。',
  intro: '醫師，這是 04A 的李伯伯，65 歲，有糖尿病和冠心病。剛剛深夜突然胸口壓迫性劇痛，像大石頭壓住，痛到下巴和左肩，一直冒冷汗。',
  introLate: '醫師你終於來了！李伯伯剛剛痛到叫不出聲，整個人癱在床上！',
  states: {
    start: { hr: 104, bp: [136, 82], spo2: 95, ekg: '胸痛發作中，心電圖未做', mind: '清醒，痛苦呻吟、冒冷汗' },
    ekgDone: { hr: 98, bp: [132, 80], spo2: 95, ekg: 'V1–V4 導程 ST 段明顯抬高 (STEMI)', mind: '清醒，胸骨下持續劇痛' },
    treated: { hr: 88, bp: [120, 74], spo2: 98, ekg: 'ST 段稍微回降，心肌再灌流中', mind: '清醒，胸痛明顯減輕' },
    shock: { hr: 128, bp: [78, 46], spo2: 90, ekg: '廣泛性心肌缺血 ST 抬高', mind: '嗜睡、四肢冰冷、心因性休克' },
    arrest: { hr: 0, bp: null, spo2: null, ekg: '心室顫動 (VF)', mind: '失去意識、無脈搏' },
    rosc: { hr: 110, bp: [94, 56], spo2: 93, ekg: '恢復竇性心律，ST 段仍高', mind: '尚未完全清醒，脈搏已恢復' }
  },
  steps: {
    first: {
      ask: '李伯伯胸口劇痛、冷汗直流。你床邊第一步做什麼？',
      askWarn: '李伯伯四肢發冷、血壓正在往下掉。你先做什麼？',
      options: [
        { id: 'ekg', text: '立刻做 12 導程心電圖 (EKG) 並給氧氣', grade: 'best', min: 2, state: 'ekgDone', next: 'meds',
          say: '心電圖立刻跑出來：V1–V4 ST 段顯著抬高！怡君：「ST 段抬得好高，是前壁心肌梗塞 STEMI！」' },
        { id: 'pain', text: '先打一支止痛針，讓他不痛再檢查', grade: 'bad', min: 10, state: 'shock',
          say: '十分鐘後，李伯伯臉色轉灰，血壓掉到 78/46！',
          why: '胸痛必須先做心電圖查明原因。盲目止痛會掩蓋缺血進展，且非類固醇止痛藥在心肌梗塞會增加心臟破裂風險。' },
        { id: 'gastric', text: '先給予胃乳和制酸劑，懷疑胃食道逆流', grade: 'bad', min: 8, state: 'shock',
          say: '喝了胃乳毫無起色，李伯伯開始喘、四肢發冷！',
          why: '年長冠心病患下巴、胸口壓痛合併冒冷汗是典型心肌梗塞表現，不能先當胃食道逆流。' }
      ]
    },
    meds: {
      ask: '心電圖確診前壁 STEMI！李伯伯血壓 132/80，接下來最關鍵的處置？',
      options: [
        { id: 'stemi', text: '嚼服阿斯匹靈 300mg、舌下含 NTG，同時啟動心導管室 (Code STEMI)', grade: 'best', min: 5, state: 'treated', next: 'after',
          say: '李伯伯嚼服阿斯匹靈並含了 NTG，胸痛稍微緩解。心導管室值班醫師電話那頭說：「我們立即就位，馬上推過來做 PCI！」' },
        { id: 'waitlab', text: '等抽血心肌酵素報告出來，再決定要不要通報心導管', grade: 'bad', min: 30, state: 'shock',
          say: '等了一小時報告出來，李伯伯已經陷入心因性休克！',
          why: 'Pocket Medicine 指引：STEMI 不需要等心肌酵素報告才治療！心電圖有 ST 抬高即達再灌流適應症，每延誤 30 分鐘死亡率顯著上升。' },
        { id: 'ntgonly', text: '只給予舌下含服 NTG，不給抗血小板藥物', grade: 'ok', min: 5,
          say: '含了 NTG 胸痛好轉一點，但心導管小組尚未通報。',
          why: 'NTG 只能擴張血管暫時減輕疼痛，抗血小板藥物 (Aspirin) 與緊急再灌流導管手術才是拯救壞死心肌的核心。' }
      ]
    },
    after: {
      ask: '心導管團隊已就位，李伯伯胸痛減輕。接下來安排？',
      options: [
        { id: 'ccu', text: '推入手術室實施心導管氣球擴張與支架置放，術後入 CCU', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '導管室順利打通李伯伯左前降支 (LAD) 血管，李伯伯說：「胸口大石頭終於搬開了……」' },
        { id: 'stay', text: '留在普通病房，明天早上門診再安排檢查', grade: 'bad', min: 20, next: 'arrest',
          say: '心肌持續大面積缺血，突發致死性心室顫動 (VF)！',
          why: 'STEMI 必須於黃金 90 分鐘內導管打通血管，絕不可留在一般病房觀察。' }
      ]
    },
    arrest: {
      ask: '李伯伯突發心室顫動 (VF) 失去意識！你要？',
      options: [
        { id: 'cpr', text: '立刻廣播急救、推去顫器 (AED) 電擊並開始 CPR 壓胸', grade: 'best', min: 0, cpr: true },
        { id: 'intubate', text: '先準備插管管路', grade: 'bad', min: 2,
          death: '心室顫動時心臟沒有射血，最關鍵是立刻壓胸與去顫電擊！每延遲一分鐘去顫，存活率下降 10%。' }
      ]
    },
    rosc: {
      ask: '電擊與壓胸後心跳恢復，李伯伯脈搏摸得到了。接下來？',
      options: [
        { id: 'icu', text: '直接由急救小組護送緊急推進心導管室打通血管並入加護病房', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '導管室順利打通完全塞住的血管，李伯伯轉入 CCU 密切使用主動脈氣球幫浦支持。' }
      ]
    }
  },
  warn: { state: 'shock', line: '怡君：「醫師！李伯伯血壓一直掉，整個人四肢發冰！」', log: '李伯伯出現心因性休克跡象' },
  arrestLine: '怡君：「醫師！李伯伯心電圖變成 VF，摸不到脈搏了！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '去顫電擊一次並壓胸兩分鐘後，心律轉回竇性心律。「醫師！脈搏摸到了！」',
  card: {
    title: '急性心肌梗塞 (ACS / STEMI)：Pocket Medicine 值班關鍵',
    points: [
      '胸骨下壓迫感、輻射至下巴或左臂、合併冷汗是高危警訊，到床邊 10 分鐘內必須完成 12 導程心電圖 (EKG)。',
      '心電圖見相鄰導程 ST 段抬高 (STEMI)，不需等抽血報告，應立即嚼服 Aspirin (160–325mg) 並立刻啟動心導管室 (Code STEMI)。',
      '血壓若偏低 (<90 mmHg) 或懷疑右心室梗塞，嚴禁使用硝化甘油 (NTG)，以免血壓休克。',
      '突發心因性心跳驟停多為心室顫動 (VF)，第一要務為立即高品質 CPR 壓胸並儘速去顫電擊。'
    ]
  }
};

// Pocket Medicine 9th 臨床案例 2: 致命性高血鉀
export const HYPERK = {
  id: 'phyperk', bed: '06A', nurse: '小雯', name: '洪阿伯', who: '洪阿伯 · 71 歲 · 尿毒症透析病患',
  short: '血鉀 7.2，心律監視器 QRS 變寬', late: 'arrest', extra: 'rhythm',
  results: { stable: '洪阿伯及時穩定心肌細胞膜與降鉀，順利進行透析', icu: '洪阿伯已轉入加護病房進行緊急血液透析' },
  labs: {
    rows: [
      ['血鉀 Potassium', '7.2', 'mmol/L', '3.5–5.1', 'H'],
      ['肌酸酐 Creatinine', '7.8', 'mg/dL', '0.7–1.3', 'H'],
      ['尿素氮 BUN', '82', 'mg/dL', '7–20', 'H'],
      ['酸鹼度 pH（血液氣體）', '7.21', '', '7.35–7.45', 'L']
    ],
    note: 'Pocket Medicine 降鉀三部曲：1. 穩定細胞膜 (Calcium gluconate，EKG有變化時第一優先)；2. 驅鉀入細胞 (Regular Insulin 10U + D50W，配合 Nebulized Albuterol)；3. 排鉀出體外 (透析 Hemodialysis 最有效)。'
  },
  call: '醫師！檢驗科急報 {bed} 洪阿伯血鉀 7.2，監視器上波形看起來怪怪的！',
  again: '醫師！{bed} 的洪阿伯心律越來越寬，量不到血壓了！快來！',
  phone: '請檢驗科重驗一次看看，先不要打點滴，有變化再叫我',
  callWhy: '血鉀 > 6.5 或心電圖出現高尖 T 波、寬 QRS 是極度致命急症，隨時會心室顫動。必須立即到床邊給予鈣劑穩定細胞膜，不能等重驗。',
  intro: '醫師，這是 06A 洪阿伯，有末期腎病規律洗腎。檢驗科剛剛打電話急報血鉀 7.2 mmol/L！心律監視器上 T 波變得很高尖，QRS 也變寬了！',
  introLate: '醫師你終於來了！阿伯的心律監視器整個變成正弦波 (Sine wave)，叫他不太回應！',
  states: {
    start: { hr: 82, bp: [142, 88], spo2: 96, rhythm: 'T波高尖 (Peaked T)、QRS變寬', mind: '清醒，四肢麻木無力' },
    caGiven: { hr: 80, bp: [138, 84], spo2: 96, rhythm: 'QRS 寬度縮短，波形穩定中', mind: '清醒，四肢仍無力' },
    shifted: { hr: 76, bp: [130, 80], spo2: 97, rhythm: '竇性心律，T 波明顯回降', mind: '清醒，力氣稍微恢復' },
    sine: { hr: 114, bp: [82, 48], spo2: 90, rhythm: '正弦波形 (Sine wave) 極度危急', mind: '嗜睡、脈搏微弱' },
    arrest: { hr: 0, bp: null, spo2: null, rhythm: '無脈搏心室心搏過速 (pVT)', mind: '叫不醒、無呼吸脈搏' },
    rosc: { hr: 90, bp: [100, 62], spo2: 94, rhythm: '已穩定化竇性心律', mind: '意識漸醒，脈搏恢復' }
  },
  steps: {
    first: {
      ask: '血鉀 7.2 伴隨心電圖寬 QRS。床邊最最優先的第一劑藥物是什麼？',
      askWarn: '心電圖已變形為正弦波，阿伯意識漸漸模糊。你先給什麼？',
      options: [
        { id: 'calcium', text: '靜脈慢推葡萄糖酸鈣 (Calcium gluconate) 1 支 (10mL)', grade: 'best', min: 2, state: 'caGiven', next: 'shift',
          say: '葡萄糖酸鈣推進去兩分鐘，監視器上 QRS 寬度立刻明顯收窄！小雯：「波形變漂亮了！太神奇了。」' },
        { id: 'insulinonly', text: '只給短效胰島素 (RI) 10 單位皮下注射', grade: 'bad', min: 15, state: 'sine',
          say: '皮下吸收太慢，波形惡化成瀕臨停止的正弦波！',
          why: 'Pocket Medicine 首要原則：心電圖異常時，第一步是 IV 給鈣劑穩定細胞膜（2-3分鐘見效），且胰島素必須靜脈給予並配合高濃度糖水。' },
        { id: 'water', text: '大量灌開水，希望多尿尿排鉀', grade: 'bad', min: 10, state: 'sine',
          say: '阿伯根本沒有尿，水分堆積造成肺水腫，心律更差了！',
          why: '洗腎病患無尿，大量喝水只會引發致命肺水腫。' }
      ]
    },
    shift: {
      ask: '細胞膜已穩定。接下來如何迅速把血液中的鉀離子移入細胞內？',
      options: [
        { id: 'ri_d50', text: '給予靜脈短效胰島素 (RI) 10U + D50W 葡萄糖 2 支，並吸入 Albuterol', grade: 'best', min: 5, state: 'shifted', next: 'elim',
          say: '小雯將 RI 與高濃度葡萄糖推進去，並接上吸入劑。半小時後床邊氣血分析血鉀降至 5.6！' },
        { id: 'waitdial', text: '什麼藥都不用給，乾等明天早上洗腎室開門', grade: 'bad', min: 30, state: 'sine',
          say: '鈣劑的保護只有半小時，藥效過了之後心律再次崩潰！',
          why: '鈣劑不降低血鉀數值，只保護心臟 30-60 分鐘。必須緊接著給予促使鉀離子內流與排出的藥物。' }
      ]
    },
    elim: {
      ask: '血鉀暫時內流，但體內總鉀量仍高。根本排除體內的最終處置是？',
      options: [
        { id: 'hd', text: '聯絡腎臟科值班醫師與透析室，安排緊急血液透析 (HD)', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '透析室護理師與腎臟科醫師立刻備機，阿伯順利上機洗腎，血鉀降至 4.2 安全範圍。' },
        { id: 'furo', text: '給予大劑量利尿劑 (Lasix) 讓他自己排', grade: 'ok', min: 10,
          say: '小雯：「醫師，阿伯平常就完全沒尿了，利尿劑可能沒什麼用……」',
          why: '末期無尿腎病患無法靠利尿劑排鉀，緊急透析才是唯一可靠的體外排除手段。' }
      ]
    },
    arrest: {
      ask: '阿伯突發心律崩潰，無脈搏心搏過速！你要？',
      options: [
        { id: 'cpr', text: '啟動急救、立刻去顫電擊並開始 CPR 壓胸，加打高劑量 Calcium', grade: 'best', min: 0, cpr: true },
        { id: 'checkk', text: '再去抽一管血確認血鉀到底多少', grade: 'bad', min: 2,
          death: '心跳驟停時分秒必爭，抽血無法挽救生命，必須立即壓胸與電擊去顫！' }
      ]
    },
    rosc: {
      ask: '電擊並持續壓胸後，阿伯心跳恢復。接下來？',
      options: [
        { id: 'icu', text: '轉入加護病房，於床邊緊急設置股靜脈雙腔導管進行連續血液透析', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '加護病房團隊立即接手，順利將阿伯體內多餘血鉀洗出。' }
      ]
    }
  },
  warn: { state: 'sine', line: '小雯：「醫師！阿伯心律變成正弦波了！血壓掉到 80！」', log: '洪阿伯出現正弦波致命心律' },
  arrestLine: '小雯：「醫師！摸不到脈搏了！心室頻脈！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '持續壓胸並再給予一劑氯化鈣與去顫後，「醫師，心跳回來了！QRS 收窄了！」',
  card: {
    title: '致命性高血鉀：Pocket Medicine 值班關鍵原則',
    points: [
      '心電圖變化比血鉀絕對數值更危急：T 波高尖、PR 延長、QRS 增寬，乃至正弦波 (Sine wave) 隨時心跳停止。',
      '心電圖異常第一步：IV Calcium gluconate 10mL 慢推，2-3 分鐘迅速穩定心肌膜電位（注意：鈣劑不降血鉀數值！）。',
      '移鉀入細胞：IV Regular Insulin 10U + D50W 50-100mL（預防低血糖），加上吸入 Albuterol 10-20mg。',
      '無尿腎病患無法靠利尿劑排鉀，必須果斷聯繫緊急血液透析 (Urgent Hemodialysis)。'
    ]
  }
};

// Pocket Medicine 9th 臨床案例 3: 急性上消化道大出血
export const GIB = {
  id: 'pgib', bed: '07A', nurse: '佳穎', name: '吳先生', who: '吳先生 · 54 歲 · 肝硬化病史',
  short: '大量吐鮮血、解黑便，血壓掉到 80', late: 'arrest', extra: 'stool',
  results: { stable: '吳先生輸血與止血藥物及時生效，順利完成內視鏡止血', icu: '吳先生已送入加護病房插管保護氣道並急做止血術' },
  labs: {
    rows: [
      ['血紅素 Hb', '6.2', 'g/dL', '13.0–18.0', 'L'],
      ['血小板 Platelet', '62', '×10³/µL', '150–400', 'L'],
      ['凝血時間 INR', '1.82', '', '0.8–1.2', 'H'],
      ['白蛋白 Albumin', '2.3', 'g/dL', '3.5–5.5', 'L']
    ],
    note: 'Pocket Medicine：急性大出血初期 Hb 可能尚未真實反映失血量。輸血目標為維持 Hb 在 7–8 g/dL（限制性輸血策略，避免門脈壓力反彈）。肝硬化破裂出血必須併用 Octreotide 與預防性抗生素。'
  },
  call: '醫師！{bed} 的吳先生剛剛吐了好大一碗鮮血，還解了大量瀝青黑便，血壓 80/46！',
  again: '醫師！{bed} 的吳先生又吐了 500cc 鮮血，叫他都快沒反應了！快來！',
  phone: '先給他吃胃乳，把頭墊高，有變化再叫我',
  callWhy: '肝硬化吐鮮血合併休克血壓，高機率為食道靜脈曲張破裂大出血。必須立即到床邊建立大口徑靜脈管路輸液輸血，電話拖延會失血性休克致死。',
  intro: '醫師，這是 07A 的吳先生，有 B 肝肝硬化。剛剛連續吐出大量鮮紅血液與血塊，床底下便盆全是瀝青樣黑便！血壓掉到 80/46，脈搏 128！',
  introLate: '醫師你來了！病人吐到滿身滿床都是血，現在臉色慘白叫不太醒！',
  states: {
    start: { hr: 128, bp: [80, 46], spo2: 94, stool: '大量瀝青黑便伴鮮血塊', mind: '意識躁動、冒冷汗、四肢冰冷' },
    ivPlaced: { hr: 112, bp: [92, 56], spo2: 95, stool: '黑便持續', mind: '意識稍微清醒' },
    stabilized: { hr: 90, bp: [108, 66], spo2: 97, stool: '黑便量減少', mind: '清醒，休克症狀緩解' },
    bleeding: { hr: 142, bp: [66, 38], spo2: 88, stool: '持續大量湧出鮮血', mind: '嗜睡、意識不清' },
    arrest: { hr: 0, bp: null, spo2: null, stool: '出血性休克停止呼吸', mind: '無反應、脈搏停止' },
    rosc: { hr: 118, bp: [88, 52], spo2: 92, stool: '暫時壓制出血', mind: '未清醒，微弱動脈搏動' }
  },
  steps: {
    first: {
      ask: '吳先生大量吐血、低血壓休克。床邊第一要務是什麼？',
      askWarn: '吳先生臉色慘白，血壓量不到。第一步該做什麼？',
      options: [
        { id: 'lines', text: '建立兩條大口徑靜脈管路 (16–18G)、快速輸生理食鹽水並備紅血球 (PRBC)', grade: 'best', min: 3, state: 'ivPlaced', next: 'meds',
          say: '佳穎迅速打上兩支大口徑 18G IV，生理食鹽水全速灌注，血壓回升至 92/56！' },
        { id: 'ng', text: '馬上插鼻胃管用力灌冰水洗胃', grade: 'bad', min: 10, state: 'bleeding',
          say: '插管刺激造成靜脈曲張更大撕裂，大量血水噴出！',
          why: 'Pocket Medicine 指引：休克時第一優先是循環復甦 (ABC)。冰水洗胃無助止血，盲目插管反而可能刮破血管加劇出血。' },
        { id: 'oralmed', text: '給予口服止血粉，請他慢慢喝下去', grade: 'bad', min: 5, state: 'bleeding',
          say: '吞下去立刻引發劇烈嘔吐，血壓進一步暴跌！',
          why: '活動性吐血患者嚴禁口服給藥，會引發嘔吐甚至窒息。' }
      ]
    },
    meds: {
      ask: '輸液進行中，吳先生有肝硬化病史。接下來給予哪組關鍵藥物？',
      options: [
        { id: 'octreotide', text: '靜脈注射 Octreotide (降低門脈高壓)、高劑量 PPI，並給予 Ceftriaxone', grade: 'best', min: 5, state: 'stabilized', next: 'scope',
          say: 'Octreotide 與 PPI 注射後，嘔血明顯減緩！小雯也給上了預防性抗生素 Ceftriaxone。' },
        { id: 'ppionly', text: '只給一般劑量口服胃藥', grade: 'bad', min: 15, state: 'bleeding',
          say: '門脈高壓未降，血管持續湧出鮮血！',
          why: 'Pocket Medicine：肝硬化靜脈曲張破裂，必須使用血管加壓素/Octreotide 降低門脈壓力，且預防性抗生素 (Ceftriaxone) 可顯著降低再出血率與死亡率。' }
      ]
    },
    scope: {
      ask: '生命徵象暫時穩定，輸血進行中。接下來的確定性處置是？',
      options: [
        { id: 'egd', text: '緊急聯繫消化內科醫師，安排急診胃鏡 (EGD) 進行曲張靜脈結紮術 (EVL)', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '腸胃科醫師火速趕到，胃鏡下順利以橡皮圈將出血的靜脈曲張結紮 (EVL)！吳先生轉入加護病房觀察。' },
        { id: 'waitday', text: '等明天早上上班時間再排胃鏡', grade: 'bad', min: 30, next: 'arrest',
          say: '後半夜再次噴血，失血性休克心跳停止！',
          why: '大量活動性消化道出血經藥物穩定後，應於 12–24 小時內（休克穩定後儘速）完成內視鏡止血。' }
      ]
    },
    arrest: {
      ask: '吳先生大量失血休克心跳停止！你要？',
      options: [
        { id: 'cpr', text: '立刻廣播急救、加壓輸血並開始高品質壓胸 CPR', grade: 'best', min: 0, cpr: true },
        { id: 'suction', text: '只做抽痰清嘴巴', grade: 'bad', min: 2,
          death: '心跳停止時第一順位是胸部按壓與大容量輸血搶救循環！' }
      ]
    },
    rosc: {
      ask: '加壓輸血與壓胸後心跳恢復，接下來？',
      options: [
        { id: 'icu', text: '轉入加護病房，氣管內管保護呼吸道後床邊緊急內視鏡止血', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '重症團隊迅速插管保護呼吸道，胃鏡成功結紮出血點。' }
      ]
    }
  },
  warn: { state: 'bleeding', line: '佳穎：「醫師！吳先生又大口吐血了！血壓量不到了！」', log: '吳先生再次爆發大量嘔血' },
  arrestLine: '佳穎：「醫師！病人摸不到脈搏了！心跳停了！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '兩袋紅血球快速加壓灌入，持續壓胸兩分鐘後：「醫師！頸動脈摸得到搏動了！」',
  card: {
    title: '急性消化道大出血 (UGIB)：Pocket Medicine 值班關鍵',
    points: [
      '生命徵象第一 (Resuscitation First)：立即放置兩條 16–18G 大口徑 IV，快速輸液並緊急備紅血球 (PRBC)。',
      '肝硬化疑似靜脈曲張破裂：立即給予 Octreotide (50mcg bolus, 50mcg/hr) 降低門脈高壓，並靜脈注射高劑量 PPI。',
      '預防性抗生素 (Ceftriaxone 1g/d)：在肝硬化大出血病患可顯著降低自發性細菌性腹膜炎 (SBP) 與敗血症死亡率。',
      '限制性輸血策略 (Restrictive transfusion)：目標 Hb 7–8 g/dL 即可，過度輸血會導致門脈壓力升高引發再次出血。'
    ]
  }
};

// Pocket Medicine 9th 臨床案例 4: 嚴重敗血性休克
export const SEPSIS = {
  id: 'psepsis', bed: '11B', nurse: '佳穎', name: '林奶奶', who: '林奶奶 · 83 歲 · 泌尿道感染住院',
  short: '高燒 39.5 度、寒顫，血壓 74/42', late: 'arrest', extra: 'temp',
  results: { stable: '林奶奶落實敗血症一小時組合處置，血壓回升尿量產出', icu: '林奶奶已穩定轉入加護病房接受升壓劑與器官支持' },
  labs: {
    rows: [
      ['白血球 WBC', '21.8', '×10³/µL', '4.0–11.0', 'H'],
      ['未成熟嗜中性球 Band', '18', '%', '0–5', 'H'],
      ['乳酸 Lactate', '4.6', 'mmol/L', '0.5–2.2', 'H'],
      ['肌酸酐 Creatinine', '2.2', 'mg/dL', '0.5–1.1', 'H']
    ],
    note: 'Pocket Medicine Sepsis 1-Hour Bundle：1. 抽兩套血液培養（給抗生素前）；2. 一小時內給予廣效靜脈抗生素；3. 30 mL/kg 晶體輸液；4. MAP < 65 立即使用 Norepinephrine；5. 追蹤 Lactate 評估組織灌流。'
  },
  call: '醫師！{bed} 的林奶奶突發高燒 39.5 度狂發抖，量血壓只有 74/42！',
  again: '醫師！{bed} 的林奶奶神智不清了，四肢發紺摸不到脈搏！快來！',
  phone: '先給一顆退燒藥，多蓋兩條被子，有變化再叫我',
  callWhy: '高燒合併嚴重視覺低血壓 (MAP < 65) 是敗血性休克！每延誤一小時給抗生素，死亡率上升 7.6%，絕不能只給退燒藥。',
  intro: '醫師，這是 11B 的林奶奶，因泌尿道感染住院打抗生素。剛剛突發高燒 39.5°C，全身發抖，血壓驟降到 74/42，心跳 136，人叫不太醒！',
  introLate: '醫師你來了！阿嬤四肢全都是紫斑，血壓量不到了，叫都沒反應！',
  states: {
    start: { hr: 136, bp: [74, 42], spo2: 92, temp: 39.5, mind: '嗜睡、意識混亂、四肢冰冷' },
    bundle1: { hr: 120, bp: [86, 50], spo2: 94, temp: 39.1, mind: '可被叫醒但虛弱' },
    stable: { hr: 96, bp: [106, 64], spo2: 96, temp: 38.2, mind: '清醒，會配合回答' },
    shock: { hr: 148, bp: [62, 34], spo2: 86, temp: 39.8, mind: '昏迷、周邊發紺、無尿' },
    arrest: { hr: 0, bp: null, spo2: null, temp: 39.8, mind: '呼吸心跳停止' },
    rosc: { hr: 122, bp: [88, 50], spo2: 93, temp: 38.6, mind: '重度昏睡，動脈搏動恢復' }
  },
  steps: {
    first: {
      ask: '林奶奶高燒、低血壓休克 (MAP < 65)。依照 Pocket Medicine Sepsis 1-Hour Bundle，第一步？',
      askWarn: '阿嬤發紺發涼、血壓量不到。第一步該做什麼？',
      options: [
        { id: 'bundle', text: '立刻抽兩套血液培養 (Blood CS x 2)、給予 30 mL/kg 快速靜脈輸液，並抽乳酸 (Lactate)', grade: 'best', min: 3, state: 'bundle1', next: 'abx',
          say: '佳穎迅速抽出兩套血培養，開啟全速輸液，並送急件乳酸檢查！' },
        { id: 'antipyretic', text: '先塞一顆退燒塞劑，等體溫退了血壓就會回來', grade: 'bad', min: 15, state: 'shock',
          say: '體溫退了一點，但感染源引發的血管擴張性休克急速惡化，血壓崩至 62/34！',
          why: '敗血性休克的低血壓是全身性發炎血管癱瘓與微循環障礙，退燒藥完全無法改善器官灌流。' },
        { id: 'waiturine', text: '先等她上一泡尿出來看顏色再說', grade: 'bad', min: 20, state: 'shock',
          say: '腎臟灌流不足早已無尿，拖延造成不可逆多器官衰竭！',
          why: '無尿是休克的器官低灌流徵兆，必須立即輸液復甦與升壓支持。' }
      ]
    },
    abx: {
      ask: '血培養已抽完、輸液進行中。接下來抗生素與升壓劑的處置？',
      options: [
        { id: 'abx_vaso', text: '1小時內給予廣效靜脈抗生素 (Pip-Tazo/Cefepime)，若輸液後 MAP 仍低於 65 立即上 Norepinephrine', grade: 'best', min: 5, state: 'stable', next: 'after',
          say: '抗生素迅速注射完畢，升壓劑 Norepinephrine 上線後，血壓穩固回升至 106/64！林奶奶眼睛慢慢張開。' },
        { id: 'waitcs', text: '等兩天後培養長出細菌，再決定打哪一種抗生素', grade: 'bad', min: 30, state: 'shock',
          say: '沒有抗生素壓制，菌血症演變成頑固性多器官衰竭！',
          why: 'Pocket Medicine 敗血症黃金法則：給予廣效抗生素每延誤一小時，敗血性休克死亡率增加約 7.6%！絕不能等培養報告。' }
      ]
    },
    after: {
      ask: '林奶奶血壓回升、意識恢復清醒。接下來的照護處置？',
      options: [
        { id: 'icu', text: '轉入加護病房，持續監控每小時尿量、動脈血壓與乳酸清除率', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '加護病房團隊推床接手，林奶奶尿量恢復至每小時 40mL，乳酸由 4.6 降至 2.1。' },
        { id: 'general', text: '留在普通病房，請護理師四小時量一次血壓', grade: 'ok', min: 10,
          say: '佳穎：「醫師，阿伯的 Norepinephrine 升壓劑還在打，普通病房沒有自動動脈血壓監視，很危險……」',
          why: '使用升壓劑的敗血性休克患者必須在加護病房或重症照護單位嚴密監控。' }
      ]
    },
    arrest: {
      ask: '林奶奶休克惡化心跳停止！你要？',
      options: [
        { id: 'cpr', text: '立刻廣播急救、開始胸部按壓 CPR 並推高流量氧氣', grade: 'best', min: 0, cpr: true },
        { id: 'wait', text: '再調高升壓劑速度看心跳會不會回來', grade: 'bad', min: 2,
          death: '心跳停止時升壓藥物無法在體內循環，必須立刻壓胸提供人工循環！' }
      ]
    },
    rosc: {
      ask: '壓胸急救後心跳恢復，接下來？',
      options: [
        { id: 'icu', text: '緊急插管保護呼吸道，轉入加護病房全力抗休克治療', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '加護病房團隊立即接管，進行重症器官灌流支持。' }
      ]
    }
  },
  warn: { state: 'shock', line: '佳穎：「醫師！林奶奶血壓掉到 62！四肢摸起來好冰！」', log: '林奶奶陷入難治性敗血性休克' },
  arrestLine: '佳穎：「醫師！林奶奶沒有心跳了！摸不到脈搏！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '持續壓胸兩分鐘，給予靜脈腎上腺素後：「醫師！摸得到脈搏了！」',
  card: {
    title: '敗血性休克 (Septic Shock)：Pocket Medicine 1-Hour Bundle',
    points: [
      '發燒伴隨低血壓 (MAP < 65) 或意識改變即為重症急急症，切勿當作單純發燒只給退燒藥。',
      '抽血培養必須在給抗生素前完成，但絕不能為了等培養而延遲抗生素超過 1 小時（每延遲一小時死亡率上升 7.6%）。',
      '輸液復甦：首劑給予 30 mL/kg 晶體溶液 (Crystalloids)。若輸液後血壓未回升，首選升壓劑為 Norepinephrine。',
      '乳酸 (Lactate) > 2 mmol/L 代表組織缺氧灌流不足，必須每 2–4 小時複查確認乳酸下降（乳酸清除率 Lactate clearance）。'
    ]
  }
};

// the beds a night draws from (普通班 four to six a night, 大爛班 six to eight, never more than are
// listed here); `night: true` marks a bed whose call says 半夜, which game.js only rings after 23:30
export const PUBLIC_CASES = [HYPO, STROKE, ACS, HYPERK, GIB, SEPSIS];

// CPR: chest compressions to a beat. 30 compressions at 100–120 a minute, judged on exactly the
// range the screen gives; the rate is the median of the presses after the first two, so a
// hesitant start or one stray press is forgiven.
export const CPR = { presses: 30, slowest: 100, fastest: 120, maxGap: 2.5 };
