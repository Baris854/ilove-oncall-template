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

// Pocket Medicine 9th 臨床案例 4: 急性心衰竭合併肺水腫 / ADHF & Pulmonary Edema (Cardiology)
export const ADHF = {
  id: 'padhf', bed: '08C', nurse: '怡君', name: '黃伯伯', who: '黃伯伯 · 76 歲 · 缺血性心肌病史',
  short: '半夜嚴重端坐呼吸、狂咳粉紅泡沫痰', late: 'arrest', extra: 'breath',
  results: {
    stable: '黃伯伯在 BiPAP 陽壓呼吸與靜脈利尿劑處置下，肺部囉音明顯消退，呼吸平穩',
    icu: '黃伯伯已緊急轉入心臟加護病房 (CCU) 接受進一步後負荷調控與連續血行動力學監測'
  },
  labs: {
    rows: [
      ['NT-proBNP（心衰竭指數）', '14,800', 'pg/mL', '<125', 'H'],
      ['肌酸酐 Cr', '1.6', 'mg/dL', '0.7–1.3', 'H'],
      ['鉀 K', '4.3', 'mmol/L', '3.5–5.1'],
      ['動脈血氧 PaO2', '58', 'mmHg', '80–100', 'L']
    ],
    note: 'Pocket Medicine 指引：急性失代償性心衰竭 (ADHF) 合併肺水腫時，首選非侵襲性陽壓呼吸 (NIV/BiPAP) 迅速增加胸內壓、減少靜脈回流 (Preload) 並改善氧合；並立即靜脈給予 Loop 利尿劑 (IV Furosemide) 與血管擴張劑 (IV NTG，血壓允許下)。急性發作期嚴禁啟動或增加 Beta-blocker！'
  },
  call: '醫師！{bed} 的黃伯伯沒辦法躺平，一直坐起來喘，還咳出粉紅色泡沫痰！',
  again: '醫師！{bed} 的黃伯伯臉色發紫、SpO2 掉到 78% 了，你快點來！',
  phone: '先讓他維持坐姿，給予高濃度氧氣面罩，我馬上過去看',
  callWhy: '半夜端坐呼吸伴隨粉紅色泡沫痰是急性肺水腫的典型危急徵兆，肺泡正在快速滲出液體，隨時可能呼吸衰竭窒息，必須立刻到床邊搶救。',
  intro: '醫師，08C 的黃伯伯 76 歲，有冠心病與心衰竭（EF 30%）。半夜突然喘到坐起來，咳出大量粉紅色泡沫痰，血壓高達 190/105 mmHg。',
  introLate: '醫師你終於來了！黃伯伯已經快吸不到氣，兩手抓著床欄整個人冷汗狂流！',
  states: {
    start: { hr: 118, bp: [192, 106], spo2: 84, breath: '雙側中下肺廣泛濕囉音 (Crackles)', mind: '清醒，極度焦慮喘促、端坐呼吸' },
    bipapDone: { hr: 106, bp: [178, 96], spo2: 92, breath: '雙側濕囉音，在 BiPAP 支持下呼吸功減輕', mind: '清醒，喘促稍緩' },
    treated: { hr: 84, bp: [136, 80], spo2: 97, breath: '濕囉音大幅吸收，呼吸平順', mind: '平穩，可以稍微斜躺' },
    shock: { hr: 136, bp: [78, 48], spo2: 78, breath: '廣泛水泡音，呼吸極度微弱發紺', mind: '嗜睡、發紺、瀕臨呼吸竭力' },
    arrest: { hr: 0, bp: null, spo2: null, breath: '停止呼吸', mind: '意識喪失、無脈搏' },
    rosc: { hr: 110, bp: [96, 60], spo2: 93, breath: '氣管內管通氣中', mind: '昏迷，脈搏已恢復' }
  },
  steps: {
    first: {
      ask: '黃伯伯端坐狂喘、狂咳粉紅泡沫痰，SpO2 84%，血壓 192/106 mmHg。你第一步怎麼做？',
      askWarn: '黃伯伯呼吸急促發紺、快喘不過氣來，你第一步怎麼做？',
      options: [
        { id: 'bipap', text: '保持病人高坐臥姿，立刻接上非侵襲性陽壓呼吸 (BiPAP) 支持', grade: 'best', min: 2, state: 'bipapDone', next: 'meds',
          say: '怡君立即替黃伯伯推來 BiPAP 面罩打上陽壓支持，病人胸部呼吸功顯著減輕。' },
        { id: 'fluid', text: '靜脈灌注 500 mL 生理食鹽水', grade: 'bad', min: 5, state: 'shock', next: 'arrest',
          why: '急性心衰竭肺水腫體內已嚴重液體過負荷，快速灌水會加速肺水腫窒息致死。' },
        { id: 'flat', text: '讓病人平躺在床上蓋被，囑咐深呼吸放鬆', grade: 'bad', min: 3, state: 'shock', next: 'arrest',
          why: '平躺會急遽增加下肢回心血量 (Preload)，使肺水腫迅速惡化窒息。' },
        { id: 'bb', text: '心跳 118 太快，立刻靜脈給予 Propranolol 5mg', grade: 'bad', min: 4, state: 'shock', next: 'arrest',
          why: '急性失代償心衰竭給予 Beta-blocker 會直接瓦解心臟收縮力，引發心因性休克死亡。' }
      ]
    },
    meds: {
      ask: 'BiPAP 打上後 SpO2 回升至 92%，血壓仍有 178/96 mmHg，肺部滿是濕囉音。此時藥物處置首選？',
      options: [
        { id: 'lasix_ntg', text: '靜脈推注 Furosemide (Lasix) 40mg + 舌下含服/靜脈滴注 NTG 擴張血管', grade: 'best', min: 10, state: 'treated', next: 'icu_plan',
          say: '利尿劑迅速利尿，NTG 擴張靜脈顯著降低心臟 Preload 與 Afterload，血壓降至 136/80，雙肺囉音大幅吸收！' },
        { id: 'wait_lab', text: '等抽血腎功能與 NT-proBNP 檢驗結果出來再開藥', grade: 'bad', min: 30, state: 'shock', next: 'arrest',
          why: '急性肺水腫隨時可能呼吸衰竭窒息，抽血需要時間，臨床高度懷疑時必須立即給予利尿與降後負荷。' },
        { id: 'diltiazem', text: '給予靜脈抗心律不整藥 Diltiazem 緩解心搏過速', grade: 'bad', min: 5, state: 'shock', next: 'arrest',
          why: 'Diltiazem 具負性肌力作用，收縮功能低下心衰竭使用可能誘發急性心因性衰竭。' }
      ]
    },
    icu_plan: {
      ask: '黃伯伯血壓回穩至 136/80 mmHg，肺水腫消退，呼吸轉為平順。後續處置計畫？',
      options: [
        { id: 'icu', text: '收治心臟加護病房 (CCU) 密切監測尿量電解質，並排明日心臟超音波', grade: 'best', min: 15, next: 'done', outcome: 'icu',
          say: '聯繫 CCU 完成床位交班，心臟科加護團隊接手後續治療。' },
        { id: 'ward', text: '症狀已緩解，留在一般病房繼續常規觀察即可', grade: 'ok', min: 10, next: 'done', outcome: 'stable',
          why: '嚴重肺水腫在 24 小時內極易復發或發生電解質急性紊亂，轉 CCU 觀察最為安全。' }
      ]
    },
    arrest: {
      ask: '黃伯伯突然呼吸停止、心電圖呈心室性頻脈 (VT) 轉心室顫動 (VF)！',
      options: [
        { id: 'cpr', text: '立刻廣播 999 全院急救、開始胸部按壓 CPR 並準備去顫電擊！', grade: 'best', min: 0, cpr: true },
        { id: 'wait', text: '再推一支利尿劑看能不能把水排出來', grade: 'bad', min: 2,
          death: '心跳已經停止，藥物無法在體內循環，必須立即胸外按壓與電擊！' }
      ]
    },
    rosc: {
      ask: '持續 CPR 與去顫電擊後，黃伯伯恢復脈搏 (ROSC)，心電圖恢復竇性心律，下一步？',
      options: [
        { id: 'icu', text: '緊急氣管內管插管保護呼吸道，立刻轉入 CCU 全力搶救', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '插管完成接上呼吸器，病患安全轉入心臟加護病房。' }
      ]
    }
  },
  warn: { state: 'shock', line: '怡君：「醫師！黃伯伯發紺越來越嚴重，血壓開始往下掉了！」', log: '黃伯伯肺泡完全淹水，進入呼吸衰竭休克。' },
  arrestLine: '怡君：「醫師！黃伯伯沒有呼吸了！摸不到頸動脈！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '高畫質心肺復甦與去顫電擊後：「醫師！摸得到脈搏了！心跳回來了！」',
  card: {
    title: '急性失代償性心衰竭肺水腫 (ADHF)：Pocket Medicine 處置精要',
    points: [
      '端坐呼吸 + 咳粉紅色泡沫痰 + 雙肺廣泛濕囉音是心因性肺水腫三大危險信號。',
      '非侵襲性陽壓呼吸 (BiPAP/CPAP) 是打開肺泡、減少回心血量 Preload、爭取時間的第一救命利器。',
      '靜脈 Loop 利尿劑 (IV Furosemide) 加上血管擴張劑 (IV NTG，血壓 >110 時) 是迅速降肺水腫的標準二聯療法。',
      '致命錯誤：急性失代償期嚴禁啟動或加量 Beta-blocker；若血壓掉入休克，禁用降壓劑改用心肌收縮增強劑 (Inotropes)。'
    ]
  }
};

