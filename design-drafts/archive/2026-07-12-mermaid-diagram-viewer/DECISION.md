# Decision: Mermaid 大图查看器

## Final Direction

Mermaid 正文预览右上角增加“放大查看”入口。入口打开覆盖当前视口的图表查看器，查看器支持适应窗口、25% 至 400% 缩放、鼠标拖动、普通滚轮或触控板平移、组合滚轮或触控板捏合缩放，以及关闭后的焦点恢复。

## Why

正文预览继续承担文档阅读职责，不注册缩放手势。复杂图表的二维导航集中在独立查看器中，避免页面滚动与图表缩放冲突。文字入口比整图点击和单独图标具有更明确的动作语义。

## Superseded

- 整图点击：点击语义与正文阅读、文本选择和滚动区域重叠。
- 极简展开图标：首次使用的可发现性不足，手势说明依赖用户经验。

## Landed In

- `src/components/MermaidBlock.tsx`
- `src/components/MermaidDiagramViewer.tsx`
- `src/lib/diagramViewport.ts`
- `src/styles/markdown.css`
- 对应的组件测试和数学模型测试

## Verification

- 相关自动化测试：15 项通过。
- JS 与 CSS lint：通过。
- TypeScript 与 Vite 生产构建：通过。
- 目标页面：`repository-architecture.v3.md`。
- 运行时状态：5.3 长时序图以 51% 适应窗口；工具栏放大到 76%；鼠标拖动和普通触控板平移更新二维位移；关闭后恢复页面滚动与入口焦点。
- 组合滚轮缩放由组件测试覆盖；浏览器自动化无法稳定合成操作系统级捏合事件。

## Baseline Updated

否。现有 `runtime-baseline` 使用仓库内固定 fixture，未包含本次验证所需的长时序图。此次验证使用用户目标文档完成，未把工作区外的架构文档复制到仓库。后续扩展固定 fixture 时应增加长时序图的查看器打开态。
