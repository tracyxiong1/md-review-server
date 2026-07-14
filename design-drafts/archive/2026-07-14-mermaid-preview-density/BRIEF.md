# Feature Brief: Mermaid 正文预览密度

## Goal

压缩 Mermaid 正文预览上下两层留白，保持独立操作区、图表尺寸和现有暗色与浅色层级。

## Source Runtime Baseline

- `design-drafts/runtime-baseline/`
- 用户提供的“6.6.2 消除笔”页面截图
- 当前 `src/styles/markdown.css`
- 当前 `src/components/MermaidBlock.tsx`

## States To Cover

- 宽时序图正文预览
- 普通流程图正文预览
- 放大按钮默认、悬停和键盘焦点状态
- 浅色与深色主题
- 窄视口下的正文预览

## Constraints

- 放大按钮保留在图表上方的独立操作区，不覆盖 SVG 内容。
- 图表不缩放，不修改 Mermaid 输出尺寸。
- 只调整垂直间距，水平 padding、圆角、边框和颜色保持不变。
- 间距使用现有 4px 基础尺度。
- 焦点反馈使用同批次的输入方式修复方案。

## Open Questions

- 无。用户已确认采用独立操作区的紧凑方案。
