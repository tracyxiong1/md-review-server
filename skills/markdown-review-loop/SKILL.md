---
name: markdown-review-loop
description: 运行面向 Codex 的 Markdown 文档评审循环，提供浏览器可视化预览、选区批注、评论收集、下一版修订稿生成和评论状态跟踪。适用于用户要求可视化评审 Markdown、打开浏览器批注文档、启动评审、继续评审、读取评论、应用评论、生成下一版 Markdown、处理 md-review-server 评论或维护 Markdown review queue 的场景。
---

# Markdown Review Loop

## 目标

使用本 skill 帮助用户以稳定流程迭代 Markdown 文档：

1. 创建或识别一个版本化 Markdown 草稿。
2. 启动或复用本地 `md-review-server` 评审会话。
3. 通过 review HTTP API 读取 `open` 评论；API 不可用时使用粘贴评论作为降级路径。
4. 根据评论生成下一版 Markdown，不覆盖历史版本。
5. 汇总每条评论的处理结果，并通过 HTTP API 回写状态。

该流程面向 Codex 协作场景。默认让用户只在浏览器中选区批注，由 Codex 负责启动服务、读取评论、生成新版本和回写状态。

## 启动评审

当用户要求启动 Markdown 评审循环时，按以下步骤处理：

1. 确认源 Markdown 文档。
2. 如果文档尚不存在，创建版本化文件，例如 `topic.v1.md`。
3. 保留旧版本。生成 `v2`、`v3` 时不要覆盖 `v1`。
4. 本地执行可用时，优先尝试静默更新本 skill；更新失败时继续使用当前本地版本：

```bash
npx -y md-review-server@latest skill update --quiet
```

5. 自动启动 `md-review-server`。迭代评审优先服务父目录，使新生成的 `v2`、`v3` 可在文件树中直接切换：

```bash
npx md-review-server path/to/docs --port 3030 --active-file path/to/docs/document.v1.md
```

6. 如果任务只涉及单文件且目录模式会增加歧义，可以使用文件模式：

```bash
npx md-review-server path/to/document.v1.md --port 3030
```

7. 将 `3030` 视为首选起始端口，不视为固定端口。`md-review-server` 会在请求端口被占用时自动尝试后续端口，服务输出会打印实际 URL。后续链接和 API 调用必须使用实际端口。
8. 只有在确认已有 `md-review-server` 服务正在服务正确文件或父目录时，才复用已有服务。
9. 回复用户时，用文档文件名作为 Markdown 链接文本，不直接暴露裸 URL。目录模式下链接应包含 `?file=<document>`，便于用户直接打开目标文件。

生成新版本后保持评审面可继续使用：如果父目录已在服务中，提示用户选择新文件；否则为新文件启动新的 review session。

## 读取评论

当用户表示评论已准备好时，按以下顺序读取：

1. 优先使用当前 review HTTP API。先请求 `GET /api/session`，确认服务根目录、active file 和 reviewDir。
2. 使用服务实际端口读取 `open` 评论：

```bash
curl 'http://127.0.0.1:<port>/api/comments?file=<document>&status=open'
```

3. 将 API 评论转换为评审项：
   - `selectedText` 对应 `quote`
   - `startLine` / `endLine` 对应源行范围
   - `startOffset` / `endOffset` 与 `beforeText` / `afterText` 用作长行局部定位
   - `comment` 对应评审指令
   - `replies` 对应该评论下的历史回复；如果有最新的 `user` 回复，应将其视为用户确认或补充说明。
4. HTTP API 不可用时，要求用户粘贴复制出的评论或 review queue。
5. 粘贴评论缺少选区文本时，仍可按行号处理；如果评论只要求修改长行中的局部内容且定位有歧义，应要求用户提供精确 quote。

读取评论不会消费评论。只有在下一版 Markdown 已生成并形成处理结论后，才回写评论状态。

## 多轮评审

评审循环必须支持连续多轮，不把一次处理视为流程终点：

- 每一轮都只读取当前目标文档的 `open` 评论作为待处理输入；`resolved`、`ignored` 和历史 `targetFile` 评论只作为上下文或可视化痕迹，不再当作待办。
- 用户可以在 `v2`、`v3` 等任意最新版上继续新增评论。后续轮次继续从该文件读取 `open` 评论，并生成下一版或在原评论下回复。
- 问答型评论如果不需要修改文档，可以在当前文件内追加 Codex 回复并标记 `resolved`，`targetFile` 可以等于当前文件。这类 Done 评论不阻塞用户继续添加新评论。
- 用户在评论区对已 `resolved` 评论追加回复时，该评论会重新变为 `open`。下一轮应把最新的 `user` 回复视为新的有效输入，并结合原评论与历史 Codex 回复理解上下文。
- 同一行可能同时有上一轮处理痕迹和本轮新 open 评论。页面会把这些 marker 堆叠为同一个行标记和数量徽标；Codex 仍只处理 open 评论。
- 如果某条评论需要用户确认，保持 `status: "open"` 并追加 Codex 回复。用户补充后，同一条评论继续进入下一轮处理，不要创建替代状态。

## 应用评论

应用评论时按以下规则处理：

1. 修改前读取目标 Markdown 文件。
2. 创建下一版本文件：
   - `name.v1.md` -> `name.v2.md`
   - `name.v2.md` -> `name.v3.md`
