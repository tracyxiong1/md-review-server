# Mermaid 查看器焦点审计

## Scope

审计 Mermaid 查看器从入口打开、查看器内聚焦到三种关闭路径的焦点行为。

## Evidence

1. `screenshots/01-initial.png`：初始页面无残留焦点样式。
2. `screenshots/02-pointer-open.png`：指针打开后关闭按钮持有 DOM 焦点，初始焦点环被抑制。
3. `screenshots/03-pointer-open-escape-close.png`：指针打开后按 `Escape`，入口获得 `2px` 蓝色 outline。
4. `screenshots/05-pointer-close.png`：鼠标点击关闭按钮后，焦点落到 `BODY`。
5. `screenshots/07-backdrop-close.png`：点击遮罩关闭后，焦点落到 `BODY`。

## Findings

### Confirmed

- `Escape` 被统一上报为 `keyboard` 关闭，父组件无条件聚焦入口，导致指针打开路径也显示 `:focus-visible`。
- 鼠标关闭按钮和遮罩关闭不恢复入口焦点；原先聚焦的关闭按钮卸载后，活动焦点变为 `BODY`。
- 指针打开时关闭按钮的初始焦点环抑制工作正常。
- 查看器声明 `aria-modal="true"`，但背景根节点没有 `inert` / `aria-hidden`，组件也没有焦点循环逻辑；背景控件仍位于可聚焦集合中。

### Existing Contract

- 当前组件测试明确要求：鼠标关闭不恢复入口焦点，`Escape` 关闭恢复入口焦点并显示焦点环。
- 已处理评论标记弹层没有主动重设焦点，关闭时触发按钮仍保留自然焦点，不会走 Mermaid 的错误链路。

## Recommendation

- 所有关闭路径都把 DOM 焦点恢复到对应入口。
- 纯指针路径静默恢复焦点，不显示焦点环或仅由真实 hover 决定外观。
- 键盘打开或已在查看器内进行键盘导航的路径，恢复入口焦点并显示焦点环。
- `Escape` 本身不把“鼠标打开且未键盘导航”的会话升级成键盘模式。
- 查看器打开时约束焦点在四个工具栏按钮内，并让背景不可聚焦。

## Evidence Limits

- 本次浏览器控制环境无法可靠驱动原生 `Tab` 默认焦点移动。焦点越界风险依据实时 DOM、活动元素和组件实现确认；实现后需要通过组件测试与人工键盘复查验证焦点循环。
- 深色主题的用户截图已证明同一 outline 问题；本次保存的可复现审计截图使用浅色运行态。