// Pocket Medicine 9th 臨床案例 7: 急性大塊肺栓塞 / Massive Pulmonary Embolism (Pulmonary & Critical Care)
export const PE = {
  id: 'ppe', bed: '04B', nurse: '小雯', name: '張先生', who: '張先生 · 58 歲 · 骨科術後臥床第 4 天',
  short: '下床如廁突發嚴重喘促、胸痛、SpO2 狂掉', late: 'arrest', extra: 'rr',
  results: {
    stable: '張先生緊急給予抗凝血治療並照會胸腔重症團隊，血氧回升，轉入 ICU 密切監控',
    icu: '張先生因次大塊肺栓塞併右心過負荷，已轉入重症加護病房 (ICU)'
  },
  labs: {
    rows: [
      ['D-Dimer（血栓溶解產物）', '8,450', 'ng/mL', '<500', 'H'],
      ['Troponin I', '0.28', 'ng/mL', '<0.04', 'H'],
      ['動脈血 PaO2', '52', 'mmHg', '80–100', 'L'],
      ['動脈血 PaCO2', '28', 'mmHg', '35–45', 'L']
    ],
    note: 'Pocket Medicine 指引：術後臥床病人突發肋膜性胸痛、低血氧伴隨呼吸性鹼中毒 (低 PaCO2)，需高度懷疑急性肺栓塞 (PE)。心電圖常現竇性心搏過速或 S1Q3T3。大塊 PE（伴隨低血壓休克）需緊急評估血栓溶解 (tPA) 或介入取栓；次大塊/常規 PE 應立即啟動治療劑量抗凝血劑 (UFH/LMWH)！'
  },
  call: '醫師！{bed} 骨科開刀的張先生剛下床突然喘不過氣，胸口很痛，臉色慘白！',
  again: '醫師！{bed} 的張先生血氧掉到 80%，量不到血壓了！你快來！',
  phone: '給予高流量氧氣，不要讓他再走動，我立刻到床邊！',
  callWhy: '手術臥床病人突發急喘與胸痛，是急性致死性肺栓塞 (PE) 的極高危表現，幾分鐘內可因急性右心衰竭心跳停止，必須立即趕赴現場！',
  intro: '醫師，04B 的張先生 58 歲，右側人工髖關節置換術後第 4 天。剛在護理師攙扶下如廁，突然胸口劇痛、大口喘氣，呼吸 34 次/分，血壓從 130 掉到 92/56 mmHg。',
  introLate: '醫師！張先生整個人癱在輪椅上，呼吸極度困難，SpO2 剩下 82%！',
  states: {
    start: { hr: 124, bp: [94, 58], spo2: 83, rr: '34 次/分，急促呼吸困難', mind: '清醒，躁動發紺' },
    o2Done: { hr: 116, bp: [96, 60], spo2: 91, rr: '28 次/分，面罩給氧中', mind: '清醒，仍感劇烈胸痛' },
    treated: { hr: 92, bp: [118, 72], spo2: 96, rr: '20 次/分，呼吸平穩', mind: '安靜，發紺消退' },
    shock: { hr: 140, bp: [68, 38], spo2: 74, rr: '40 次/分，瀕臨竭力', mind: '意識不清、四肢濕冷、阻塞性休克' },
    arrest: { hr: 0, bp: null, spo2: null, rr: '呼吸停止', mind: '意識喪失、無脈搏 (PEA)' },
    rosc: { hr: 106, bp: [92, 54], spo2: 92, rr: '呼吸器輔助', mind: '昏迷，脈搏恢復' }
  },
  steps: {
    first: {
      ask: '張先生術後下床突然劇烈胸痛、呼吸急促 34 次/分，SpO2 掉到 83%。你床邊第一步？',
      askWarn: '張先生發紺窒息、血壓掉至 70 邊緣，你第一步做什麼？',
      options: [
        { id: 'o2_heparin', text: '高流量非再吸入面罩給氧 + 立即靜脈給予抗凝血劑 Heparin 負荷劑量', grade: 'best', min: 5, state: 'o2Done', next: 'confirm',
          say: '小雯立即扣上面罩氧氣並推注 Heparin，血氧回升至 91%，胸痛稍微穩定。' },
        { id: 'fluid_load', text: '血壓偏低，立刻快速灌注 2000 mL 生理食鹽水', grade: 'bad', min: 10, state: 'shock', next: 'arrest',
          why: '急性大塊 PE 右心室已嚴重擴大衰竭，快速大量灌水會使室中隔左偏壓迫左心室，導致心跳停止。' },
        { id: 'pain_shot', text: '給予 Demerol 50mg 肌肉注射止痛，回床上臥床觀察', grade: 'bad', min: 15, state: 'shock', next: 'arrest',
          why: '止痛劑無法溶解血栓，忽略抗凝血會導致肺栓塞進行性加重致死。' },
        { id: 'wait_ct', text: '堅持先推下樓做完胸部電腦斷層血管攝影 (CTA) 再給藥', grade: 'bad', min: 30, state: 'shock', next: 'arrest',
          why: '高度懷疑 PE 且血氧掉落時應立即啟動抗凝，若先送 CT 室在路途極易發生心因猝死。' }
      ]
    },
    confirm: {
      ask: '氧氣與 Heparin 上線後 SpO2 回升，EKG 呈現 S1Q3T3 與竇性心搏過速。下一步處置？',
      options: [
        { id: 'icu_cta', text: '急照會胸腔重症科收住 ICU 監護，並在加護團隊護送下完成急診 CTA', grade: 'best', min: 15, state: 'treated', next: 'done', outcome: 'icu',
          say: '胸腔重症醫師接手完成 CTA 證實雙側肺動脈鞍狀血栓，於 ICU 持續抗凝並評估導管溶栓。' },
        { id: 'ward_stay', text: '既然打了 Heparin 狀況較穩，留在一般病房繼續常規觀察', grade: 'ok', min: 10, state: 'treated', next: 'done', outcome: 'stable',
          why: '大塊/次大塊肺栓塞在發病前 24 小時猝死風險高，轉加護病房是最安全的標準。' }
      ]
    },
    arrest: {
      ask: '張先生突然意識喪失、心電圖呈無脈搏電氣活動 (PEA)！',
      options: [
        { id: 'cpr', text: '立刻廣播急救、開始高品質 CPR 並給予 Epinephrine 與考慮 tPA 溶栓！', grade: 'best', min: 0, cpr: true },
        { id: 'wait', text: '再推 500 mL 點滴看血壓會不會上來', grade: 'bad', min: 2,
          death: '心跳已經停止，必須立刻胸外按壓建立人工血流！' }
      ]
    },
    rosc: {
      ask: '持續 CPR 與急救用藥後，張先生摸到股動脈脈搏 (ROSC)，下一步？',
      options: [
        { id: 'icu', text: '插管建立呼吸道，緊急推入加護病房進行進階血栓重症介入', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '加護病房接手呼吸器與後續體外循環/溶栓治療。' }
      ]
    }
  },
  warn: { state: 'shock', line: '小雯：「醫師！張先生頸靜脈怒張，血壓掉到量不出來了！」', log: '張先生急性右心衰竭，進入阻塞性休克。' },
  arrestLine: '小雯：「醫師！張先生無脈搏了！摸不到股動脈！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: 'CPR 與急救給藥後：「醫師！股動脈脈搏恢復了！」',
  card: {
    title: '急性肺栓塞 (Pulmonary Embolism)：Pocket Medicine 處置精要',
    points: [
      '高危因子（術後、臥床、腫瘤、避孕藥）+ 突發急喘與胸痛 + 低血氧即應高度懷疑 PE。',
      '無禁忌下應立即啟動治療劑量抗凝血劑 (UFH/LMWH)，切勿因等待影像確診而延遲抗凝。',
      '大塊肺栓塞 (Massive PE, 血壓持續 < 90 mmHg) 具極高猝死率，首選全身性溶栓 (IV tPA) 或導管取栓。',
      '避免大量輸液：急性右心過負荷時灌注大量水分會使心室中隔左壓，使左心排血量更低致死。'
    ]
  }
};