3. 如果源文件未版本化，优先创建 `name.v1.md`；如果该选择不符合用户语境，可创建 `name.reviewed.md` 并说明原因。
4. 将改动限制在评论指向的范围：
   - 有 `quote` 时，只修改目标行范围内匹配的选区文本。
   - `quote` 出现多次时，用行范围和上下文作为定位依据。
   - 仍存在歧义时，不修改文档，不消耗评论，追加 Codex 回复请用户确认，并保持 `status: "open"`。
   - 无 `quote` 时，按行范围处理。
5. 除非评论明确要求调整结构，否则保持原文档结构。
6. 除非评论明确指向事实、引用或代码块，否则保留这些内容。
7. 不静默丢弃评论。每条评论都必须出现在处理结果中。

评论意图按以下规则判断，不要求用户手动选择类型：

- 清晰的问题：直接在评论下追加 Codex 回复回答问题，通常不修改文档；如果已完整回答，标记为 `resolved`。
- 清晰的优化项：修改下一版 Markdown，追加 Codex 回复说明已处理，并标记为 `resolved`。
- 信息不足或意图不清：追加 Codex 回复询问用户希望如何处理，保持 `open`，不要生成无把握的文档修改。

## 回写评论状态

生成下一版 Markdown 后，通过 review HTTP API 回写每条已处理评论。优先使用批量 PATCH：

```bash
curl -X PATCH 'http://127.0.0.1:<port>/api/comments' \
  -H 'Content-Type: application/json' \
  -d '{
    "updates": [
      {
        "id": "c001",
        "file": "docs/example.v1.md",
        "status": "resolved",
        "targetFile": "docs/example.v2.md",
        "targetStartLine": 42,
        "targetEndLine": 44,
        "targetSelectedText": "一致性边界说明",
        "resolution": "已补充一致性边界说明。",
        "reply": {
          "author": "codex",
          "body": "已补充一致性边界说明。"
        }
      }
    ]
  }'
```

状态使用规则：

- `resolved`：评论已完整处理，包括已回答的问题或已完成的文档修改。
- `open`：评论还需要用户确认或补充。追加 `reply.author = "codex"` 说明需要确认什么。
- `partially_resolved`：仅在用户明确接受部分处理时使用，并在 `resolution` 和 Codex 回复中说明剩余问题。
- `unresolved`：仅在确定无法处理且不需要用户继续确认时使用，并在 `resolution` 和 Codex 回复中说明原因。
- `ignored`：仅在用户或 agent 明确跳过评论时使用。

回写时优先给每条被 Codex 处理过的评论追加 `reply`：

- 已修改文档：`reply.body` 简短说明“已优化/已修改”的结果。
- 已回答问题：`reply.body` 直接回答问题。
- 需要用户确认：`status` 保持 `open`，`reply.body` 用一句话说明需要用户确认的选择或补充信息。

目标落点字段用于在下一版 Markdown 中显示处理结果角标：

- `targetFile`：评论处理后对应的新版本文件。
- `targetStartLine` / `targetEndLine`：新版本文件中的处理落点行号。
- `targetSelectedText`：新版本中与处理结果最相关的文本片段。

当评论已处理或部分处理时，应尽量回写目标落点字段。无法可靠定位目标落点时，可以只回写 `targetFile` 和 `resolution`，并在 `resolution` 中说明原因。

## 接收粘贴评论

当用户粘贴评论时，将 `md-review-server` API 评论、复制评论和 review queue 条目统一视为评审项。

支持以下格式：

```text
docs/example.v1.md:L42-L48
评论内容...
```

```text
docs/example.v1.md:L42
评论内容...
```

```md
## C001

source: docs/example.v1.md:L42-L48
quote: "长行中的局部选区"
status: open
comment: 评论内容...
```

定位信息缺失时，使用 `quote` 或上下文推断目标位置。推断会改变语义时，将评论标记为 `unresolved` 并要求更清晰的定位信息。

## 维护 Review Queue

当评论超过三条，或用户要求保留可读队列时，创建或更新同级 review queue 文件：

```text
<document-stem>.review.md
```

使用 `references/review-template.md` 作为格式参考。队列保持简洁，每条评论使用以下状态之一：

- `open`
- `resolved`
- `partially_resolved`
- `unresolved`

## 完成一轮评审

生成下一版本后，回复内容包含：

1. 新文件路径。
2. 评论处理摘要。
3. 未处理评论或关键假设。
4. 当前 review 链接，以及用户应选择的新文件。只有在用户需要手动启动时才给出命令。

review 链接使用文件名作为链接文本，例如：

```md
[sample.v2.md](http://127.0.0.1:3030/?file=sample.v2.md)
```

回复保持简短，使用户可以立即继续下一轮评审。

## md-review-server 说明

`md-review-server` 是本地 Markdown 评审 UI，用作人类批注界面和机器可读评论 API：

```bash
npx md-review-server docs --port 3030 --active-file docs/example.v1.md
```

评论不存储在 Markdown 文件中，而是存储在 `.reviews/*.review.json` sidecar 文件中。Codex 读取 `GET /api/comments?status=open`，并通过 `PATCH /api/comments` 写回处理结果。

## 参考文件

创建或更新 review queue 时读取 `references/review-template.md`。
