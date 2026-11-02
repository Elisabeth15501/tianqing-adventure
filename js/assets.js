/* 天清往事 · 素材注册表与侦测（轨③接线 · 回退机制 L0/L1/L2 · 10-24 实装）
 * 职责：①登记「已入包资产」（唯一事实源，构建期由 artdraft/props3d/manifest.json 派生）；
 *      ②boot 探针（WebP 解码 + 2048 纹理，§10.5 L0）；
 *      ③逐 assetKey 预载侦测（2s 超时，会话缓存）——失败即回退代码绘画占位；
 *      ④帧时看门狗（§10.5 L1 软触发：30 帧均值 >33ms 记慢，同类两连退）；
 *      ⑤玩家设置（localStorage：图样 auto/vector · 体法 gongxing/jie，§10.5 L2）。
 * 纪律：任何侦测都不阻塞渲染——调用方先画 vector 占位，'ok' 后原位升级（先占位后升级，永不白屏）。
 * 兼容：Chrome 61 / ES2017 · 无 inline · 零外部请求（资产同源白名单 .webp）。
 */
(function (global) {
  'use strict';

  var TA = { reg: {}, status: {}, imgs: {}, env: null, slowKinds: {}, _pending: {} };

  /* ---------- 内壁静态帧的姿态与保证（由 pick_inner_pose.py + pack_inner_still.py 产出） ----------
   * innerRatio = 「该姿态下可见内壁面积 / 该片内壁总面积」。
   * 16 片实测最低 0.864（#01），其余均 ≥0.94，其中 14 片 = 1.000
   * ⇒ 静态兜底图里是**整张画**，不是残片。
   * 索引 0 占位不用（瓷片 id 从 1 起）。 */
  var SHARD_INNER_RATIO = [0.0000, 0.8635, 1.0000, 0.9429, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000];
  var SHARD_INNER_YAW = [0, 210, 30, 210, 30, 180, 300, 30, 210, 0, 0, 60, 210, 180, 150, 0, 60];
  var SHARD_INNER_PITCH = [0, 0, 0, -45, 0, -45, -45, -45, 0, 0, 0, 0, 45, 45, 45, 45, 45];
  TA.INNER_RATIO = SHARD_INNER_RATIO;
  /* 每片「内壁朝外」的 yaw（pick_inner_pose 实测）：查看器一进去就转到有画的那一面，
   * 否则默认 yaw=0 对着外壁，玩家看到的是纯釉，会以为「没东西可看」。 */
  TA.INNER_YAW = SHARD_INNER_YAW;

  /* ---------- 注册表：16 碎片转台 atlas（P0 已产，4×3 · 12 帧 · 160px） ----------
   * prop 帧组（汤饼碗/金觞/承露囊/旧灯等）待 3D 渲染交付后由 manifest 构建期追加条目；
   * 未注册的 key 一律即时返回 'none'（纯 vector，不发网络探测）。 */
  (function () {
    for (var i = 1; i <= 16; i += 1) {
      var n = (i < 10 ? '0' + i : String(i));
      TA.reg['shard-' + i] = { kind: 'atlas', src: './assets/shards/shard_' + n + '.webp',
        cols: 4, rows: 3, frames: 12, fw: 160, fh: 160, fps: 12 };
      /* S8 近看单枚 · lat-long 多向图集（12yaw×3pitch，拖拽自由旋转 + 惯性）。
       * 文件缺失时 resolve 'fail' → spin3d 自动回退 12 帧转台 shardViewer（永不白屏）。
       * ★ 2026-10-28：单元从 128 提到 **160**（P1 重出时的实际格宽），
       *   不改这里会导致 drawImage 采样错位（相邻档互相串格）。
       *   pitchMax 45 ⇒ 三行正好是「俯视 +45° / 平视 0° / 仰视 −45°」，
       *   即用户点名的俯视、仰视、45° 倾斜各自有确切档位。 */
      TA.reg['shard-LL-' + i] = { kind: 'latlong', src: './assets/shards/shard_' + n + '_ll.webp',
        yaw: 12, pitch: 3, pitchMax: 45, cols: 12, rows: 3, fw: 160, fh: 160,
        cw: 160, ch: 160, anchor: { yaw: 0, pitch: 1 } };
      /* ★ 2026-10-28 内壁静态帧（回退兜底 + 双击细看）。
       *   按「可见内壁 / 内壁总面积」最优姿态渲染（pick_inner_pose.py），
       *   实测 16 片全部 ≥86%（14 片 = 100%），即**整张画**都在画面里。
       *   innerRatio 写进注册表 = 这份保证可被运行时读取（也供自动化测试断言），
       *   不需要再 fetch 任何 json（容器禁用 fetch/XHR）。 */
      TA.reg['shard-inner-' + i] = { kind: 'image', src: './assets/shards/shard_' + n + '_inner.webp',
        innerRatio: SHARD_INNER_RATIO[i], poseYaw: SHARD_INNER_YAW[i], posePitch: SHARD_INNER_PITCH[i] };
    }
    /* 纸槌瓶 · lat-long 多向（近看全方位；旋转对称 ⇒ yaw 视觉弱，俯仰为主反馈） */
    TA.reg['vessel-LL'] = { kind: 'latlong', src: './assets/shards/vessel_ll.webp',
      yaw: 12, pitch: 3, pitchMax: 45, cols: 12, rows: 3, fw: 160, fh: 160,
      cw: 160, ch: 160, anchor: { yaw: 0, pitch: 1 } };
  })();

  /* S8 长卷底图（生图清单看板 s8_scroll：1200×1900、≤120KB、超线降矢量轨）。
   * 本条目即「最终瓷片/瓷器具象」的总开关：resolve ok 才切手札长卷版；
   * 未生成前文件不存在 → resolve 失败 → 手札回退现行网格版（零变化）。
   * 生图就位后把下方 src 指向实产文件即可，其余代码无需改动。 */
  TA.reg['s8_scroll'] = { kind: 'image', src: './assets/s8/s8_scroll.webp' };
  TA.DECO_SLOTS = { tl: 'tangwan', tr: 'jinzang', bl: 'nang', br: 'jinzhi' };
  TA.DECO_NAME = { tangwan: '汤饼碗', jinzang: '金觞', nang: '承露囊', jinzhi: '金矢' };

  /* PROPS 键 → assetKey 映射（「绑定」声明：素材入包注册即自动生效；无条目 = 纯占位） */
  TA.propAsset = {
    dough: 'prop-tangwan', roller: 'prop-ganmian', bowl: 'prop-tangwan',
    cup: 'prop-jinzang', lamp: 'prop-jiudeng', pouch: 'prop-chenglunang',
    shard: 'prop-cipian', bottle: 'prop-zhitai', pot: 'prop-touhu', arrow: 'prop-shi',
    ink: 'prop-yanmo', minjie: 'prop-qiaoshi', canji: 'prop-canjuan'
  };

  /* ---------- 玩家设置（§10.5 L2 · localStorage 三层降级口径） ---------- */
  function lsGet(k, d) {
    try { return localStorage.getItem(k) || d; } catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (err) { /* 隐私模式静默 */ }
  }
  /* ★2026-11-02：占位回退开关「恒用预设图样」已下线。
   *   旧版返回 localStorage 里的 tq_assets_mode（auto|vector），玩家一旦打开就整局只看矢量图；
   *   真机反馈里「人物/背景没出来」有一半来自这里。现在恒为 'auto'：
   *   **真素材优先，占位只在解码失败/超时/尺寸超限时自动顶上**（见下方 resolve 的三态）。
   *   键名保留只为兼容旧存档——已经设过 vector 的机器不会再把整局锁在占位态。 */
  TA.assetsMode = function () { return 'auto'; };
  TA.tifa = function () { return lsGet('tq_tifa', 'gongxing'); };         /* gongxing | jie · 保留备用 */
  TA.tifaJie = function () { return TA.tifa() === 'jie'; };
  TA.setSetting = function (k, v) { lsSet(k, v); };

  /* ---------- 游戏系统闸门（11-01 收束为单轨） ----------
   * 「动手小节」原先按体法（tq_tifa）在两套系统间切换：
   *   躬行 → 逐手势小游戏（js/minigame.js） ／ 应节 → 更漏·礼乐节拍器（app.js runJie）
   * 第一版收束为**单轨**：一律走小游戏，不再按体法切换。
   *
   * ★应节轨完整保留、可以随时恢复：
   *   1) 把 GSYS.jie.on 改成 true；
   *   2) 把 TA.gameSystem() 改成读 tq_tifa（文件末尾有注释掉的原始一行）。
   *   除此之外不需要改任何别的地方 —— runJie / 更漏皮 / .mode-jie 样式 / tq_tifa 键都还在。
   *
   * 「无障碍模式」是本作整体（不只动手小节）的无障碍设计，**暂不开发**，
   * 这里只登记一个占位 id，防止将来与「应节」混为一谈。 */
  var GSYS = {
    minigame: { id: 'minigame', label: '动手', on: true },
    jie:      { id: 'jie', label: '应节', on: false, kept: true },
    a11y:     { id: 'a11y', label: '无障碍', on: false, built: false }
  };
  TA.GSYS = GSYS;
  TA.gameSystem = function () {
    /* 原始分叉（恢复应节时改回这一行）：
       return (TA.modeOpen('jie') && TA.tifaJie()) ? 'jie' : 'minigame'; */
    return 'minigame';
  };
  TA.modeOpen = function (id) { var m = GSYS[id]; return !!(m && m.on); };
  TA.modeKept = function (id) { var m = GSYS[id]; return !!(m && m.kept); };
  TA.setGameSystem = function (id) { return TA.modeOpen(id); };
  TA.modeNote = function (id) {
    var m = GSYS[id];
    if (!m) { return ''; }
    if (m.built === false) { return m.label + '模式未开发'; }
    if (m.on) { return m.label + '模式已启用'; }
    return m.label + '轨已完整保留，本版不启用';
  };

  /* ---------- boot 探针（L0：1×1 WebP 解码 + 2048 纹理绘制，一次性） ---------- */
  TA.probeEnv = function (cb) {
    if (TA.env) { cb(TA.env); return; }
    var r = { webp: false, tex2048: true };
    var im = new Image();
    im.onload = function () { r.webp = im.width === 1 && im.height === 1; next(); };
    im.onerror = function () { next(); };
    im.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
    function next() {
      try {
        var c = document.createElement('canvas');
        c.width = 2048; c.height = 2048;
        var g = c.getContext('2d');
        g.fillStyle = '#5E8C8A';
        g.fillRect(0, 0, 2048, 2048);
        r.tex2048 = g.getImageData(2047, 2047, 1, 1).data[2] === 138;
      } catch (e) { r.tex2048 = false; }
      TA.env = r;
      if (cb) { cb(r); }
    }
  };

  /* ---------- 帧时看门狗（L1：30 帧均值 >33ms 记慢；同类两连退 → 会话内降 vector） ---------- */
  TA.watchFeed = function (kind, avgMs) {
    if (avgMs > 33) {
      TA.slowKinds[kind] = (TA.slowKinds[kind] || 0) + 1;
      if (TA.slowKinds[kind] >= 2) { TA.slowKinds[kind + '_out'] = true; }
    } else {
      TA.slowKinds[kind] = 0;
    }
  };
  TA.kindOut = function (kind) { return !!TA.slowKinds[kind + '_out']; };

  /* ---------- 逐 assetKey 侦测（缓存 + 2s 超时；force-vector 直判 fail） ----------
   * ★2026-11-02 修「只看到占位」：
   *   旧版超时写的是 `finish('fail')`，而 fail 会被永久缓存（第 159 行直接短路），
   *   于是一张 2s 内没下完的图（慢网实测 2.3~3.1s）会让该角色**整局只剩矢量占位**，
   *   连网络恢复后重新 show 也不出图（实测 status 停在 fail、realNow=false）。
   *   现在分三态：
   *     ok       → 已解码，可直接画（imgs[key] 有图）
   *     fail     → 文件真的不可用（404 / 解码失败 / 矢量模式）：永久缓存，不再浪费请求
   *     timeout  → 只是慢：**不写 status**，调用方先画占位；图晚到则写回 ok 并回调 onLate
   *   `_inflight` 让超时后的重新 resolve 复用同一个 Image，不会重复发请求。 */
  TA._late = {};      /* key → [cb]：占位已在屏上、等晚到的图 */
  TA._inflight = {};  /* key → { im, cbs }：请求未决（含已超时但仍在下载） */
  TA._hot = {};       /* key → 1：**屏上正在等**的图。预取见到它就停手，先把带宽让出来 */

  TA.resolve = function (key, cb, opt) {
    var ent = TA.reg[key];
    if (!ent) { cb('none'); return; }
    if (TA.assetsMode() === 'vector') { TA.status[key] = 'fail'; cb('fail'); return; }
    if (TA.status[key]) { cb(TA.status[key]); return; }
    if (opt && opt.hot) { TA._hot[key] = 1; }
    if (TA._pending[key]) { TA._pending[key].push(cb); return; }
    var flight = TA._inflight[key];
    if (flight) { flight.cbs.push(cb); return; }   /* 已超时仍在下载：排队等它落地 */
    TA._pending[key] = [cb];
    var im = new Image();
    var done = false;
    function drain(stt) {
      delete TA._hot[key];
      var q = TA._pending[key] || [];
      delete TA._pending[key];
      for (var j = 0; j < q.length; j += 1) { q[j](stt); }
    }
    function finish(stt) {
      if (done) { return; }
      done = true;
      clearTimeout(to);
      TA.status[key] = stt;
      if (stt === 'ok') { TA.imgs[key] = im; delete TA._inflight[key]; }
      drain(stt);
      if (stt === 'ok') { fireLate(key); }
      else { delete TA._inflight[key]; delete TA._late[key]; }
    }
    function fireLate(k) {
      var q = TA._late[k] || [];
      delete TA._late[k];
      for (var j = 0; j < q.length; j += 1) { q[j]('ok'); }
    }
    var to = setTimeout(function () {
      if (done) { return; }
      done = true;                    /* 只结束「本轮回调」，不结束这次下载 */
      TA._inflight[key] = { im: im, cbs: [] };
      drain('timeout');
    }, 2000);
    im.onload = function () {
      var tooBig = TA.env && TA.env.tex2048 === false && Math.max(im.width, im.height) > 2048;
      if (done) {                     /* 超时后晚到：补写 ok，把屏上的占位原位升级 */
        delete TA._hot[key];
        if (tooBig) { return; }
        var f = TA._inflight[key];
        TA.status[key] = 'ok';
        TA.imgs[key] = im;
        delete TA._inflight[key];
        if (f) { for (var j = 0; j < f.cbs.length; j += 1) { f.cbs[j]('ok'); } }
        fireLate(key);
        return;
      }
      finish(tooBig ? 'fail' : 'ok');
    };
    im.onerror = function () {
      delete TA._hot[key];
      if (done) { delete TA._inflight[key]; delete TA._late[key]; return; }
      finish('fail');
    };
    im.src = ent.src;
  };
  /* 注册「图晚到」回调：只在该 key 已超时、仍在下载时有效（否则立刻回调）。 */
  TA.onLate = function (key, cb) {
    if (TA.status[key] === 'ok') { cb('ok'); return; }
    if (!TA._inflight[key]) { return; }      /* 没在下载 → 不会有晚到 */
    (TA._late[key] = TA._late[key] || []).push(cb);
  };
  /* 并发受控的批量预热：只排「还没解过」的 key，失败/超时都不阻塞队列。
   * opt = { conc: 3, done: fn }。与 resolve 共用同一条去重链，重复调用无副作用。 */
  TA.preload = function (keys, opt) {
    var q = (keys || []).filter(Boolean), i = 0, live = 0, waiting = false;
    var conc = Math.max(1, (opt && opt.conc) || 3);
    var done = opt && opt.done;
    var tick = opt && opt.tick;   /* 逐项进度：tick(settled, total, key, state) */
    var settled = 0;
    function pump() {
      if (i >= q.length && live === 0) { if (done) { done(settled, q.length); } return; }
      /* ★让路（2026-11-02）：屏上正有一张图在等 ⇒ 预取暂停，
       *   否则慢网下预取会和「玩家此刻要看的这张」抢连接（实测 500kbps 时
       *   预取 3 并发会把当前这张从 1.2s 拖到 3s+）。最多等 200ms 再看一次。 */
      if (Object.keys(TA._hot).length) {
        if (!waiting) { waiting = true; setTimeout(function () { waiting = false; pump(); }, 200); }
        return;
      }
      while (live < conc && i < q.length) {
        var k = q[i]; i += 1;
        if (!TA.reg[k] || TA.status[k] === 'ok') {
          settled += 1;
          if (tick) { tick(settled, q.length, k, TA.status[k] || 'none'); }
          continue;
        }
        live += 1;
        (function (kk) {
          TA.resolve(kk, function (stt) {
            live -= 1; settled += 1;
            if (tick) { tick(settled, q.length, kk, stt); }
            pump();
          });
        }(k));
      }
    }
    pump();
  };
  TA.reset = function (key) {   /* 运维/测试：手动解除失败缓存 */
    delete TA.status[key]; delete TA.imgs[key]; delete TA._late[key]; delete TA._inflight[key];
  };

  TA.image = function (key) { return TA.imgs[key] || null; };
  TA.state = function (key) { return TA.reg[key] ? (TA.status[key] || 'pending') : 'none'; };

  /* ---------- 素材体检（运维/实机排障用） ----------
   * 返回每个资源键的：登记路径、状态、解码尺寸、已耗时。
   * `miss` = 真的有问题的（fail / 无图），`okList` = 正常的。
   * 供「素材自检页」与 ?diag 面板直接消费，**不发新请求**（只看已发生的状态）。 */
  TA.diag = function (filter) {
    var okList = [], miss = [], pend = [];
    Object.keys(TA.reg).forEach(function (k) {
      if (filter && !filter.test(k)) { return; }
      var stt = TA.status[k] || 'pending';
      var im = TA.imgs[k];
      var row = { key: k, src: TA.reg[k].src, status: stt,
        w: im ? im.width : 0, h: im ? im.height : 0 };
      if (stt === 'ok' && im) { okList.push(row); }
      else if (stt === 'pending') { pend.push(row); }
      else { miss.push(row); }
    });
    return { env: TA.env, mode: TA.assetsMode(), ok: okList, miss: miss, pending: pend,
      total: okList.length + miss.length + pend.length };
  };

  /* 环境结论（给加载页做「不支持 WebP」这类明确提示，别再静默占位） */
  TA.envNote = function () {
    if (!TA.env) { return ''; }
    if (!TA.env.webp) { return '当前环境不支持 WebP，写实立绘无法显示'; }
    if (TA.env.tex2048 === false) { return '当前环境纹理上限不足 2048px'; }
    return '';
  };

  global.TQA = TA;
})(window);