// Pocket Medicine 9th 臨床案例 8: 嗜中性白血球低下發燒 / Febrile Neutropenia (Hematology-Oncology)
export const NEUTRO = {
  id: 'pneutro', bed: '06B', nurse: '佳穎', name: '郭小姐', who: '郭小姐 · 48 歲 · 乳癌化療後第 9 天',
  short: '深夜突發寒顫高燒 39.4°C、心跳 128、極度疲憊', late: 'arrest', extra: 'temp',
  results: {
    stable: '郭小姐在 1 小時內抽血培養並完成廣效抗綠膿桿菌抗生素輸注，寒顫消退，感染獲得控制',
    icu: '郭小姐因嗜中性低下併發敗血性休克，已收治腫瘤重症加護病房 (ICU)'
  },
  labs: {
    rows: [
      ['白血球 WBC', '0.6', '10^3/uL', '4.0–11.0', 'L'],
      ['嗜中性球絕對值 (ANC)', '110', '/uL', '1500–7500', 'L'],
      ['血小板 Platelet', '68', '10^3/uL', '150–400', 'L'],
      ['C-反應蛋白 CRP', '168', 'mg/L', '<5', 'H']
    ],
    note: 'Pocket Medicine 指引：腫瘤化療後 ANC < 500/uL 且單次口溫 >=38.3°C，即為嗜中性低下發燒 (Febrile Neutropenia)。屬於腫瘤科急症！黃金法則：抽取 2 套血液培養後，必須在 1 小時內給予抗綠膿桿菌廣效抗生素（如 Cefepime 2g IV 或 Tazocin 4.5g IV），延遲每一小時死亡率皆顯著上升！嚴禁肛門指診與量肛溫！'
  },
  call: '醫師！{bed} 乳癌化療的郭小姐突然發高燒到 39.4 度，整個人狂抖寒顫！',
  again: '醫師！{bed} 的郭小姐血壓掉到 80/45，意識開始模糊了！',
  phone: '立即抽血培養，給她蓋保暖被，我 5 分鐘內到床邊！',
  callWhy: '化療後嗜中性白血球幾近於零，缺乏免疫防線，發燒是致死性菌血症的唯一警訊，1 小時內不打抗生素可迅速演變為致命敗血性休克。',
  intro: '醫師，06B 的郭小姐 48 歲，乳癌第 3 期接受化療第 9 天。剛剛深夜突然嚴重畏寒發抖，體溫飆到 39.4°C，心跳 128 bpm，血壓 98/58 mmHg。',
  introLate: '醫師！郭小姐已經燒到說胡話，嘴唇乾裂、四肢冰冷發抖！',
  states: {
    start: { hr: 128, bp: [96, 58], spo2: 95, temp: '39.4°C，嚴重畏寒寒顫', mind: '清醒但極度虛弱疲倦' },
    cultDone: { hr: 120, bp: [98, 60], spo2: 96, temp: '39.2°C，血液培養已送', mind: '清醒，仍全身畏寒' },
    treated: { hr: 88, bp: [116, 70], spo2: 98, temp: '37.8°C，抗生素輸注中', mind: '清醒，精神顯著好轉' },
    shock: { hr: 142, bp: [72, 40], spo2: 88, temp: '40.1°C，嗜睡發紺', mind: '嗜睡、四肢冰冷、格蘭氏陰性敗血休克' },
    arrest: { hr: 0, bp: null, spo2: null, temp: '39.8°C', mind: '意識喪失、心搏停止' },
    rosc: { hr: 114, bp: [90, 52], spo2: 92, temp: '38.6°C', mind: '昏迷，脈搏恢復' }
  },
  steps: {
    first: {
      ask: '郭小姐化療後第 9 天突發高燒 39.4°C，畏寒寒顫，心跳 128。你床邊第一步怎麼處理？',
      askWarn: '郭小姐四肢冰冷、血壓急降至 80 邊緣，你第一步怎麼做？',
      options: [
        { id: 'bundle', text: '抽 2 套血液培養 + 1 小時內靜脈給予抗綠膿桿菌抗生素 Cefepime 2g + 輸液 1000mL', grade: 'best', min: 10, state: 'treated', next: 'monitor',
          say: '佳穎迅速完成雙套抽血培養並掛上 Cefepime 靜脈輸注，補足輸液後血壓回升至 116/70，寒顫消退！' },
        { id: 'panadol', text: '給予普拿疼退燒藥口服，先讓病人好好睡覺', grade: 'bad', min: 20, state: 'shock', next: 'arrest',
          why: '普拿疼僅能暫時遮蔽發燒，嗜中性低下未即刻給予抗生素會使綠膿桿菌菌血症在數小時內致命。' },
        { id: 'rectal', text: '安排肛門指診並塞退燒栓劑', grade: 'bad', min: 10, state: 'shock', next: 'arrest',
          why: '嗜中性低下病患嚴禁進行任何直腸操作或塞劑，極易破壞直腸黏膜引起致命性直腸周圍菌血症。' },
        { id: 'wait_lab', text: '堅持等明日白天的血液培養報告出來再開立抗生素', grade: 'bad', min: 60, state: 'shock', next: 'arrest',
          why: '嗜中性低下發燒每延遲抗生素 1 小時死亡率大幅攀升，必須在 1 小時內經驗性投予抗綠膿桿菌藥物。' }
      ]
    },
    monitor: {
      ask: '抗生素輸注後寒顫平息，體溫微降至 37.8°C，血壓 116/70 mmHg。後續處置？',
      options: [
        { id: 'icu', text: '若有任何休克跡象立即轉入加護病房，常規收治腫瘤病房嚴密監測 I/O 與感染源', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '安排每 2 小時密集測量生命徵象，明日追蹤白血球血球計數與抗生素療效。' },
        { id: 'icu_direct', text: '鑑於重症風險極高，直接轉入加護病房 (ICU) 連續監視', grade: 'ok', min: 20, next: 'done', outcome: 'icu',
          why: '嗜中性低下病患在抗生素穩定後若生命徵象平穩可在專科病房密切觀察，轉 ICU 亦為審慎之舉。' }
      ]
    },
    arrest: {
      ask: '郭小姐突然心跳停止，心電圖呈心室纖維顫動！',
      options: [
        { id: 'cpr', text: '立刻廣播急救、進行胸外心臟按壓 CPR 並準備去顫電擊！', grade: 'best', min: 0, cpr: true },
        { id: 'wait', text: '再推一劑退燒藥看會不會退燒', grade: 'bad', min: 2,
          death: '心跳已經停止，必須立刻胸部按壓與去顫搶救！' }
      ]
    },
    rosc: {
      ask: '持續 CPR 與去顫後恢復自主循環 (ROSC)，心跳恢復竇性，下一步？',
      options: [
        { id: 'icu', text: '緊急插管保護氣道，轉入加護病房進行進階重症器官支持', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '腫瘤加護病房接手重症抗休克治療。' }
      ]
    }
  },
  warn: { state: 'shock', line: '佳穎：「醫師！郭小姐血壓崩到 72！四肢全是發紺斑紋！」', log: '郭小姐陷入革蘭氏陰性敗血性休克。' },
  arrestLine: '佳穎：「醫師！郭小姐無脈搏了！心跳停了！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '經過全力 CPR 與急救用藥後：「醫師！脈搏摸到了！心跳回來了！」',
  card: {
    title: '嗜中性低下發燒 (Febrile Neutropenia)：Pocket Medicine 處置精要',
    points: [
      '定義：ANC < 500/uL 且單次口溫 >= 38.3°C，是腫瘤科第一急症。',
      '黃金 1 小時抗生素 (Door-to-Antibiotic < 60 min)：第一線經驗性單一治療首選抗綠膿桿菌 Beta-lactam（Cefepime 2g 或 Pip-Tazo 4.5g IV）。',
      '血液培養：必須在抗生素前抽取兩套（Port-A 與周邊各一套），但不可等報告才投藥。',
      '三大禁忌：嚴禁量肛溫、嚴禁肛門指診、嚴禁直腸塞劑，避免黏膜破壞造成致命菌血症。'
    ]
  }
};

