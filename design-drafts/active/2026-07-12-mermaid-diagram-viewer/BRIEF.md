# Feature Brief: Mermaid 大图查看器

## Goal

长时序图和宽流程图在正文中适应容器宽度后文字过小。用户需要在不改变文档阅读布局的前提下查看细节。

## Source Runtime Baseline

- `design-drafts/runtime-baseline/`
- 用户提供的 `repository-architecture.v3.md` 页面截图
- 当前 `src/components/MermaidBlock.tsx` 与 `src/styles/markdown.css`

## States To Cover

- 正文静态预览
- 查看器打开与关闭
- 适应窗口、放大、缩小
- 鼠标拖动、触控板平移和捏合缩放
- 浅色与深色主题
- Mermaid 渲染失败

## Constraints

- 正文图表不拦截页面滚动。
- 查看器覆盖当前视口，不改变文档和侧栏布局。
- 复用现有紧凑按钮、圆角、边框和中性配色。
- 支持键盘关闭、可见焦点和减少动态效果偏好。
- 不引入新的运行时依赖。

## Open Questions

- 无。方案 A 已由用户确认。
