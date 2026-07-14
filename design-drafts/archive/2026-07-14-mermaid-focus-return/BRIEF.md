# Feature Brief: Mermaid 查看器焦点返回

## Goal

修复鼠标展开 Mermaid 查看器后按 `Escape` 退出时，放大按钮残留蓝色高亮的问题；同时审计查看器其他关闭路径和键盘焦点边界。

## Source Runtime Baseline

- `../../runtime-baseline/html/07-dark-color-compatibility.html`
- `../../runtime-baseline/html/08-light-color-compatibility.html`
- `../../runtime-baseline/fixture/docs/color-compatibility.md`

## States To Cover

- 指针打开 / 键盘打开
- `Escape` / 关闭按钮 / 遮罩关闭
- 指针路径切换到键盘导航后关闭
- `Tab` / `Shift+Tab` 焦点边界
- 深色 / 浅色主题

## Constraints

- DOM 焦点返回与可见焦点环分开处理。
- 键盘用户必须保留明确的焦点位置。
- 指针用户关闭后不能残留蓝色高亮。
- 查看器保持真正的模态焦点语义，不影响缩放、拖动和滚轮行为。

## Confirmed Direction

- 所有关闭路径都恢复 DOM 焦点。
- 可见焦点环由查看器会话中的有效交互方式决定。
- 查看器补齐焦点循环和背景不可聚焦约束。