// Pocket Medicine 9th 臨床案例 9: 嚴重過敏性休克 / Anaphylaxis & Anaphylactic Shock (Rheumatology & Immunology)
export const ANAPH = {
  id: 'panaph', bed: '07B', nurse: '小雯', name: '蔡小姐', who: '蔡小姐 · 36 歲 · 紅斑性狼瘡 (SLE) 病史',
  short: '靜脈抗生素剛掛上 5 分鐘突發喉頭水腫、喘鳴、休克', late: 'arrest', extra: 'skin',
  results: {
    stable: '蔡小姐即刻肌肉注射 Epinephrine 並給予輸液，喉頭水腫迅速消退，呼吸順暢，生命徵象穩定',
    icu: '蔡小姐因嚴重過敏性休克呼吸道水腫，已轉入加護病房密切觀察 24 小時'
  },
  labs: {
    rows: [
      ['血清類胰蛋白酶 (Tryptase)', '48', 'ug/L', '<11.4', 'H'],
      ['嗜酸性球 Eosinophil', '450', '/uL', '50–500'],
      ['血紅素 Hb', '11.8', 'g/dL', '12–16'],
      ['動脈血 PaO2', '56', 'mmHg', '80–100', 'L']
    ],
    note: 'Pocket Medicine 指引：接觸致敏原後數分鐘內出現皮膚風疹塊 (Urticaria) 伴隨呼吸道阻塞 (Stridor/Wheezing) 或低血壓，即診斷 Anaphylaxis。第一線救命首選藥物唯一是肌肉注射 IM Epinephrine (1:1000) 0.3–0.5 mg 於大腿前外側！靜脈抗組織胺與類固醇只是二線輔助，絕對不可取代 Epinephrine！延遲注射 Epinephrine 是過敏性休克死亡的最主因！'
  },
  call: '醫師！{bed} 的蔡小姐剛打抗生素幾分鐘，突然呼吸喘鳴、全身起紅疹抓狂！',
  again: '醫師！{bed} 的蔡小姐已經吸不到氣，嘴唇發紫、血壓量不到了！',
  phone: '立刻停掉點滴！我拿著 Epinephrine 衝過去！',
  callWhy: '致死性過敏性休克 (Anaphylaxis) 進展以秒計算，喉頭水腫在數分鐘內會完全封閉呼吸道窒息，必須以最快速度到場給予腎上腺素！',
  intro: '醫師，07B 的蔡小姐 36 歲，因狼瘡腎炎合併肺炎住院。剛剛夜班更換第二劑 Ampicillin-Sulbactam 靜脈滴注不到 5 分鐘，突然喉嚨像被掐住、吸氣出現尖銳喘鳴聲 (Stridor)，全身冒出大片風疹塊，血壓從 115 驟降至 74/42 mmHg！',
  introLate: '醫師！蔡小姐雙手掐著脖子，嘴唇完全發黑，整個人快窒息倒下！',
  states: {
    start: { hr: 132, bp: [72, 42], spo2: 82, skin: '全身廣泛紅色風疹塊，吸氣性喉頭喘鳴 (Stridor)', mind: '清醒，極度窒息驚恐' },
    epiDone: { hr: 118, bp: [102, 64], spo2: 94, skin: '喉頭喘鳴音減退，風疹塊稍微收斂', mind: '清醒，呼吸道逐漸通暢' },
    treated: { hr: 90, bp: [118, 74], spo2: 98, skin: '疹塊大幅消退，呼吸順暢無雜音', mind: '平穩，脫離窒息危險' },
    shock: { hr: 150, bp: [56, 30], spo2: 68, skin: '發紺，呼吸道完全緊閉', mind: '昏迷、窒息、無脈搏性心跳' },
    arrest: { hr: 0, bp: null, spo2: null, skin: '全身青紫', mind: '呼吸心跳停止' },
    rosc: { hr: 112, bp: [94, 56], spo2: 93, skin: '插管建立人工氣道', mind: '昏迷，脈搏恢復' }
  },
  steps: {
    first: {
      ask: '蔡小姐打抗生素後突發喉頭喘鳴水腫、全身大片風疹塊、血壓掉至 72/42 mmHg。你床邊第一處置？',
      askWarn: '蔡小姐喉部即將完全緊閉窒息，血壓跌破 60，你第一處置做什麼？',
      options: [
        { id: 'im_epi', text: '立刻停掉點滴 + 立即大腿前外側肌肉注射 Epinephrine 0.3mg + 大量生理食鹽水 1000mL 快滴', grade: 'best', min: 2, state: 'epiDone', next: 'adjunct',
          say: '小雯立即在大腿前外側快速扎下 Epinephrine 0.3mg 並灌注輸液，數分鐘內喉頭喘鳴聲銳減，血壓回升至 102/64 mmHg！' },
        { id: 'antihistamine', text: '給予靜脈抗組織胺 Diphenhydramine 30mg 靜脈注射', grade: 'bad', min: 10, state: 'shock', next: 'arrest',
          why: '抗組織胺起效慢，且無法翻轉廣泛血管擴張與解除喉頭水腫，延遲使用 Epinephrine 是致死主因。' },
        { id: 'steroid', text: '給予 Solu-Medrol 125mg 靜脈注射並等其吸收消腫', grade: 'bad', min: 20, state: 'shock', next: 'arrest',
          why: '靜脈類固醇需要 4–6 小時才能產生抗發炎基因調控，無法搶救數分鐘內的急性窒息休克。' },
        { id: 'salbutamol', text: '僅給予氣霧吸入支氣管擴張劑 (Albuterol) 觀察', grade: 'bad', min: 8, state: 'shock', next: 'arrest',
          why: '吸入劑只對下呼吸道痙攣有效，對上呼吸道喉頭水腫和循環低血壓完全無效。' }
      ]
    },
    adjunct: {
      ask: 'Epinephrine 注射後喘鳴緩解，SpO2 回升至 94%，血壓 102/64 mmHg。下一步處置？',
      options: [
        { id: 'second_line', text: '補上二線輔助藥物（H1/H2 抑制劑 + 類固醇預防雙相反應）並安排加護病房監護 24 小時', grade: 'best', min: 15, state: 'treated', next: 'done', outcome: 'icu',
          say: '完成二線藥物輔助，並安排轉入加護病房以防範晚期雙相過敏反彈反應。' },
        { id: 'done_ward', text: '既然水腫已消退，留在一般病房繼續常規觀察即可', grade: 'ok', min: 10, state: 'treated', next: 'done', outcome: 'stable',
          why: '嚴重過敏性休克高達 20% 會在 8–10 小時內發生致死性雙相反應 (Biphasic reaction)，需高度警戒。' }
      ]
    },
    arrest: {
      ask: '蔡小姐突然窒息停止心跳，心電圖呈心室纖維顫動！',
      options: [
        { id: 'cpr', text: '立刻廣播急救、開始胸外心臟按壓 CPR 並準備去顫電擊！', grade: 'best', min: 0, cpr: true },
        { id: 'wait', text: '再給予抗組織胺注射', grade: 'bad', min: 2,
          death: '心跳已經停止，必須立刻心外按壓恢復人工循環！' }
      ]
    },
    rosc: {
      ask: '經過高品質 CPR 與電擊後蔡小姐恢復脈搏 (ROSC)，下一步？',
      options: [
        { id: 'icu', text: '緊急氣管內管插管保護呼吸道，轉入加護病房全力抗休克治療', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '插管完成接上呼吸器，病患安全轉送加護病房。' }
      ]
    }
  },
  warn: { state: 'shock', line: '小雯：「醫師！蔡小姐呼吸道快完全封閉了！摸不到脈搏了！」', log: '蔡小姐喉頭嚴重水腫，進入窒息性休克。' },
  arrestLine: '小雯：「醫師！蔡小姐沒有呼吸心跳了！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '經過 CPR 急救與去顫電擊後：「醫師！脈搏摸到了！心跳恢復了！」',
  card: {
    title: '過敏性休克 (Anaphylaxis)：Pocket Medicine 處置精要',
    points: [
      '診斷標準：接觸可疑抗原後數分鐘至數小時內，出現皮膚黏膜症狀（蕁麻疹、水腫）合併呼吸道受阻（喘鳴、哮喘）或血壓下降。',
      '第一首選救命藥物：唯一是肌肉注射 IM Epinephrine (1:1000) 0.3–0.5 mg 於大腿前外側 (Vastus lateralis)，吸收最快，必要時每 5–15 分鐘重複。',
      '切忌致命延誤：抗組織胺與類固醇皆無法立即解除喉頭水腫與升壓，切不可因施打二線藥物而延遲 Epinephrine！',
      '雙相反應警戒 (Biphasic Reaction)：初期緩解後仍有高達 20% 患者可能在 8–10 小時內再次發作，嚴重過敏者應留院或進 ICU 觀察。'
    ]
  }
};

// 完整 10 床急性病房病人名冊 (涵蓋 Pocket Medicine 9th 各大核心專科)
export const PUBLIC_CASES = [HYPO, STROKE, ACS, ADHF, HYPERK, GIB, PE, SEPSIS, NEUTRO, ANAPH];

