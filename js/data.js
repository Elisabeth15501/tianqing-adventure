/* 天清往事 · 内容数据（M2：四幕内容齐套）
 * prov: '史实' | '演义' —— 所有内容入册前必须带出处（设计文档 §二史实底表）
 * 步骤类型：narr / card / shard / choice / shangshu / rhythm / memory / touhu
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
      + '</svg>',
    yin: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice">'
      + '<defs><radialGradient id="yMoon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#DCE4E0" stop-opacity=".9"/><stop offset="1" stop-color="#DCE4E0" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="ySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16232A"/><stop offset="1" stop-color="#2E444C"/></linearGradient></defs>'
      + '<rect width="1000" height="420" fill="url(#ySky)"/>'
      + '<circle cx="820" cy="90" r="70" fill="url(#yMoon)"/><circle cx="820" cy="90" r="26" fill="#DCE4E0" opacity=".85"/>'
      + '<path d="M60 300 L60 180 L200 150 L200 300 Z" fill="#1B2C33"/>'
      + '<path d="M840 300 L840 180 L700 150 L700 300 Z" fill="#1B2C33"/>'
      + '<rect x="200" y="200" width="600" height="100" fill="#22343B"/>'
      + '<rect x="240" y="230" width="520" height="70" fill="#16232A"/>'
      + '<g fill="#B96A62"><circle cx="300" cy="215" r="7"/><circle cx="430" cy="215" r="7"/><circle cx="570" cy="215" r="7"/><circle cx="700" cy="215" r="7"/></g>'
      + '<g fill="#E9C98F" opacity=".5"><circle cx="300" cy="226" r="12"/><circle cx="430" cy="226" r="12"/><circle cx="570" cy="226" r="12"/><circle cx="700" cy="226" r="12"/></g>'
      + '<rect x="140" y="300" width="720" height="14" fill="#9BA79E"/>'
      + '</svg>',
    wu: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice">'
      + '<defs><linearGradient id="wSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FB5B0" stop-opacity=".55"/><stop offset="1" stop-color="#DDE9E5" stop-opacity=".5"/></linearGradient>'
      + '<linearGradient id="wRiver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E8C8A"/><stop offset="1" stop-color="#3E5460"/></linearGradient></defs>'
      + '<rect width="1000" height="240" fill="url(#wSky)"/>'
      + '<circle cx="200" cy="110" r="34" fill="#EFF5F3" opacity=".9"/>'
      + '<path d="M0 240 Q500 160 1000 240 L1000 300 L0 300 Z" fill="#7E9994"/>'
      + '<rect y="300" width="1000" height="120" fill="url(#wRiver)"/>'
      + '<g stroke="#DDE9E5" stroke-width="2" opacity=".4"><path d="M60 340 H240 M320 365 H540 M640 335 H820"/></g>'
      + '<path d="M180 330 h120 l14 16 h-148 Z" fill="#22343B"/><path d="M228 330 v-46 l30 46 Z" fill="#96543F"/>'
      + '<path d="M700 348 h100 l12 14 h-124 Z" fill="#22343B"/><path d="M742 348 v-38 l24 38 Z" fill="#8C5040"/>'
      + '</svg>',
    you: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice">'
      + '<defs><radialGradient id="uCandle" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E9C98F" stop-opacity=".5"/><stop offset="1" stop-color="#E9C98F" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="uBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B21"/><stop offset="1" stop-color="#1B2C33"/></linearGradient></defs>'
      + '<rect width="1000" height="420" fill="url(#uBg)"/>'
      + '<circle cx="500" cy="230" r="150" fill="url(#uCandle)"/>'
      + '<rect x="480" y="200" width="40" height="60" rx="4" fill="#22343B"/>'
      + '<path d="M498 188 q6 -14 12 0 q-6 10 -12 0" fill="#E9C98F"/>'
      + '<rect x="300" y="260" width="400" height="10" fill="#22343B"/>'
      + '<g stroke="#2E444C" stroke-width="8"><path d="M320 270 V360 M680 270 V360"/></g>'
      + '<path d="M60 140 Q500 100 940 140" stroke="#16232A" stroke-width="26" fill="none"/>'
      + '</svg>'
  },

  acts: [
    {
      id: 'yin', name: '寅时 · 万寿门', unlocked: true, bg: 'yin',
      steps: [
        { type: 'narr', text: '天未亮，宫灯次第亮起。万寿门内，今日仪注已铺满长案。' },
        { type: 'narr', text: '显德五年九月廿四，天清节。官家的三十八岁生日。' },
        { type: 'shard', id: '1' },
        { type: 'narr', text: '你展开第一份仪程。头一项差事不在门下——在尚食局。官家生辰的汤饼，今年由你掌勺。' },
        { type: 'narr', text: '尚食局的灶已经热了。九月近冬，汤饼正当时。' },
        { type: 'rhythm', cfg: 'tangbing', deco: 'tangwan', decoName: '汤饼碗' },
        { type: 'shard', id: '3' },
        { type: 'narr', text: '面送到万寿门侧殿候着。你回廊下过仪注，殿檐下挂着一方旧寺额的拓样——天清寺进贡的贺仪单子就压在下面。' },
        { type: 'shard', id: '2' },
        { type: 'narr', text: '礼毕前的间隙，你在廊柱下静了一静。灯影里，有一段往事自己浮了上来。' },
        { type: 'memory', id: 'guowei' },
        { type: 'memory', id: 'huiling' },
        { type: 'shard', id: '4' },
        { type: 'narr', text: '天光将明。辰时将至，广德殿的方向传来钟磬试音的一声——寅时之礼，至此礼毕。' }
      ]
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
        { type: 'memory', id: 'fengdao' },
        { type: 'narr', text: '翌日，玉津园。宴宰臣、枢密使及近臣——没有殿上的钟磬，只有园里的风。' },
        { type: 'card', speaker: '王朴', text: '臣固陋，辄以所学推之——三十年后，非所知也。' },
        { type: 'narr', text: '五年前的那句话，他到现在还没有答完。' },
        { type: 'card', speaker: '王朴', text: '眼前可答的：均田三十四使臣已下州，汴口的漕船到了。' },
        { type: 'narr', text: '风把酒吹凉了。官家笑，命再满。' },
        { type: 'shard', id: '8' },
        { type: 'narr', text: '园中暮色四合。辰时之礼，至此礼毕。' }
      ]
    },
    {
      id: 'wu', name: '午时 · 汴桥', unlocked: true, bg: 'wu',
      steps: [
        { type: 'narr', text: '午时，宫门开半扉。今日赐民宴乐，依唐千秋节旧制（演绎）——金吾不禁，汴桥上下人声如沸。' },
        { type: 'narr', text: '你捧着赐出的面出宫。桥头第一眼看见的，是水——浚汴口后，江淮的漕船第一次这样列队进京。' },
        { type: 'shard', id: '9' },
        { type: 'narr', text: '桥市上一个丝线摊子围满了人。今日士庶互赠丝囊，也是沿唐旧俗（演绎）——摊主招呼你：官家身边的礼官，不做一个？' },
        { type: 'rhythm', cfg: 'chenglu', deco: 'nang', decoName: '承露囊' },
        { type: 'shard', id: '10' },
        { type: 'narr', text: '贡品的车队正好从桥南过。九月廿一占城刚入贡，那天贡的三百匹沉香还在礼部的库里。' },
        { type: 'shard', id: '11' },
        { type: 'card', speaker: '黄衣小皇子', text: '礼官。你的面，为什么比别处的长？' },
        { type: 'narr', text: '皇子宗训，今年虚岁六岁。你蹲下来告诉他：面长，是盼着吃面的人长寿。他似懂非懂，把碗捧得稳稳的。（演绎）' },
        { type: 'shard', id: '12' },
        { type: 'narr', text: '桥头茶摊的老板娘续水时随口说：这茶，比起官家少年时在江陵贩的那种，差得远喽。' },
        { type: 'narr', text: '江陵。茶。你愣了一下——水汽里，有一段比大周更早的往事浮了上来。' },
        { type: 'memory', id: 'chashi' },
        { type: 'narr', text: '日头偏西。市声不歇，午时之礼，至此礼毕。' }
      ]
    },
    {
      id: 'you', name: '酉时 · 滋德殿旧址', unlocked: true, bg: 'you',
      steps: [
        { type: 'narr', text: '酉时，滋德殿旧址。殿已空置两年，廊下只有风。烛是你自己点的——这里如今没有别人当值。' },
        { type: 'narr', text: '显德三年七月廿一，皇后符氏崩于此殿，葬懿陵，谥宣懿。今夜你替礼部清点遗物，明日封箱。' },
        { type: 'shard', id: '13' },
        { type: 'narr', text: '遗物案上三件事：一页残纸，一盏灯，一炷将尽的香。' },
        { type: 'narr', text: '残纸是显德三年她谏止亲征淮南的表文底稿。字到「不听」为止——后面的，随行、染疾、大渐，都不在这页纸上。' },
        { type: 'shard', id: '16' },
        { type: 'shard', id: '14' },
        { type: 'narr', text: '移灯的时候，灯座底下响了一声。是只旧匣，锁早已锈死。你用簪子撬开——' },
        { type: 'narr', text: '满匣天青。' },
        { type: 'memory', id: 'suiweng' },
        { type: 'shard', id: '15' },
        { type: 'narr', text: '匣底压着一行小字，簪花小楷，笔意温软：「俟官家息怒之日，当使良工修补。」' },
        { type: 'narr', text: '她收了两年，没有等到那一天。明天，是官家的生日。' },
        { type: 'narr', text: '远处天清寺的晚钟响了。你把十六片碎瓷一片不少地收进匣中，抱在怀里，吹了灯。酉时之礼，至此礼毕。' }
      ]
    },
    {
      id: 'final', name: '终幕 · 广德殿与合瓮', unlocked: true, bg: 'chen',
      steps: [
        { type: 'narr', text: '九月廿四，夜。白日的寿宴散了又开——官家命再设一席，只言「有物未献」。满殿烛火，比辰时更亮。' },
        { type: 'card', speaker: '王朴', text: '陛下今日之乐，胜过年首。臣等忝列，与有荣焉。' },
        { type: 'card', speaker: '范质', text: '淮南既平，刑统既颁，田赋既均——明年今日，愿更献新颂。' },
        { type: 'card', speaker: '张永德', text: '臣与陛下，高平旧矣。今日之乐，臣代同袍共贺。' },
        { type: 'card', speaker: '赵匡胤', text: '殿前诸班，为官家千秋再饮一觞。' },
        { type: 'card', speaker: '殷崇义', text: '外臣忝陪盛筵。归国之日，必告江南国主：中朝之寿，礼备乐和。' },
        { type: 'narr', text: '酒过三巡，官家抬手止了乐声，目光落在你身上——该献了。' },
        { type: 'narr', text: '翌日，玉津园。献瓮之前，官家命先设壶——「今日之乐未足，再添一局。」群臣相顾而笑：该礼官先投。' },
        { type: 'touhu' },
        { type: 'narr', text: '园中笑音未落，官家起身：「好了，献上来吧。」你捧出合瓮的天青瓷——烛下釉光一转，满园皆静。' },
        { type: 'narr', text: '十六片碎瓷，此刻在天青里重圆。碎过的东西，拼回来了，比原先更亮。（演义）' },
        { type: 'narr', text: '官家抚瓮良久，只问了一句：「在哪里寻着的？」你答：在等它重圆的地方。' }
      ]
    }
  ],

  shards: {
    '1': {
      name: '生辰帖', prov: '史实',
      text: '唐天祐十八年九月廿四，生于邢州尧山。帖子上的字，记下了四十年前的那个年月。',
      source: '《旧五代史》卷一一四'
    },
    '2': {
      name: '天清寺额', prov: '史实',
      text: '寺建于显德年间，赐额「天清」——即以圣节为名，世宗功德院。天清节之名，由此有形。',
      source: '《旧五代史》及《册府元龟》圣节表'
    },
    '3': {
      name: '生日汤饼', prov: '史实',
      text: '「阿忠脱紫半臂易斗面，为生日汤饼」——唐人生日食汤饼之证。九月近冬，正合《唐六典》「冬月量造汤饼」。',
      source: '《新唐书·后妃传》、《唐六典》'
    },
    '4': {
      name: '澶州政声', prov: '史实',
      text: '镇澶州，为政清肃，盗不犯境。及移镇，吏民诣阙求留——那是他还没做皇帝的时候。',
      source: '《旧五代史·世宗纪一》'
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
    },
    '9': {
      name: '汴口漕船', prov: '史实',
      text: '浚汴口，导河达淮——江淮舟楫始通，河南民力漕运之苦一朝得解。今日进京的米，就是从这条水来的。',
      source: '《资治通鉴》卷二九三至二九四'
    },
    '10': {
      name: '丝结承露囊', prov: '史实（唐俗）·沿用标演绎',
      text: '「士庶以丝结承露囊，更相遗问」——唐千秋节旧俗。五代承唐制，天清节沿用之（演绎标注）。',
      source: '张说《请千秋节表》'
    },
    '11': {
      name: '占城贡使', prov: '史实',
      text: '九月廿一，占城国王遣使入贡——天清节前三日。贡品三百匹沉香，此刻还在礼部库里。',
      source: '《旧五代史·世宗纪》'
    },
    '12': {
      name: '与民同乐', prov: '演义',
      text: '金吾弛禁、许士民宴乐，系依唐千秋节赐酺旧制演绎——天清节是否赐酺，正史无直接记载。',
      source: '依唐《千秋节》旧制演绎'
    },
    '13': {
      name: '懿陵', prov: '史实',
      text: '显德三年七月廿一，皇后符氏崩于滋德殿，葬懿陵，谥宣懿。史称其「性和惠，善候世宗之旨」。',
      source: '《旧五代史》卷一二一'
    },
    '14': {
      name: '旧灯', prov: '演义',
      text: '灯无史载，为演义意象。「善候世宗之旨」的人，想必也常在灯下等人回来——那是后人愿意相信的样子。',
      source: '演义（意象本于《旧五代史》本传）'
    },
    '15': {
      name: '碎瓮匣', prov: '演义',
      text: '御窑天青瓷，碎于显德三年一场帝怒。她把十六片收进匣中，收了两年，没有等到修补的那一天。',
      source: '《碎瓮记》设定（演义）'
    },
    '16': {
      name: '谏征残页', prov: '史实底·残页为演义',
      text: '显德三年，帝欲亲征淮南，后谏——不听，遂从行，还而染疾。残页上的字，到「不听」为止。',
      source: '字句本《旧五代史》卷一二一本传大意'
    }
  },

  /* ---------- 记忆（瓷心 · 五段） ---------- */
  memories: {
    guowei: {
      title: '瓷心 · 澶州灯下', era: '广顺三年冬（953）', prov: '演义（对话）·史实底（封晋王判开封府）',
      lines: [
        '广顺三年冬，澶州衙署的灯下，他读到开封来的急诏——养父病了。',
        '渡河南下那年他三十三岁，一路雪。这个从邢州尧山走出来的孩子，回京后成了皇子。',
        '养父看他看了很久，说：「你的胆，像朕。你的细，比朕强。」',
        '三个月后，他接过的不是家，是一个国。'
      ]
    },
    huiling: {
      title: '瓷心 · 惠陵', era: '显德四年四月（958）', prov: '史实底（追册礼）·场景演绎',
      lines: [
        '显德四年四月，追册故彭城郡夫人刘氏为皇后，谥贞惠，陵曰惠陵。',
        '诏书里写：「父子之道，圣贤不忘。」——同月，三个孩子追封越王、吴王、韩王。',
        '迟到八年的册封礼，办得一丝不苟。',
        '他从头到尾，没有说一句话。'
      ]
    },
    fengdao: {
      title: '瓷心 · 为山', era: '显德元年三月（954）', prov: '史实底（对话见《新五代史·冯道传》，字句有异文）',
      lines: [
        '北汉入寇，他要亲征。满朝反对，冯道的声音最硬。',
        '「昔唐太宗定天下，未尝不自行。」',
        '「陛下未可便学太宗。」',
        '「吾以吾之众，当如山压卵。」',
        '「未审陛下做得山否。」',
        '三月，高平。山压了卵。',
        '四月，老人走了。那句「做得山否」，他记了一辈子——不是记恨，是记着：话，要说给敢说的人听。'
      ]
    },
    chashi: {
      title: '瓷心 · 少年茶', era: '比大周更早', prov: '史实底（早年随茶商颉跌氏行贩江陵）·演义',
      lines: [
        '更早以前——比大周、比澶州、比高平都早。',
        '邢州尧山的孩子，跟着颉跌氏的商队往南走，一担茶走到江陵。',
        '他学会看火候、看天色、看人心；也学会算账——茶要趁热，账要趁清。',
        '多年以后，均田使臣三十四路下州。他说：先学会算账，再谈天下。'
      ]
    },
    suiweng: {
      title: '瓷心 · 碎瓮记', era: '显德三年春（956）', prov: '演义',
      lines: [
        '显德三年，春。淮南的军报和江宁的国书同时到了案上。',
        '官家的声音冷下来的时候，殿里的人都退远了。只有她没有走。',
        '「亲征？」她把灯挑亮了些，「淮南千里。中书的表、枢密的计、六军的粮——交给谁？」',
        '「交给朕自己。」',
        '拍案。案上那尊御窑天青瓷坠地，碎声很轻，轻得像谁叹了口气。',
        '满地天青。他没有再看她，她也没有再说话。',
        '那晚她蹲在地上，一片、一片，把碎片拣进了匣子。'
      ]
    }
  },

  /* ---------- 节奏小节配置（通用引擎） ---------- */
  shangshu: {
    title: '习礼 · 执觞上寿',
    beats: ['拜', '兴', '举觞', '称寿'],
    hint: '金线滑到青区时，点击——礼不可错，也不必慌。',
    retry: '礼官轻咳：再拜一次。',
    done: '四礼习毕。'
  },
  tangbing: {
    title: '尚食局 · 一碗汤饼',
    beats: ['和面', '擀面', '切面', '浇头'],
    hint: '金线到青区时下手——寿面岂可断。',
    retry: '断了半根。尚食令：再来一碗，不急。',
    done: '面成。一刀到底，未见断处。'
  },
  chenglu: {
    title: '汴桥 · 丝结承露囊',
    beats: ['择丝', '绕线', '结囊'],
    hint: '跟着金线绕——囊成，赠与桥头有缘人。',
    retry: '针脚松了，绕紧些。',
    done: '囊成。桥头的孩子得了它，一路笑着跑远了。'
  },

  /* ---------- 投壶（终幕） ---------- */
  touhu: {
    title: '玉津园 · 投壶',
    hint: '金线到青区时出手。手稳，则中。',
    retry: '矢落壶外。拾矢，再投。',
    beatNames: ['第一矢', '第二矢'],
    intro: { speaker: '司正', text: '酒过三巡，园中设壶。群臣轮番，礼官亦预——官家笑言：今日之乐，不可无礼官。' },
    ministers: [
      { speaker: '王朴', text: '王朴拂衣而起，二矢连中，矢矢入壶心：「礼在壶中，不在酒中。」' },
      { speaker: '张永德', text: '张永德一投一中，投失那矢被他大笑自罚一觞：「高平之后，手还没生。」' },
      { speaker: '赵匡胤', text: '赵匡胤出手极稳，二矢皆中——武人执矢如执枪，壶口在他眼里不过是个「敌」字。' },
      { speaker: '殷崇义', text: '殷崇义二矢一中，拱手四座：「江南亦有此戏。输赢之外，先敬主人。」' }
    ],
    rongIntro: '轮到压轴——官家亲自下场。全园都静了。',
    rong: [
      '首矢破空，正中壶口。欢声如雷。',
      '次矢出手，擦着壶耳飞出。官家看着自己的手，笑：「今日的手，不如卿等稳。」'
    ],
    verdictWin: '你的两矢皆中。官家大笑：「好手！园中之乐，礼官不可再谦。」',
    verdictDraw: '你一矢入壶，与官家战平。王朴抚掌：「势均。来日再会。」',
    verdictLose: '两矢皆落。官家却先举觞：「掌礼者日日执礼，难得执一回矢——罚酒一杯，不算输。」'
  },

  memoCopy: {
    title: '礼官手札',
    sub: '每逢一个时辰礼毕，手札会自行记下进度；你也可以随时让我再记一笔。',
    continue: '继续值守',
    restart: '从头再来',
    saveNow: '现在就记',
    saved: '手札已记好。'
  },

  ending: {
    title: '合瓮 · 天清',
    lines: [
      '十六片碎瓷，此刻在天青里重圆。',
      '碎过的东西，拼回来了，比原先更亮。（演义）'
    ],
    quote: '雨过天青云破处，这般颜色做将来（世传御批）'
  }
};
