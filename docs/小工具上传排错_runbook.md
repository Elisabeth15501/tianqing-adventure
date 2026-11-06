# 小工具上传排错 Runbook

## 报错：「预览任务信息缺失，请重新上传」

### 先分清是哪一层

| 层 | 症状 | 判定方法 |
|---|---|---|
| 包内容 | 入口 html 错、缺资源、超限 | 本地校验（下表）+ CLI `upload --dry-run` |
| 上传会话 / 预览任务 | **「预览任务信息缺失」** | 包校验全过，但后台报任务缺失 |
| 内容审核 | 驳回理由指向素材/文案 | 审核意见 |

**这句话的字面含义是：后台找不到这次「预览」对应的部署任务记录**，不是包坏了。常见触发：

1. 上传中途断网/关页 → 文件没传完，任务没落库；
2. 同一页面重复点上传（前一次任务被消费掉，第二次拿不到任务）；
3. 两个标签页/两个端同时操作同一小工具，任务被覆盖；
4. **登录态过期**：token 失效后请求只完成了一半（文件到了、任务没建）；
5. 把 zip 拖进了「图标/封面」的投放区，或选的是解压后的文件夹。

### 一、包侧自检（每次改完代码都跑）

```bash
# 1) CRC 与结构
python - <<'PY'
import zipfile, os
p='tianqing-adventure-minitool-v1.1.10.zip'
z=zipfile.ZipFile(p)
print('CRC:', z.testzip() or 'OK')
print('条目:', len(z.namelist()))
print('根目录:', [n for n in z.namelist() if '/' not in n])
print('html:', [n for n in z.namelist() if n.endswith('.html')])
print('解压后: %.2f MiB' % (sum(i.file_size for i in z.infolist())/1048576))
PY

# 2) CLI 预检（不上传、不登录）
redapp upload --file "./tianqing-adventure-minitool-v1.1.10.zip" --type pkg --dry-run --agent
```

硬门槛（官方）：zip ≤ **10 MiB**；解压合计 ≤ **30 MiB**；根目录唯一 `index.html`；
`mini_tool.json` 只有 `{"is_high_consumption_scene": false}` 一个字段；仅 html/css/js/json/webp/png/jpg/svg/woff。

### 二、重传协议（按顺序，别跳）

1. **退出登录 → 重新登录**（网页端与 CLI 各一次，避免半失效 token）；
2. 关掉其它已打开的小工具后台标签页；
3. 刷新页面，确认「当前版本 / 草稿状态」；
4. 只点一次「上传代码包」，选 **zip 文件本身**（不是文件夹）；
5. 等进度到 100% 且出现「部署成功 / 版本号」，再点「预览」；
6. 预览二维码出来后再扫码；失败就**整页刷新重来**，不要在同一页面连点。

### 三、兜底：走 CLI（绕开网页任务状态）

```bash
redapp login --agent                                   # 扫码
redapp upload --file "./...zip" --type pkg --dry-run --agent
redapp upload --file "./...zip" --type pkg --confirm "<planHash>" --agent
# 记下 data.fileId 与 data.md5，写 preview.json：
# {"pkgFileId":"<id>","md5":"<32位>","appName":"天清往事","version":"1.1.10"}
redapp preview --source <来源> --file "./preview.json" --qr-out "./preview-qr.png" --agent
```

`source` 由服务端分配，不能自造。CLI 只做「上传 + 预览」，不代替送审。

### 四、本次实测记录（2026-11-07）

| 检查 | 结果 |
|---|---|
| CRC 153 条 | 全部通过 |
| 根目录 | `index.html`、`mini_tool.json` |
| html 数量 | 1（`index.html`，第一条目） |
| 扩展名 | webp 111 / json 25 / js 15 / html 1 / css 1，全在白名单 |
| 解压后 | 6.77 MiB（< 30） |
| 压缩后 | 6.17 MiB（< 10） |
| CLI dry-run | 出 planHash，md5 `fe6ee2b7…`，sha256 `8b8396c2…` |
| CLI 登录态 | **access token 已于 2026-11-02 过期**，config 要求重新扫码 |

结论：包没问题，问题在会话/任务层；且 CLI 侧确认账号需要重新授权。
