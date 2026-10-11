/* 天清往事 · 内容数据（骨架版：M1 起逐幕填充）
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
    { id: 'chen', name: '辰时 · 广德殿', unlocked: false, steps: [] },
    { id: 'wu', name: '午时 · 汴桥', unlocked: false, steps: [] },
    { id: 'you', name: '酉时 · 滋德殿旧址', unlocked: false, steps: [] },
    { id: 'final', name: '终幕 · 玉津园与合瓮', unlocked: false, steps: [] }
  ],

  shards: {
    '1': {
      name: '生辰帖',
      prov: '史实',
      text: '唐天祐十八年九月廿四，生于邢州尧山。帖子上的字，是四十年前写下他的年月。',
      source: '《旧五代史》卷一一四'
    }
    /* 2–16 号碎片随 M1/M2 内容稿逐片入库 */
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
