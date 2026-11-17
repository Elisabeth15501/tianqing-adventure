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

  var TA = { reg: {}, status: {}, imgs: {}, srcs: {}, _lru: [], env: null, slowKinds: {},
    _pending: {}, _failAt: {}, _retryN: {}, _retryTimer: {} };
  /* ★2026-11-17 真机修复：fail 不再是「一锤定音」。
   * 小工具 WebView 里一次瞬时的解码失败（内存抖动/并发峰值）会把图永久钉死为 fail，
   * 之后整局不再重试 ⇒ 用户看到「从某章节起成批素材永久回退」。
   * 现在：fail 带冷却时间，冷却过后下次 resolve 自动重新发起（可恢复）；
   *       重试有次数上限，真 404 不会无限重试。
   * ★不做 ?r=N 查询串重试：容器里资产是 zip 内同源相对路径，加查询串会变成
   *   另一个 URL（本地资源加载器/CSP 可能直接拒绝）——治愈反而致残。 */
  var FAIL_COOLDOWN = 2500;   /* ms：fail 后多久允许自动重试 */
  var MAX_RETRY = 3;          /* 单 key 自动重试上限（每次失败 markFail 计 1） */
  /* ★2026-11-17：容器内只保留最近 N 张**解码位图**。
   * 33 张立绘全量 decode ≈ 176MiB、49 张瓷片 ≈ 131MiB（RGBA8 估算）；
   * 桌面浏览器无感，小工具 WebView 到中后段就会因内存压力让新图 onerror ⇒ 回退角标。
   * 路径常驻（srcs）、位图按 LRU 淘汰：需要时 resolve 会按路径静默重载。 */
  var CACHE_LIMIT = (global.xhs && global.xhs.miniTool) ? 6 : 20;
  function touch(key) {
    var q = TA._lru, at = q.indexOf(key);
    if (at >= 0) { q.splice(at, 1); }
    q.push(key);
    while (q.length > CACHE_LIMIT) { delete TA.imgs[q.shift()]; }
  }
  function remember(key, im, src) {
    TA.srcs[key] = src;
    TA.imgs[key] = im;
    touch(key);
  }
  TA.src = function (key) { return TA.srcs[key] || (TA.imgs[key] && TA.imgs[key].src) || null; };
  TA.release = function (key) {
    delete TA.imgs[key];
    var at = TA._lru.indexOf(key);
    if (at >= 0) { TA._lru.splice(at, 1); }
  };
  TA.releasePortrait = TA.release;

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

  function markFail(key) {
    TA.status[key] = 'fail';
    TA._failAt[key] = Date.now();
    TA._retryN[key] = (TA._retryN[key] || 0) + 1;
    /* ★2026-11-18：旧版冷却重试只在「下一次 resolve」才发生。
     * 但屏上的矢量占位/破图不会自己去 resolve —— 玩家停在这一幕时，
     * 一次瞬时失败就被永久看见（史官线午时起成批回退、指定编号瓷片始终是纯色多边形）。
     * 有等待者时主动排一次重取，成功后由 onLate 回调让 UI 原位升级。 */
    if ((TA._late[key] || []).length) { scheduleRetry(key); }
  }
  function scheduleRetry(key) {
    if (TA._retryTimer[key]) { return; }
    if ((TA._retryN[key] || 0) >= MAX_RETRY) { return; }
    var wait = Math.max(60, FAIL_COOLDOWN - (Date.now() - (TA._failAt[key] || 0)));
    TA._retryTimer[key] = setTimeout(function () {
      delete TA._retryTimer[key];
      if (TA.status[key] !== 'fail' || !TA.reg[key]) { return; }
      if ((TA._retryN[key] || 0) >= MAX_RETRY) { return; }
      delete TA.status[key];
      TA.resolve(key, function (stt) {
        if (stt === 'ok') {
          var q = TA._late[key] || [];
          delete TA._late[key];
          for (var i = 0; i < q.length; i += 1) { q[i]('ok'); }
        } else if (stt === 'fail' && (TA._late[key] || []).length) {
          scheduleRetry(key);   /* onerror 里 markFail 已排，但 timeout/其他分支兜底 */
        }
      });
    }, wait);
  }
  /* 运维/自动化：解除某个 key 的失败缓存，下次 resolve 立即重取（不等待冷却） */
  TA.retry = function (key) {
    if (TA._retryTimer[key]) { clearTimeout(TA._retryTimer[key]); delete TA._retryTimer[key]; }
    delete TA.status[key]; delete TA._failAt[key]; delete TA._retryN[key];
    delete TA._inflight[key]; delete TA._late[key]; delete TA._pending[key];
  };

  TA.resolve = function (key, cb, opt) {
    var ent = TA.reg[key];
    if (!ent) { cb('none'); return; }
    if (TA.assetsMode() === 'vector') { TA.status[key] = 'fail'; cb('fail'); return; }
    if (TA.status[key]) {
      /* LRU 淘汰过位图但路径还在：按原相对路径静默重载，调用方仍只收到 ok/fail。
       * ★必须用 TA.srcs 的相对路径，不用 im.src 的绝对 URL（容器 CSP 可能拒绝）。 */
      if (TA.status[key] === 'ok' && !TA.imgs[key] && TA.srcs[key]) {
        var again = new Image();
        again.onload = function () { remember(key, again, TA.srcs[key]); cb('ok'); };
        again.onerror = function () { markFail(key); cb('fail'); };
        again.src = TA.srcs[key];
        return;
      }
      if (TA.status[key] === 'fail') {
        /* ★冷却后自动重试：瞬时解码失败不该把资源钉死一整局。
         * 超过上限（真 404）才彻底放弃，避免无意义请求。 */
        var last = TA._failAt[key] || 0;
        if ((TA._retryN[key] || 0) < MAX_RETRY && (Date.now() - last) >= FAIL_COOLDOWN) {
          delete TA.status[key];
          /* 落到下方正常加载流程 */
        } else { cb('fail'); return; }
      } else { cb(TA.status[key]); return; }
    }
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
      if (stt === 'ok') {
        TA.status[key] = 'ok';
        TA._retryN[key] = 0;              /* 成功即清零重试史 */
        remember(key, im, ent.src); delete TA._inflight[key];
      } else { markFail(key); }
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
        remember(key, im, ent.src);
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
      /* ★2026-11-17：这里不再即时改 im.src 重试。原因有二：
       *   ① 容器内资产是同源相对路径，追加 ?r=1 会变成新 URL，本地加载器/CSP 可能直接拒；
       *   ② 即时重试会与下方「冷却重试」共用 TA._retryN，把次数耗尽 ⇒ 冷却重试永不触发。
       * 统一的恢复路径只有一个：markFail → 冷却 2.5s → 下次 resolve 自动重来（见上方）。 */
      finish('fail');
    };
    im.src = ent.src;
  };
  /* 注册「图晚到 / 失败后重试成功」回调：
   * ① 已 ok → 立即回调（调用方原位升级）
   * ② 还在下载 → 挂到 _late，等 onload 补写
   * ③ **fail → 也挂上，并主动排一次冷却重试**（2026-11-18 新增）
   * 旧版第 ③ 种直接 return，玩家停在屏上的占位永远等不到升级。 */
  TA.onLate = function (key, cb) {
    if (TA.status[key] === 'ok') { cb('ok'); return; }
    (TA._late[key] = TA._late[key] || []).push(cb);
    if (TA.status[key] === 'fail') { scheduleRetry(key); }
  };

  /* ★★★ 2026-11-18 统一素材加载入口（女官线 / 史官线共用，杜绝加载逻辑漂移）★★★
   * 背景：立绘（portraits.js）与瓷片 / 场景回退（frag.js）过去各写一套 resolve + 三态
   * 处理，结果两边「失败后怎么办」不一致 —— 立绘后来补了 fail→onLate 重试，瓷片却还在
   * fail 分支画完矢量就 return，于是真机一次瞬时解码失败 = 该瓷片整局停在「预设图样」。
   * 这正是「史官线 4/6/7/8/9/10/12/13/15/16 号瓷片加载不出、女官线却正常」的根因：
   *   不是资源缺失（同一批文件），而是两条线触发的失败时序不同，回退路径又各自为政。
   *
   * 现在把三态决策 + 失败自恢复收敛到这一个函数，两类素材都调它，行为必然同步：
   *   handlers.ready(img, ent)  图可用（首次命中 / 晚到 / 冷却重试成功，都会调）
   *   handlers.pending(stt)     只是慢（timeout）：调用方应先画矢量占位兜住
   *   handlers.fail(stt)        真失败（fail/none）：调用方画占位 + 可挂自有角标
   * 无论 pending 还是 fail，都统一挂 onLate —— 图晚到或冷却重试成功后，ready 会被
   * 再次调用，调用方只要在这里「原位替换」即可，占位不会永久钉死。
   * 返回 cancel()：节点卸载/换代时调用，避免旧节点的迟到回调污染新画面。 */
  TA.observe = function (key, handlers, opts) {
    var h = handlers || {};
    var dead = false;
    function ready() {
      if (dead) { return; }
      var img = TA.image(key);
      if (img && h.ready) { h.ready(img, TA.reg[key]); }
    }
    function watchLate() {
      if (dead) { return; }
      TA.onLate(key, function (st) { if (st === 'ok') { ready(); } });
    }
    TA.resolve(key, function (stt) {
      if (dead) { return; }
      if (stt === 'ok') { ready(); return; }
      if (stt === 'timeout') { if (h.pending) { h.pending(stt); } }
      else { if (h.fail) { h.fail(stt); } else if (h.pending) { h.pending(stt); } }
      watchLate();      /* fail 也挂：由 onLate 触发冷却重试，成功后 ready 原位升级 */
    }, opts || { hot: true });
    return function () { dead = true; };
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
    if (TA._retryTimer[key]) { clearTimeout(TA._retryTimer[key]); delete TA._retryTimer[key]; }
    delete TA.status[key]; delete TA.imgs[key]; delete TA.srcs[key];
    delete TA._late[key]; delete TA._inflight[key]; delete TA._failAt[key]; delete TA._retryN[key];
    var at = TA._lru.indexOf(key);
    if (at >= 0) { TA._lru.splice(at, 1); }
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
      if (stt === 'ok' && (im || TA.srcs[k])) { okList.push(row); }
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
