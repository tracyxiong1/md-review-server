# Decision: Mermaid 正文预览密度

## Final Direction

正文 Mermaid 预览采用独立操作区的紧凑间距：

- 外层预览 padding 调整为 `36px 16px 4px`。
- 内层图表 padding 调整为 `8px 16px`。
- 放大按钮顶部位置调整为 `4px`，按钮仍位于图表上方的独立操作区。
- 水平 padding、圆角、边框、颜色和 Mermaid 输出尺寸保持不变。

## Verification

- `pnpm test`：24 个测试文件、152 个测试全部通过。
- `pnpm lint`、`pnpm fmt:check`、`pnpm build` 均以退出码 0 完成。
- 变更前样式口径：顶部为 `48px + 16px + 2px` 边框，共 `66px`；底部为 `16px + 16px + 2px` 边框，共 `34px`。
- 当前运行时实测：顶部为 `46px`，其中 scoped padding 为 `44px`、边框为 `2px`；底部为 `14px`，其中 scoped padding 为 `12px`、边框为 `2px`。
- 放大按钮底部与内层图表顶部间距为 `4px`，两者无重叠。
- 时序图 SVG 保持 `666×277.5px`；流程图 SVG 保持 `666×134.875px`。
- 07/08 第一张 Mermaid 容器由 `700×311.5px` 调整为 `700×295.5px`，第二张由 `700×168.875px` 调整为 `700×152.875px`。宽度和 SVG 几何未变化。

## Landed In

- `6e2a20d3 style: compact mermaid preview spacing`
- `980126f9 test: harden mermaid style contracts`
- `a37d963d test: keep mermaid style test self-contained`
- 样式实现位于 `src/styles/markdown.css`，约束测试位于 `src/styles/markdown.test.ts`。

## Baseline Updated

- 更新 `design-drafts/runtime-baseline/07-dark-color-compatibility.png` 和 `08-light-color-compatibility.png`。
- 同步更新两份冻结全页 HTML、两份 `#root` 片段和 `cases.json` 中 07/08 的容器尺寸与纵向位置。
- 07/08 第一张 Mermaid 容器纵坐标由 `328.7421875px` 更新为 `324.7421875px`，第二张由 `773.1875px` 更新为 `713.1875px`。
- 基线视口保持 `1280×720`，深色与浅色状态均使用运行中的 fixture 捕获。
