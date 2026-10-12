/* 天清往事 · 内容数据（M1：寅时演示 + 辰时全稿）
 * prov: '史实' | '演义' —— 所有内容入册前必须带出处（设计文档 §二史实底表）
 */
window.TQ_DATA = {
  title: {
    main: '天清往事',
    sub: '显德五年 · 九月廿四 · 天清节',
    note: '雨过天青云破处，这般颜色做将来（世传御批）'
  },

  roles: [
    { id: 'nv', name: '宫中女官', desc: '掌灯烛宴席，出入后宫与寿宴两处' },
    { id: 'shi', name: '随驾史官', desc: '执笔记注，见闻皆入起居之册' }
  ],

  /* ---------- 背景（简版场景画，正式资产并入后替换） ---------- */
  bg: {
    chen: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice">'
      + '<defs><linearGradient id="bgRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E444C"/><stop offset="1" stop-color="#3D5960"/></linearGradient>'
      + '<linearGradient id="bgWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6E0CE" stop-opacity=".8"/><stop offset="1" stop-color="#CFC7B0" stop-opacity=".8"/></linearGradient></defs>'
      + '<path d="M120 284 L500 190 L880 284 L862 293 L138 293 Z" fill="url(#bgRoof)"/>'
      + '<rect x="436" y="186" width="128" height="8" rx="2" fill="#243840"/>'
      + '<path d="M436 192 C426 191 419 184 419 173 C419 165 425 160 432 162 L438 168 C434 173 435 181 443 186 Z" fill="#243840"/>'
      + '<path d="M564 192 C574 191 581 184 581 173 C581 165 575 160 568 162 L562 168 C566 173 565 181 557 186 Z" fill="#243840"/>'
      + '<rect x="300" y="286" width="400" height="12" fill="#26343C"/>'
      + '<rect x="300" y="298" width="400" height="6" fill="#8C5040"/>'
      + '<rect x="306" y="304" width="388" height="90" fill="url(#bgWall)"/>'
      + '<g fill="#96543F"><rect x="316" y="304" width="10" height="90"/><rect x="394" y="304" width="10" height="90"/>'
      + '<rect x="486" y="304" width="10" height="90"/><rect x="576" y="304" width="10" height="90"/><rect x="674" y="304" width="10" height="90"/></g>'
      + '<rect x="470" y="252" width="44" height="88" rx="3" fill="#2A2320"/>'
      + '<rect x="474" y="257" width="36" height="78" fill="none" stroke="#B08A5C" stroke-width="1.2"/>'
      + '<text x="492" y="286" text-anchor="middle" font-size="17" fill="#E0C989" font-family="KaiTi,STKaiti,serif" font-weight="bold">廣</text>'
      + '<text x="492" y="312" text-anchor="middle" font-size="17" fill="#E0C989" font-family="KaiTi,STKaiti,serif" font-weight="bold">德</text>'
      + '<text x="492" y="338" text-anchor="middle" font-size="17" fill="#E0C989" font-family="KaiTi,STKaiti,serif" font-weight="bold">殿</text>'
      + '<rect x="330" y="330" width="140" height="64" fill="none" stroke="#8C5040" stroke-width="2"/>'
      + '<g stroke="#8C5040" stroke-width="1.4"><path d="M344 330 v64 M358 330 v64 M372 330 v64 M386 330 v64 M400 330 v64 M414 330 v64 M428 330 v64 M442 330 v64 M456 330 v64"/></g>'
      + '<rect x="532" y="330" width="140" height="64" fill="none" stroke="#8C5040" stroke-width="2"/>'
      + '<g stroke="#8C5040" stroke-width="1.4"><path d="M546 330 v64 M560 330 v64 M574 330 v64 M588 330 v64 M602 330 v64 M616 330 v64 M630 330 v64 M644 330 v64 M658 330 v64"/></g>'
      + '<rect x="290" y="394" width="420" height="18" fill="#9BA79E"/>'
      + '</svg>'
  },

  acts: [
    {
      id: 'yin', name: '寅时 · 万寿门', unlocked: true,
      steps: [
        { type: 'narr', text: '天未亮，宫灯次第亮起。万寿门内，今日仪注已铺满长案。' },
        { type: 'narr', text: '显德五年九月廿四，天清节。官家的三十八岁生日。' },
        { type: 'narr', text: '你展开第一份仪程——这是他的生辰帖。' }
      ],
      shardAfter: '1'
    },
    {
      id: 'chen', name: '辰时 · 广德殿', unlocked: true, bg: 'chen',
      steps: [
        { type: 'narr', text: '晨光落进广德殿的檐角，鸱尾的影子压在金砖上。教坊乐起，群臣鱼贯而入。' },
        { type: 'narr', text: '今日仪注第一条：执觞上寿。礼不可错，你先替众臣习一遍。' },
        { type: 'shangshu' },
        { type: 'narr', text: '习礼毕。钟磬一响，上寿开始——你退到廊下，看着满殿朱紫。' },
        { type: 'card', speaker: '范质', text: '陛下临御五年，《大周刑统》二十一卷颁行天下，狱讼有章——臣谨奉千觞，为陛下寿。' },
        { type: 'shard', id: '6' },
        { type: 'card', speaker: '李谷', text: '均田三十四使臣分行诸州，田赋始均。民得其所，臣得以奉觞。' },
        { type: 'shard', id: '7' },
        { type: 'card', speaker: '王溥', text: '江淮舟楫始通，米粮溯汴而至。国用既纾，礼乐方兴——臣溥奉觞。' },
        { type: 'card', speaker: '张永德', text: '殿前诸班，皆陛下亲选之士。甲兵既精，敢不以觞为寿。' },
        { type: 'card', speaker: '李重进', text: '臣掌侍卫亲军，惟以操练报陛下。千觞之寿，不敢忘战。' },
        { type: 'card', speaker: '赵匡胤', text: '殿前都指挥使赵匡胤，恭祝官家千秋。' },
        { type: 'narr', text: '最短的一句。官家颔首，目光在殿上扫过一圈——停在了殿角那位南唐来使身上。' },
        { type: 'narr', text: '吏部尚书兼知枢密院殷崇义，奉江南国主之命，入贺天清节。淮南的仗刚打完，这一觞怎么接，全看礼官递辞令的眼色。' },
        { type: 'choice', key: 'yin_chongyi', speaker: '殷崇义举觞，满殿安静', prompt: '你替礼官择一条答辞——',
          options: [
            { label: '温雅', text: '两国罢兵，始有今日之寿。愿使君归语李公：汴之灯，淮之月，同此一盏。', reply: '殷崇义举觞一饮，眉目不动：「好盏中月。」' },
            { label: '堂正', text: '淮南既通，舟楫岁至。此觞敬两岸行旅，亦敬使君远路。', reply: '殷崇义颔首，一字一顿：「使君之语，臣必一字不差，带回江南。」' }
          ] },
        { type: 'narr', text: '官家嘉其礼，命升其座。殿上乐声再起。' },
        { type: 'shard', id: '5' },
        { type: 'narr', text: '翌日，玉津园。宴宰臣、枢密使及近臣——没有殿上的钟磬，只有园里的风。' },
        { type: 'card', speaker: '王朴', text: '臣固陋，辄以所学推之——三十年后，非所知也。' },
        { type: 'narr', text: '五年前的那句话，他到现在还没有答完。' },
        { type: 'card', speaker: '王朴', text: '眼前可答的：均田三十四使臣已下州，汴口的漕船到了。' },
        { type: 'narr', text: '风把酒吹凉了。官家笑，命再满。' },
        { type: 'shard', id: '8' },
        { type: 'narr', text: '园中暮色四合。辰时之礼，至此礼毕。' }
      ]
    },
    { id: 'wu', name: '午时 · 汴桥', unlocked: false, steps: [] },
    { id: 'you', name: '酉时 · 滋德殿旧址', unlocked: false, steps: [] },
    { id: 'final', name: '终幕 · 玉津园与合瓮', unlocked: false, steps: [] }
  ],

  shards: {
    '1': {
      name: '生辰帖', prov: '史实',
      text: '唐天祐十八年九月廿四，生于邢州尧山。帖子上的字，记下了四十年前的那个年月。',
      source: '《旧五代史》卷一一四'
    },
    '5': {
      name: '淮南十四州图', prov: '史实',
      text: '三月，淮南平，得州十四、县六十。李璟去帝号，称「江南国主」，两国划江为界。',
      source: '《资治通鉴》卷二九三至二九四'
    },
    '6': {
      name: '《大周刑统》', prov: '史实',
      text: '显德五年七月，《大周刑统》二十一卷颁行天下——五代以来律令繁杂，至此狱讼有所准绳。',
      source: '《旧五代史·世宗纪》'
    },
    '7': {
      name: '《均田图》', prov: '史实',
      text: '七月丁亥，颁元稹《均田图》于诸州；十月，遣使臣三十四人分行天下，均定田租。',
      source: '《旧五代史·世宗纪》'
    },
    '8': {
      name: '君臣同宴', prov: '演义（位次）',
      text: '玉津园之宴，枢密使王朴座近御前。君臣论政，至暮忘倦。——座次为演绎，官职为史实。',
      source: '官职见《旧五代史》卷一一六'
    }
    /* 其余碎片随 M2 内容稿入库 */
  },

  shangshu: {
    beats: ['拜', '兴', '举觞', '称寿'],
    hint: '金线滑到青区时，点击——礼不可错，也不必慌。',
    retry: '礼官轻咳：再拜一次。',
    done: '四礼习毕。'
  },

  memoCopy: {
    title: '礼官手札',
    sub: '每逢一个时辰礼毕，手札会自行记下进度；你也可以随时让我再记一笔。',
    continue: '继续值守',
    restart: '从头再来',
    saveNow: '现在就记',
    saved: '手札已记好。'
  }
};