// 內科專科病房分支 (依據 Pocket Medicine 各大章節架構分類)
export const SPECIALTY_WARDS = [
  {
    id: 'mixed',
    name: '綜合病房（值大段：病人龍蛇混雜）',
    shortName: '綜合病房',
    chapter: 'General Internal Medicine',
    desc: '全層各專科床位交叉覆蓋，急症隨機出現，考驗跨領域綜合值班應變能力。',
    decoys: [
      { who: '伯伯', age: [70, 86], dx: '腦中風復健中', lay: '今天血壓有點高，有開需要時吃的藥，晚上照常。' },
      { who: '先生', age: [42, 64], dx: '蜂窩性組織炎', lay: '打抗生素第三天，已經退燒，紅腫有消。' },
      { who: '女士', age: [30, 50], dx: '急性腸胃炎', lay: '今天開始吃粥，點滴明天可以停。' },
    ],
    primaryCaseIds: []
  },
  {
    id: 'cv',
    name: '心臟內科病房 (Cardiology)',
    shortName: '心臟內科',
    chapter: 'Pocket Medicine: CARDIOLOGY',
    desc: '冠狀動脈疾病、急性心肌梗塞 (STEMI/NSTEMI)、失代償心衰竭肺水腫、致死心律不整。',
    decoys: [
      { who: '阿伯', age: [68, 80], dx: '心衰竭 (HFrEF)', lay: '打 Lasix 第二天，尿量有出來，體重降了 1.2 公斤，晚上續追 I/O。' },
      { who: '先生', age: [55, 65], dx: '心導管術後觀察', lay: '下午由右側橈動脈做完導管放支架，穿刺部位無血腫，橈動脈搏動好。' },
      { who: '女士', age: [72, 85], dx: '心房顫動 (Af with RVR)', lay: '下午已給予口服 Diltiazem，目前靜息心跳維持在 75–85 bpm。' },
    ],
    primaryCaseIds: ['pacs', 'padhf']
  },
  {
    id: 'pulm',
    name: '胸腔暨重症加護病房 (Pulmonary & Critical Care)',
    shortName: '胸腔重症',
    chapter: 'Pocket Medicine: PULMONARY & CRITICAL CARE',
    desc: '急性肺栓塞 (PE)、急性呼吸窘迫 (ARDS)、COPD 急性發作、休克與加護監測。',
    decoys: [
      { who: '阿伯', age: [72, 84], dx: 'COPD 急性惡化', lay: '使用 BiPAP 呼吸支持中，痰量多，白天有做化痰抽吸，動脈血氣二氧化碳稍降。' },
      { who: '先生', age: [48, 62], dx: '社區型重症肺炎', lay: '打 Ceftriaxone + Azithromycin 第四天，氧氣鼻導管 2L 維持 SpO2 96%。' },
      { who: '阿嬤', age: [75, 88], dx: '肋膜積水 (Pleural Effusion)', lay: '下午已做胸管引流 500 mL 淡黃色液體，追蹤 CXR 肺部已局部復張。' },
    ],
    primaryCaseIds: ['ppe', 'psepsis']
  },
  {
    id: 'gi',
    name: '胃腸肝膽科病房 (Gastroenterology & Hepatology)',
    shortName: '胃腸肝膽',
    chapter: 'Pocket Medicine: GASTROENTEROLOGY',
    desc: '急性上消化道大出血 (UGIB/靜脈曲張)、急性胰臟炎、肝硬化併發症、自發性腹膜炎 (SBP)。',
    decoys: [
      { who: '先生', age: [45, 60], dx: '酒精性急性胰臟炎', lay: '嚴格禁食 (NPO) 積極輸液中，腹痛指數由 8 分降至 3 分，自覺想喝水。' },
      { who: '阿伯', age: [65, 78], dx: 'B肝肝硬化併腹水', lay: '白天已由超音波定位引流腹水 2000 mL 並補充 Albumin，尿量穩定。' },
      { who: '女士', age: [52, 68], dx: '膽管結石併膽管炎', lay: '已排定明天早上行 ERCP 取石，今晚午夜起 NPO，已打上維持點滴。' },
    ],
    primaryCaseIds: ['pgib']
  },
  {
    id: 'nephro',
    name: '腎臟內科病房 (Nephrology)',
    shortName: '腎臟內科',
    chapter: 'Pocket Medicine: NEPHROLOGY',
    desc: '致命性高血鉀 (Hyperkalemia)、代謝性酸中毒、尿毒急症、急性腎損傷 (AKI)。',
    decoys: [
      { who: '阿嬤', age: [70, 82], dx: '末期腎病規律血液透析', lay: '洗腎陸續出現腿部抽筋，已調整乾體重，左手臂動靜脈瘻管震顫 (Thrill) 良好。' },
      { who: '先生', age: [58, 70], dx: '急性腎損傷 (AKI stage 2)', lay: '脫水誘發，輸液水分補充後今天尿量已達 1600 mL，明天追蹤腎功能。' },
      { who: '女士', age: [62, 75], dx: '慢性低血鈉 (Na 124)', lay: '目前限制每日水分 1000 mL，病人無頭痛噁心，神經學檢查清楚。' },
    ],
    primaryCaseIds: ['phyperk']
  },
  {
    id: 'inf',
    name: '感染科病房 (Infectious Diseases)',
    shortName: '感染科',
    chapter: 'Pocket Medicine: INFECTIOUS DISEASES',
    desc: '嚴重敗血性休克 (Septic Shock)、菌血症、導管感染、發燒症候群。',
    decoys: [
      { who: '阿公', age: [78, 90], dx: '急性腎盂腎炎', lay: '靜脈抗生素第三天，今天體溫皆在 37 度以下，解尿灼熱刺痛感明顯減輕。' },
      { who: '小姐', age: [32, 46], dx: '右下肢蜂窩性組織炎', lay: '紅腫範圍已有奇異筆標記，目前無擴散趨勢，皮溫偏溫，局部稍痛。' },
      { who: '先生', age: [50, 65], dx: '不明熱 (FUO) 評估中', lay: '已送檢自體免疫抗體與三套血液培養，若晚上體溫破 38.5 度請幫抽血培養。' },
    ],
    primaryCaseIds: ['psepsis', 'pneutro']
  },
  {
    id: 'hem_onc',
    name: '血液腫瘤科病房 (Hematology & Oncology)',
    shortName: '血液腫瘤',
    chapter: 'Pocket Medicine: HEMATOLOGY-ONCOLOGY',
    desc: '嗜中性低下發燒 (Febrile Neutropenia)、急性輸血反應、高血鈣危象、腫瘤溶解症候群。',
    decoys: [
      { who: '女士', age: [44, 56], dx: '淋巴瘤化療後第 4 天', lay: '有開止吐藥 Ondansetron，今天胃口稍差但可進食流質，無發燒。' },
      { who: '先生', age: [60, 74], dx: '多發性骨髓瘤', lay: '骨痛症狀在止痛藥控制下改善，水份補充每日 2500 mL 預防高血鈣。' },
      { who: '小姐', age: [35, 48], dx: '急性白血病誘導化療中', lay: '目前血小板 22,000，無明顯黏膜或皮下紫斑出血，已預備明天血小板。' },
    ],
    primaryCaseIds: ['pneutro']
  },
  {
    id: 'meta',
    name: '內分泌暨新陳代謝科病房 (Endocrinology & Metabolism)',
    shortName: '新陳代謝',
    chapter: 'Pocket Medicine: ENDOCRINOLOGY',
    desc: '致死性低血糖 (Severe Hypoglycemia)、高血糖急症 (DKA/HHS)、甲狀腺風暴、腎上腺危象。',
    decoys: [
      { who: '阿伯', age: [66, 78], dx: '第 2 型糖尿病血糖調控', lay: '晚餐前血糖 156，睡前已施打長效胰島素 14 單位，夜間如冒冷汗請驗血糖。' },
      { who: '女士', age: [35, 49], dx: '甲狀腺毒症 (Graves disease)', lay: '服藥治療中，心悸手抖症狀緩和，安靜心跳 78 bpm，血壓穩定。' },
      { who: '先生', age: [54, 68], dx: '骨質疏鬆合併副甲狀腺機能亢進', lay: '抽血鈣離子稍微偏高 10.8 mg/dL，大量飲水並追蹤離子鈣中。' },
    ],
    primaryCaseIds: ['phypo']
  },
  {
    id: 'neuro',
    name: '神經內科病房 (Neurology)',
    shortName: '神經內科',
    chapter: 'Pocket Medicine: NEUROLOGY',
    desc: '急性缺血性腦中風 (Acute Ischemic Stroke)、癲癇重積狀態、急性譫妄、戒酒性震顫譫妄。',
    decoys: [
      { who: '阿嬤', age: [72, 85], dx: '小中風 (TIA) 檢查中', lay: '右側肢體無力已完全恢復，目前服用抗血小板藥物，血壓維持在 135/82。' },
      { who: '先生', age: [50, 64], dx: '癲癇規律服藥觀察', lay: '入院至今無發作，抗癲癇藥物血中濃度追蹤中，床欄已裝防撞軟墊保護。' },
      { who: '阿公', age: [80, 92], dx: '巴金森氏症合併步態不穩', lay: '睡前防跌措施已確認，呼叫鈴已放手邊，夜間如要如廁需請家屬按鈴協助。' },
    ],
    primaryCaseIds: ['pstroke']
  },
  {
    id: 'rheum',
    name: '風濕免疫科病房 (Rheumatology & Immunology)',
    shortName: '風濕免疫',
    chapter: 'Pocket Medicine: RHEUMATOLOGY',
    desc: '過敏性休克 (Anaphylaxis)、紅斑性狼瘡危象、嚴重血管炎、痛風與化膿性關節炎。',
    decoys: [
      { who: '小姐', age: [28, 40], dx: '全身性紅斑性狼瘡 (SLE)', lay: '狼瘡腎炎進行脈衝類固醇治療中，血壓微幅升高至 138/86，無發燒水腫。' },
      { who: '阿伯', age: [56, 70], dx: '痛風性關節炎急性發作', lay: '右側大腳趾第一蹠趾關節紅腫痛，給予消炎止痛藥後疼痛降至 2 分。' },
      { who: '女士', age: [45, 60], dx: '類風濕性關節炎', lay: '住院評估轉換生物製劑，無感染症狀，關節晨僵時間縮短。' },
    ],
    primaryCaseIds: ['panaph']
  }
];

