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
  TA.assetsMode = function () { return lsGet('tq_assets_mode', 'auto'); }; /* auto | vector */
  TA.tifa = function () { return lsGet('tq_tifa', 'gongxing'); };         /* gongxing | jie */
  TA.tifaJie = function () { return TA.tifa() === 'jie'; };
  TA.setSetting = function (k, v) { lsSet(k, v); };

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

  /* ---------- 逐 assetKey 侦测（缓存 + 2s 超时；force-vector 直判 fail） ---------- */
  TA.resolve = function (key, cb) {
    var ent = TA.reg[key];
    if (!ent) { cb('none'); return; }
    if (TA.assetsMode() === 'vector') { TA.status[key] = 'fail'; cb('fail'); return; }
    if (TA.status[key]) { cb(TA.status[key]); return; }
    if (TA._pending[key]) { TA._pending[key].push(cb); return; }
    TA._pending[key] = [cb];
    var im = new Image();
    var done = false;
    function finish(stt) {
      if (done) { return; }
      done = true;
      TA.status[key] = stt;
      if (stt === 'ok') { TA.imgs[key] = im; }
      var q = TA._pending[key];
      delete TA._pending[key];
      for (var j = 0; j < q.length; j += 1) { q[j](stt); }
    }
    var to = setTimeout(function () { finish('fail'); }, 2000);
    im.onload = function () {
      clearTimeout(to);
      var tooBig = TA.env && TA.env.tex2048 === false && Math.max(im.width, im.height) > 2048;
      finish(tooBig ? 'fail' : 'ok');
    };
    im.onerror = function () { clearTimeout(to); finish('fail'); };
    im.src = ent.src;
  };

  TA.image = function (key) { return TA.imgs[key] || null; };
  TA.state = function (key) { return TA.reg[key] ? (TA.status[key] || 'pending') : 'none'; };

  global.TQA = TA;
})(window);
