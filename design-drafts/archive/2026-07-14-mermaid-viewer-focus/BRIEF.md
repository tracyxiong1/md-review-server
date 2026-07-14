# Feature Brief: Mermaid 查看器焦点反馈

## Goal

修复 Mermaid 大图查看器在鼠标打开或关闭后残留蓝色焦点样式的问题，同时保留键盘用户所需的可见焦点和关闭后的焦点恢复。

## Source Runtime Baseline

- `design-drafts/runtime-baseline/`
- 用户提供的 Mermaid 时序图页面截图
- 当前 `src/components/MermaidBlock.tsx`
- 当前 `src/components/MermaidDiagramViewer.tsx`
- 当前 `src/styles/markdown.css`

## States To Cover

- 鼠标点击入口打开查看器
- 键盘激活入口打开查看器
- 鼠标点击关闭按钮
- 鼠标点击遮罩关闭查看器
- `Escape` 关闭查看器
- 键盘激活关闭按钮
- 已处理评论标记等其他浮层入口的回归检查

## Constraints

- 鼠标操作不显示额外焦点环。
- 键盘进入查看器后显示可见焦点。
- 键盘关闭查看器后将焦点恢复到“放大查看”入口。
- 查看器打开时始终把实际焦点移入对话框，保持对话框的无障碍行为。
- 不删除或全局弱化现有 `:focus-visible` 样式。
- 不改变 Mermaid 查看器的布局、缩放、拖动和滚轮交互。

## Open Questions

- 无。输入方式对应的焦点反馈已由用户确认。
