# demo_state_01 · GDevelop Playground V0.3

当前主 Prototype 是 `gdevelop/game.json` 对应的 **GDevelop Playground**。浏览器试玩版本位于 `web-build/`；旧版纯 H5 规则验证器完整保留在 `legacy-web/`。

## 核心模型

```text
Attribute → Influence → State Enter / Exit → State
          → Trigger / Condition → Effect → Attribute / State
```

默认场景包含 A（Fire +2）、B（传播体）和 C（接收体）。拖动 A 与 B 重叠，B 进入 Burning；持续 5 秒后通过 `StateActiveFor → AddAttribute` 获得 Fire +1，继而可点燃 C。B 退出 Burning 后连续 10 秒未重新进入，规则只移除 Burning Rule 自己添加的 Fire contribution。

## 目录

- `gdevelop/`：GDevelop 5 工程源，主场景 `Playground`；包含统一 Entity Sprite、实例变量、Draggable Behavior 和原生场景事件循环
- `web-build/`：提交到仓库的 HTML5 导出结果，也是 GitHub Pages 唯一部署目录
- `legacy-web/`：迁移前 V0.2.2 H5 Prototype，仅作规则参考
- `tests/`：与载体无关的状态规则回归测试

## 开发与发布

1. 用 GDevelop 打开 `gdevelop/game.json` 修改工程。
2. 提交工程源；不需要手工更新 `web-build/`。
3. GitHub Actions 使用固定版本的官方 GDevelop CLI 执行 `EXPORT_HTML5_EXTERNAL`。
4. 规则测试和 GDevelop 诊断通过后，Action 将生成的 `web-build/` 部署到 Pages。

本版本只迁移技术载体，不增加 Attribute、State、战斗、HP、AI、技能、范围、距离衰减、Resistance、Counter 或通用规则编辑器。

## 回归测试

```bash
node --test tests/state-system.test.js
```
