# Color compatibility baseline

This fixture validates Mermaid and syntax highlighting against the app's light and dark themes.

## Sequence diagram

```mermaid
sequenceDiagram
    participant UI as React / CanvasActions
    participant SDK as CanvasDataSdk
    participant Doc as Local Y.Doc
    participant Client as Collab Client
    UI->>SDK: 执行 Command
    SDK->>Doc: 校验 Schema 并写事务
    Doc-->>Client: 产生本地 Yjs Update
    Client-->>UI: 更新 Draft 投影
```

## Flowchart

```mermaid
flowchart LR
    Draft[Draft Service] --> Store[Canvas Store]
    Resource[Resource Service] --> Store
    Store --> Projection[ReactFlow Projection]
    Projection --> View[Canvas View]
```

## JSON

```json
{
  "draftVersion": 42,
  "schemaVersion": 1,
  "resourceId": "res-original",
  "active": true
}
```

## TypeScript

```ts
const applyDraft = (version: number, resourceId: string) => {
  return { version, resourceId, status: "accepted" };
};
```
