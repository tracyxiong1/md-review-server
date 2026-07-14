# Decision: Mermaid 查看器焦点反馈

## Final Direction

查看器按入口和关闭操作的输入方式维护焦点反馈：

- 鼠标打开时，关闭按钮接收 DOM 焦点，初始焦点环被局部抑制。
- 鼠标点击关闭按钮或遮罩时，查看器关闭，不把焦点恢复到放大入口。
- 键盘打开时，关闭按钮保留现有 `2px` 蓝色焦点环。
- `Escape` 或键盘激活关闭按钮时，焦点恢复到放大入口，并保留现有 `2px` 蓝色焦点环。
- 鼠标打开后的关闭按钮一旦经过键盘离焦，初始抑制状态结束；再次获得键盘焦点时恢复正常焦点环。

该方案保留对话框打开后的真实焦点转移，不修改查看器的缩放、拖动、滚轮和布局行为。

## Verification

- `pnpm test`：24 个测试文件、152 个测试全部通过。
- `pnpm lint`、`pnpm fmt:check`、`pnpm build` 均以退出码 0 完成。
- 运行时鼠标打开：关闭按钮持有 DOM 焦点，`data-suppress-focus-ring="true"`，无可见 outline。
- 运行时鼠标关闭按钮和遮罩关闭：查看器关闭，放大入口不持有焦点且无可见 outline。
- 运行时键盘打开：关闭按钮持有焦点，outline 为 `2px solid rgb(47, 111, 214)`。
- 运行时 `Escape` 和键盘激活关闭按钮：放大入口重新持有焦点，outline 为 `2px solid rgb(47, 111, 214)`。
- 鼠标打开后通过键盘循环重新聚焦关闭按钮：`data-suppress-focus-ring="false"`，正常蓝色焦点环恢复。

## Landed In

- `1c82ea58 fix: preserve mermaid viewer input modality`
- `bc7c6643 fix: restore mermaid trigger focus for keyboard closes`
- `0b143fa3 test: harden mermaid focus suppression`
- `980126f9 test: harden mermaid style contracts`
- `a37d963d test: keep mermaid style test self-contained`
- 主要实现位于 `src/components/MermaidBlock.tsx`、`src/components/MermaidDiagramViewer.tsx` 和 `src/styles/markdown.css`。

## Baseline Updated

- 更新 `design-drafts/runtime-baseline/07-dark-color-compatibility.png` 和 `08-light-color-compatibility.png`。
- 同步更新两份冻结全页 HTML、两份 `#root` 片段和 `cases.json` 中 07/08 的运行时指标。
- 基线视口保持 `1280×720`，深色与浅色状态均使用运行中的 fixture 捕获。
