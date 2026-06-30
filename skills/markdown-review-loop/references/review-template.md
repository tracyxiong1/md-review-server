# Review Queue 模板

该模板用于 Markdown 评审循环。存在 `quote` 时优先使用 `quote` 定位，因为它比行号更适合处理长行中的局部反馈。

```md
# Review Queue

document: docs/example.v1.md
next_version: docs/example.v2.md

## C001

source: docs/example.v1.md:L42-L48
quote: "ABase 写入不在 RDS 事务内"
status: open
comment: 需要补充 RDS 与 ABase 一致性边界。
resolution:

## C002

source: docs/example.v1.md:L77
quote:
status: open
comment: 在该段后补充读取链路时序。
resolution:
```

应用评论后更新每条记录：

```md
## C001

source: docs/example.v1.md:L42-L48
quote: "ABase 写入不在 RDS 事务内"
status: resolved
target: docs/example.v2.md:L42-L44
comment: 需要补充 RDS 与 ABase 一致性边界。
resolution: 已补充说明：ABase 写入位于 RDS 事务外，当前实现先写 ABase 内容，再写 RDS 消息元数据。
```

状态说明：

- `open`：尚未处理。
- `resolved`：已完整处理。
- `partially_resolved`：已部分处理，在 `resolution` 中说明剩余问题。
- `unresolved`：未处理，在 `resolution` 中说明阻塞原因。
