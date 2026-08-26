# AI Career IP Content OS

用一个可版本控制的**内容包**，检查一个核心主题是否可以交给内容主理人做最终发布决定。它服务于“普通职场人用 AI 提升职业能力”为主、产品经理进阶为辅的公开个人 IP；系统只做准备度检查，不替主理人表达、互动或发布。

## 从起步包开始

复制起步包，填入本周的一个核心主题：

```powershell
Copy-Item templates/content-package-starter.json my-content-package.json
npm run content:check -- my-content-package.json
```

起步包故意会得到 `incomplete`。逐项补齐下面的字段，再由内容主理人做审批。

## 内容包字段

| 区域 | 必填内容 | 通过条件 |
| --- | --- | --- |
| `coreTheme` | `careerProblem`、`demonstration`、`judgement` | 分别写清职业问题、可观察的演示和你的判断。 |
| `platformVersions` | 小红书、抖音、视频号、B 站各一个版本 | `platform` 只能是 `xiaohongshu`、`douyin`、`video-account`、`bilibili`，每项都要有 `releaseApproval: "approved"` 才能公开。 |
| `basicAsset` | `name`、`reference`、`visibility` | 必须是一项 `visibility: "public"` 的基础资产，例如可试用模板、简版工作流或公开复盘。 |
| `paidVideoGenerationBrief` | 仅在需要付费视频时填写 | 默认 `isRequired: false`；需要付费视频时遵循下面的门禁。 |

发布审批 `releaseApproval` 只允许某个平台版本公开；它不会授权付费模型调用。

## 付费视频生成门禁

录屏、代码或产品原型已经能完成演示时，保持 `isRequired: false`。只有确实需要付费视频时才设为 `true`，并提供：

- `purpose`：为什么必须使用付费视频；
- `quantity`：正数，表示计划生成数量；
- `acceptanceCriteria`：可验收的结果应该展示什么；
- `costEstimate`：正数，表示预计成本；
- `stopCondition`：何时停止尝试；
- `paidVideoGenerationBriefApproval: "approved"`：内容主理人对这一笔付费简报的明确许可。

`paidVideoGenerationBriefApproval` 是**付费视频生成简报审批**，与平台版本的 `releaseApproval` 是两类不同的审批。该检查器绝不会调用 Minimax H3 或其他付费视频模型。

## 可运行示例

| 场景 | 命令 | 预期 `status` |
| --- | --- | --- |
| 全部就绪 | `npm run content:check -- fixtures/ready-content-package.json` | `ready` |
| 结构不完整 | `npm run content:check -- fixtures/incomplete-content-package.json` | `incomplete` |
| 等待发布审批 | `npm run content:check -- fixtures/awaiting-owner-approval-content-package.json` | `awaiting-owner-approval` |
| 被付费视频门禁阻塞 | `npm run content:check -- fixtures/blocked-by-paid-video-gate-content-package.json` | `blocked-by-paid-video-gate` |

四个示例都由自动化测试执行，避免文档与实际输出脱节。

## 怎样阅读检查报告

报告先给出总 `status`，再给出 `missing`、`paidVideoGenerationBriefStatus` 和
`platformVersionStatuses`。后者始终包含四个平台，每个状态为：

- `missing`：该平台版本尚未登记；
- `awaiting-release-approval`：已有平台版本，但仍需内容主理人做 `releaseApproval`；
- `approved`：该平台版本已获发布审批。

`nextStep` 只指出当前最高优先级的一步，可能是补全内容包、补全或审批付费视频简报、审批平台版本，或 `ready-for-owner-release-decision`。因此内容包即使有多个待办，也会先处理最阻塞发布的一类工作。

## 公开基础资产与未来会员资产

首版只登记和检查公开的**基础资产**：模板、简版工作流、示例或复盘。完整 SOP、进阶工作流、成套模板和答疑属于未来的**会员资产**；本仓库不交付会员权益，也不包含支付、客服或社群功能。

## 首版边界

这个检查器只为内容主理人的每日集中审批做准备。它不会：

- 发布到小红书、抖音、视频号或 B 站；
- 自动回复评论、私信、销售或代替主理人公开表达；
- 生成或购买付费视频；
- 交付会员内容、处理支付或保存真实客户资料。

运行全部回归测试：

```powershell
npm test
```