// Pocket Medicine 9th 臨床病例庫與學習重點總覽 (Study Guide & Clinical Pearls)
export const STUDY_GUIDE = [
  {
    id: 'pacs',
    specialtyId: 'cv',
    specialtyName: '心臟內科 (Cardiology)',
    chapter: 'Pocket Medicine: CARDIOLOGY (p. 21–29)',
    bed: '04A',
    name: '李伯伯',
    who: '李伯伯 · 65 歲 · 冠心病史',
    topic: '急性冠心症 · ST段抬高型心肌梗塞 (STEMI)',
    chiefComplaint: '深夜突發胸骨後壓迫性劇痛、冷汗直流，放射至下巴與左手臂',
    vitals: 'HR 104 bpm, BP 136/82 mmHg, SpO2 95%, EKG: V1–V4 ST 顯著抬高',
    pocketMedicineSummary: '心肌缺血 20 分鐘即開始發生不可逆壞死。任何疑似缺血性胸痛病患必須在抵達床邊 10 分鐘內取得 12 導程 EKG。STEMI 的診斷標準為相鄰導程 ST 段抬高（胸前導程 >=2mm，肢體導程 >=1mm）。時間就是心肌，儘早進行經皮冠狀動脈介入治療 (Primary PCI, 門機時間 < 90 min) 是降低死亡率與預防心衰竭的最關鍵處置。',
    mustDoPearls: [
      '床邊 10 分鐘內完成 12 導程 EKG，及早確診心肌缺血或 ST 抬高。',
      '立即嚼碎給予 Aspirin 300mg（不可吞服包衣錠，嚼碎吸收最快）。',
      '給予第二抗血小板藥物（P2Y12 抑制劑如 Ticagrelor 180mg 或 Clopidogrel 300–600mg）。',
      '舌下含服 NTG（血壓收縮壓 > 90 且非右心室/下壁梗塞）以緩解胸痛與降低後負荷。',
      '給予抗凝血劑（IV Heparin 負荷劑量）。',
      '立即照會心臟科值班醫師啟動心導管室 (Cath Lab / Code STEMI)，並安排轉 CCU。'
    ],
    pitfalls: [
      '致命陷阱：下壁梗塞 (II, III, aVF) 若合併右心室梗塞，給予 NTG 或利尿劑會造成回心血量暴跌與心因性休克！',
      '致命延誤：等心肌酵素 (Troponin) 抽血報告出來才啟動導管室——STEMI 診斷主要依據 EKG，絕不能因等抽血報告而延誤血管打通！',
      '誤當胃食道逆流或肌肉痛只給胃乳/止痛針，導致大片心肌梗塞心室顫動 (VF) 猝死。'
    ],
    labPearls: [
      'Troponin I / T：心肌壞死專一指標，發作後 3–6 小時上升，持續 7–14 天。',
      'CK-MB：在再梗塞 (Re-infarction) 時評估具臨床價值。',
      'EKG 演變：Hyperacute T 波 -> ST 段抬高 -> 病理性 Q 波出現 -> T 波倒置。'
    ]
  },
  {
    id: 'padhf',
    specialtyId: 'cv',
    specialtyName: '心臟內科 (Cardiology)',
    chapter: 'Pocket Medicine: CARDIOLOGY (p. 33–37)',
    bed: '08C',
    name: '黃伯伯',
    who: '黃伯伯 · 76 歲 · 缺血性心肌病史',
    topic: '急性失代償性心衰竭合併肺水腫 (ADHF & Pulmonary Edema)',
    chiefComplaint: '半夜嚴重端坐呼吸、狂咳粉紅泡沫痰、呼吸功顯著增加',
    vitals: 'HR 118 bpm, BP 192/106 mmHg, SpO2 84%, 雙肺廣泛濕囉音 (Crackles)',
    pocketMedicineSummary: '急性心衰竭肺水腫多為「Warm & Wet」（高血壓型充血），肺微血管楔壓 (PCWP) 急遽升高滲入肺泡。首要搶救是迅速降低 Preload 與 Afterload，並藉由陽壓通氣 (BiPAP) 將肺泡積水壓回微血管，爭取藥物利尿起效的時間。',
    mustDoPearls: [
      '維持病人坐姿，立即裝上非侵襲性陽壓呼吸 (BiPAP/CPAP) 打開肺泡並降低回心血量。',
      '立即靜脈注射 Loop 利尿劑 (IV Furosemide 40–80mg)。',
      '若收縮壓 > 110 mmHg，積極合併靜脈血管擴張劑 (IV NTG) 以迅速減輕後負荷。',
      '病況穩定後轉入心臟加護病房 (CCU) 連續監測尿量與電解質。'
    ],
    pitfalls: [
      '致命錯誤：讓急性肺水腫病患「平躺」休息，會急遽增加回心血量導致溺水窒息！',
      '致命用藥：急性失代償期嚴禁給予或調高 Beta-blocker（如 Propranolol），會引發心因性崩潰！',
      '誤當氣喘發作給予大量蒸氣吸入或大量點滴灌注，加劇水肺窒息。'
    ],
    labPearls: [
      'NT-proBNP：顯著升高 (>1000 pg/mL) 高度支持心因性肺水腫。',
      '動脈血氧分析 (ABG)：初期常現低血氧合併呼吸性鹼中毒，若進展至高碳酸 (PaCO2 > 50) 預示呼吸肌竭力，需立即氣管插管。'
    ]
  },
  {
    id: 'ppe',
    specialtyId: 'pulm',
    specialtyName: '胸腔暨重症加護 (Pulmonary & Critical Care)',
    chapter: 'Pocket Medicine: PULMONARY (p. 97–101)',
    bed: '04B',
    name: '張先生',
    who: '張先生 · 58 歲 · 骨科術後臥床第 4 天',
    topic: '急性大塊肺動脈血栓栓塞 (Acute Pulmonary Embolism)',
    chiefComplaint: '術後下床突發嚴重呼吸困難、肋膜性胸痛、冷汗與低血氧',
    vitals: 'HR 124 bpm, BP 94/58 mmHg, SpO2 83%, 呼吸 34 次/分, EKG 竇速伴 S1Q3T3',
    pocketMedicineSummary: '下肢深層靜脈血栓 (DVT) 脫落造成肺動脈主幹或分支急性阻塞，形成肺泡死腔增加與右心急性後負荷增加。血壓小於 90 mmHg 或需要升壓劑者定義為大塊肺栓塞 (Massive PE)，死亡率極高。臨床高度懷疑且無出血禁忌時，應立即啟動治療劑量抗凝血劑，不可因等待影像檢查而延遲治療！',
    mustDoPearls: [
      '高流量氧氣（面罩）支持，盡量減少病人活動。',
      '立即靜脈注射治療劑量抗凝血劑（IV Heparin 負荷劑量 80 U/kg 後連續滴注）。',
      '大塊肺栓塞致休克者，評估全身性血栓溶解 (Systemic Thrombolysis: tPA 100mg IV) 或緊急導管取栓。',
      '安排急診胸部電腦斷層血管攝影 (CTA) 或床邊心臟超音波評估右心負荷。'
    ],
    pitfalls: [
      '致命錯誤：右心過負荷休克時給予「大量輸液灌注」（如 2000 mL），會導致右心室極度擴張室中隔左壓，壓扁左心室引起心搏停止！',
      '致命延誤：堅持先推去 CT 檢查才開抗凝血劑——許多病患在推往放射科途中因右心衰竭猝死！'
    ],
    labPearls: [
      'D-Dimer：陰性排除價值高，但陽性需結合 Wells Score 進一步影像評估。',
      '動脈血氣：低氧血症 (PaO2 下降) 伴呼吸急促引發之低二氧化碳 (PaCO2 < 35 mmHg)。'
    ]
  },
  {
    id: 'psepsis',
    specialtyId: 'inf',
    specialtyName: '感染科暨重症加護 (Infectious Diseases)',
    chapter: 'Pocket Medicine: INFECTIOUS DISEASES & CRITICAL CARE',
    bed: '11B',
    name: '林奶奶',
    who: '林奶奶 · 83 歲 · 泌尿道感染住院',
    topic: '嚴重敗血性休克 (Septic Shock) · Hour-1 Bundle',
    chiefComplaint: '突發寒顫高燒 39.4°C、呼吸急促 28 bpm、血壓急降 74/42 mmHg、意識模糊',
    vitals: 'HR 134 bpm, BP 74/42 mmHg, SpO2 91%, 乳酸 Lactate 4.2 mmol/L',
    pocketMedicineSummary: '嚴重感染引發之全身性發炎反應與血管舒張，造成組織灌流不足與細胞代謝功能障礙。依據 Surviving Sepsis Campaign 指引，必須嚴格執行「黃金 1 小時集束處置 (Hour-1 Bundle)」：抽血培養、1 小時內廣效抗生素、輸液復甦 30 mL/kg、第一線升壓劑 Norepinephrine 維持 MAP >= 65 mmHg。',
    mustDoPearls: [
      '在投予抗生素前迅速抽取 2 套血液培養（Blood Cultures × 2）。',
      '1 小時內給予經驗性廣效抗生素（如 Piperacillin-tazobactam 4.5g 或 Cefepime 2g IV）。',
      '輸液復甦：首劑 30 mL/kg 等張晶體輸液 (Normal Saline 或 Ringer lactate) 快滴。',
      '若輸液後 MAP 仍 < 65 mmHg，立即建立中線或靜脈給予第一線升壓劑 Norepinephrine。',
      '每 2–4 小時追蹤血乳酸清除率 (Lactate clearance) 並轉入加護病房。'
    ],
    pitfalls: [
      '致命錯誤：將嚴重發燒休克當成一般感冒，只給退燒藥與冰枕觀察，延遲抗生素每 1 小時死亡率上升 7.6%！',
      '輸液不足：休克時不敢給足水分，導致腎臟灌流喪失引發急性腎衰竭與不可逆器官衰竭。'
    ],
    labPearls: [
      '血乳酸 (Lactate) > 2.0 mmol/L 代表組織缺氧灌流不足；> 4.0 mmol/L 死亡率急遽攀升。',
      '動脈平均壓 (MAP) 計算公式：(收縮壓 + 2×舒張壓) / 3，目標維持 >= 65 mmHg。'
    ]
  },
  {
    id: 'pgib',
    specialtyId: 'gi',
    specialtyName: '胃腸肝膽科 (Gastroenterology)',
    chapter: 'Pocket Medicine: GASTROENTEROLOGY (p. 119–123)',
    bed: '07A',
    name: '吳先生',
    who: '吳先生 · 54 歲 · 肝硬化病史',
    topic: '急性上消化道大出血 · 食道靜脈曲張破裂 (Acute Variceal UGIB)',
    chiefComplaint: '半夜突發大口嘔吐鮮血 800 mL、解大片黑色瀝青瀝青便、頭暈冷汗',
    vitals: 'HR 124 bpm, BP 82/48 mmHg, SpO2 93%, 意識嗜睡、結膜蒼白',
    pocketMedicineSummary: '肝硬化門脈高壓引發之食道或胃靜脈曲張破裂出血，起病極為兇險。救治關鍵在於維持呼吸道防止吸入、大口徑靜脈管路輸液復甦、限制性輸血（目標 Hb 7–8 g/dL，過度輸血會升高門脈壓引發再出血）、降低門脈壓藥物 (IV Somatostatin / Octreotide)、預防性抗生素 (Ceftriaxone) 與 12 小時內緊急內視鏡結紮 (EVL)。',
    mustDoPearls: [
      '暢通呼吸道防嘔血窒息，若大吐血伴意識障礙應提早氣管插管保護。',
      '立即建立 2 條大口徑靜脈管路 (16G/18G) 進行晶體輸液復甦。',
      '緊急備血 (Cross-match 4U pRBC) 並採取限制性輸血策略 (維持 Hb 7–8 g/dL)。',
      '立即給予靜脈降門脈壓藥物：Somatostatin 250 mcg IV bolus 後 250 mcg/h 連續滴注（或 Octreotide 50 mcg bolus + 50 mcg/h）。',
      '立即給予預防性抗生素（Ceftriaxone 1g IV q24h，降低菌血症與再出血率）。',
      '急照會消化內科值班醫師安排急診胃鏡 (EGD) 進行止血。'
    ],
    pitfalls: [
      '致命錯誤：看到貧血就拼命狂輸血把 Hb 灌到 10 以上！這會急遽升高門脈系統壓力，導致剛凝結的血管再次爆裂大出血！',
      '忽略預防性抗生素：肝硬化出血病患高達 50% 會併發菌血症與 SBP，給予 Ceftriaxone 可顯著降低死亡率。'
    ],
    labPearls: [
      'BUN / Cr 比值：上消化道出血時血液在腸道吸收，BUN 常不成比例升高 (BUN/Cr > 20–30)。',
      '血紅素 (Hb)：急性出血初期因血液濃縮，Hb 可能尚未及時下降，不可單憑初始數值低估出血量！'
    ]
  },
  {
    id: 'phyperk',
    specialtyId: 'nephro',
    specialtyName: '腎臟內科 (Nephrology)',
    chapter: 'Pocket Medicine: NEPHROLOGY (p. 172–175)',
    bed: '06A',
    name: '洪阿伯',
    who: '洪阿伯 · 71 歲 · 尿毒症透析病患',
    topic: '致命性重度高血鉀急症 (Severe Hyperkalemia, K 7.2 mmol/L)',
    chiefComplaint: '洗腎因故跳過兩次，夜間突發胸悶、全身四肢癱軟無力、心悸',
    vitals: 'HR 48 bpm, BP 98/56 mmHg, SpO2 96%, EKG: 高尖 T 波、P波消失、QRS 寬大',
    pocketMedicineSummary: '血鉀大於 6.5 mmol/L 或伴隨心電圖變化屬於致死性內科急症，隨時會進展為正弦波 (Sine wave)、心室顫動 (VF) 或心搏停止。急救口訣三部曲：1. 穩定心肌細胞膜（Calcium）；2. 促進鉀離子移入細胞內（Insulin + Glucose / 乙型受體促效劑）；3. 促進鉀離子排出體外（利尿劑 / 降鉀樹脂 / 緊急血液透析）。',
    mustDoPearls: [
      '第一優先（心肌穩定）：立即靜脈推注 10% Calcium gluconate 10–20 mL（或 Calcium chloride），可在 1–3 分鐘內穩定心肌膜電位防止致死心律不整。',
      '促進細胞內移：常規胰島素 Regular Insulin 10U + 50% 葡萄糖水 D50W 50 mL IV 推注（持續 4–6 小時）。',
      '輔助細胞內移：吸入型短效 Beta-2 促效劑（Albuterol 10–20 mg 氣霧吸入）。',
      '促進體外排出：口服或灌腸降鉀樹脂 (Kalimate / Lokelma)。',
      '立即照會腎臟科醫師啟動緊急血液透析（Emergent Hemodialysis, 最有效排除手段）。'
    ],
    pitfalls: [
      '致命錯誤：一看到高血鉀就只開降鉀樹脂 (Kalimate)，樹脂需數小時才起效，未給 Calcium 保護心肌會直接在等待中 VF 猝死！',
      '給予 RI 胰島素時忘記補充高濃度葡萄糖 (D50W)，導致病人併發嚴重低血糖昏迷。'
    ],
    labPearls: [
      'EKG 變化與血鉀濃度相關性：Peaked T wave (高尖T波, >5.5) -> PR 延長與 P 波消失 (>6.5) -> QRS 寬大 (>7.0) -> Sine wave 正弦波與 VF (>8.0)。'
    ]
  },
  {
    id: 'pneutro',
    specialtyId: 'hem_onc',
    specialtyName: '血液腫瘤科 (Hematology & Oncology)',
    chapter: 'Pocket Medicine: HEMATOLOGY-ONCOLOGY (p. 243–245)',
    bed: '06B',
    name: '郭小姐',
    who: '郭小姐 · 48 歲 · 乳癌化療後第 9 天',
    topic: '嗜中性白血球低下發燒 (Febrile Neutropenia, FN)',
    chiefComplaint: '深夜突發嚴重畏寒寒顫、體溫飆升至 39.4°C、心跳 128 bpm',
    vitals: 'HR 128 bpm, BP 96/58 mmHg, SpO2 95%, 體溫 39.4°C, ANC 110 /uL',
    pocketMedicineSummary: '化療後骨髓抑制使嗜中性球絕對值 (ANC) 降至 500 /uL 以下，失去正常吞噬防禦能力。一旦發燒即代表潛在致死性菌血症。黃金法則為「門到抗生素小於 60 分鐘 (Door-to-Antibiotic < 1h)」，必須在抽完血培養後立即經驗性投予抗綠膿桿菌廣效抗生素。嚴禁任何直腸操作！',
    mustDoPearls: [
      '立即抽取 2 套血液培養（若有人工血管 Port-A，一套抽人工血管、一套抽周邊血管）。',
      '1 小時內立即靜脈投予抗綠膿桿菌 Beta-lactam 抗生素（Cefepime 2g IV 或 Piperacillin-tazobactam 4.5g IV）。',
      '評估 Vancomycin 時機：血行動力學不穩 (休克)、導管感染嫌疑、嚴重黏膜炎或已知 MRSA。',
      '給予等張晶體輸液補充發燒與血管擴張流失之體液。'
    ],
    pitfalls: [
      '致命禁忌：嚴禁量肛溫、嚴禁肛門指診、嚴禁直腸塞劑退燒！嗜中性低下者極易因黏膜破損引發致死性直腸周圍膿瘍與菌血症！',
      '致命延誤：堅持等明日血液培養報告確認菌種才開抗生素，延遲一小時死亡率急遽攀升。'
    ],
    labPearls: [
      'ANC 計算公式：白血球總數 (WBC) × (% 分葉核 Segment + % 桿狀核 Band) / 100。',
      '發燒定義：單次口溫 >= 38.3°C，或持續 >= 38.0°C 超過 1 小時。'
    ]
  },
  {
    id: 'phypo',
    specialtyId: 'meta',
    specialtyName: '內分泌暨新陳代謝科 (Endocrinology & Metabolism)',
    chapter: 'Pocket Medicine: ENDOCRINOLOGY (p. 301–305)',
    bed: '03C',
    name: '王阿伯',
    who: '王阿伯 · 72 歲 · 糖尿病史',
    topic: '重度低血糖昏迷 (Severe Hypoglycemia, Sugar 38 mg/dL)',
    chiefComplaint: '夜間家屬發現呼叫不應、四肢濕冷大汗、瀕臨昏迷',
    vitals: 'HR 116 bpm, BP 142/86 mmHg, SpO2 97%, 血糖指針 38 mg/dL',
    pocketMedicineSummary: '腦組織完全仰賴葡萄糖作為能量來源，血糖小於 54 mg/dL 會出現神經性缺糖症狀 (Neuroglycopenia)，嚴重低血糖超過數十分鐘將造成不可逆腦細胞壞死與永久性失智或腦死。發現意識改變時，第一步永遠是「驗手指血糖」，確診後立即靜脈推注高濃度葡萄糖水。',
    mustDoPearls: [
      '床邊立即使用床邊血糖機 (Fingerstick Glucometer) 測量血糖。',
      '意識障礙或無法吞嚥者，立即靜脈注射 50% 葡萄糖水 1–2 支 (D50W 20–40 mL IV bolus)。',
      '給糖後 15 分鐘必須複查血糖，並給予維持性 10% 葡萄糖水滴注以防復發。',
      '清醒後提供複合性碳水化合物（如吐司、餅乾、牛奶）延長血糖平穩時間。'
    ],
    pitfalls: [
      '致命錯誤：對意識不清病患強行灌食糖水或果汁，極易引發吸入性肺炎與急性窒息！',
      '致命延誤：誤當急性腦中風先推去做腦部電腦斷層 (CT) 而未先驗血糖，延遲給糖導致永久性低血糖腦病變。'
    ],
    labPearls: [
      'Whipple 三合一徵象 (Whipple Triad)：1. 低血糖臨床症狀；2. 測得血漿低血糖數值；3. 給予葡萄糖後症狀迅速完全解除。'
    ]
  },
  {
    id: 'pstroke',
    specialtyId: 'neuro',
    specialtyName: '神經內科 (Neurology)',
    chapter: 'Pocket Medicine: NEUROLOGY (p. 349–352)',
    bed: '08B',
    name: '陳阿嬤',
    who: '陳阿嬤 · 68 歲 · 高血壓病史',
    topic: '急性缺血性腦中風 (Acute Ischemic Stroke) · 把握黃金時機',
    chiefComplaint: '晨起突發右側肢體完全無力癱軟、口齒不清說不出話、嘴角歪斜',
    vitals: 'HR 78 bpm, BP 172/96 mmHg, SpO2 98%, NIHSS 12 分, 血糖 135 mg/dL',
    pocketMedicineSummary: '缺血性腦組織每分鐘壞死 190 萬個神經元。突發局灶神經缺損時應立即評估「最後正常時間 (Last Known Well)」，迅速完成非對比腦部電腦斷層 (NCCT) 排除顱內出血。黃金時間內 (4.5 小時內) 評估靜脈血栓溶解 (IV rt-PA / Tenecteplase)；大血管阻塞 (LVO) 則在 24 小時內評估動脈動態取栓術 (EVT)。嚴禁過度降血壓！',
    mustDoPearls: [
      '迅速確認「最後正常時間」與執行床邊神經學評估 (FAST / NIHSS)。',
      '急排非顯影腦部電腦斷層 (Brain NCCT) 排除腦出血 (ICH)。',
      '確認適應症後在 4.5 小時內給予靜脈血栓溶解劑 (IV rt-PA 0.9 mg/kg)。',
      '血壓管理：未施打 rt-PA 前不急於降壓（保護缺血半影區側支循環，收縮壓 < 220 mmHg 不用急降）；若施打 rt-PA 則需維持收縮壓 < 180 mmHg。'
    ],
    pitfalls: [
      '致命錯誤：急性中風發作時一看到血壓 170 就急忙給予強效降血壓藥降到 120！這會瓦解大腦側支循環灌流，造成腦梗塞缺血半影區大片壞死！',
      '忽略驗血糖：低血糖會完美模擬中風症狀 (Stroke mimic)，評估中風前務必先排除低血糖。'
    ],
    labPearls: [
      'NCCT 早期缺血信號：大腦中動脈高密度徵象 (Dense MCA sign)、皮質延髓交界模糊、腦島帶消失 (Insular ribbon sign)。'
    ]
  },
  {
    id: 'panaph',
    specialtyId: 'rheum',
    specialtyName: '風濕免疫科 (Rheumatology & Immunology)',
    chapter: 'Pocket Medicine: RHEUMATOLOGY & PULMONARY (p. 83–85)',
    bed: '07B',
    name: '蔡小姐',
    who: '蔡小姐 · 36 歲 · 紅斑性狼瘡 (SLE) 病史',
    topic: '致死性嚴重過敏性休克 (Anaphylaxis & Anaphylactic Shock)',
    chiefComplaint: '靜脈抗生素滴注 5 分鐘後突發喉部緊縮呼吸喘鳴、全身大片風疹塊、血壓驟降',
    vitals: 'HR 132 bpm, BP 72/42 mmHg, SpO2 82%, 皮膚廣泛紅色風疹塊，吸氣性喉頭喘鳴 (Stridor)',
    pocketMedicineSummary: '肥大細胞與嗜鹼性球在 IgE 介導下瞬間大量脫顆粒，釋放組織胺與白三烯酸，引發全身血管廣泛擴張、毛細血管通透性暴增與喉部平滑肌水腫。第一線唯一首選救命藥物為肌肉注射 IM Epinephrine！延遲腎上腺素注射是過敏性休克致死的最主要原因。二線藥物（抗組織胺與類固醇）絕不能取代 Epinephrine。',
    mustDoPearls: [
      '立刻停止可疑藥物或致敏原輸注，維持靜脈通路。',
      '第一首選救命：大腿前外側 (Vastus lateralis) 立即肌肉注射 IM Epinephrine (1:1000) 0.3–0.5 mg，必要時每 5–15 分鐘可重複。',
      '積極呼吸道維護：高流量面罩給氧，若喘鳴 (Stridor) 加劇及早插管保護呼吸道。',
      '循環復甦：立即快速給予 1–2 L 生理食鹽水或乳酸林格氏液靜脈輸注對抗低血壓。',
      '輔助二線治療：靜脈抗組織胺 (H1/H2 blocker) 與靜脈類固醇 (Solu-Medrol 125mg) 預防延遲雙相反應。',
      '收住加護病房監控至少 24 小時以防雙相反應 (Biphasic reaction)。'
    ],
    pitfalls: [
      '致命錯誤：只打靜脈抗組織胺或類固醇，而不敢打或延遲打 Epinephrine！抗組織胺無法緩解喉頭水腫與血管崩解，類固醇需數小時才能作用！',
      '輕忽雙相過敏反應：初期水腫消退後便讓病患出院，約 20% 患者可能在 8–10 小時後再次發生致命性過敏反彈！'
    ],
    labPearls: [
      '血清類胰蛋白酶 (Serum Tryptase)：發作後 1–2 小時抽血顯著升高 (>11.4 ug/L)，可用於事後確認過敏性肥大細胞活化。'
    ]
  }
];


// CPR: chest compressions to a beat. 30 compressions at 100–120 a minute, judged on exactly the
// range the screen gives; the rate is the median of the presses after the first two, so a
// hesitant start or one stray press is forgiven.
export const CPR = { presses: 30, slowest: 100, fastest: 120, maxGap: 2.5 };
