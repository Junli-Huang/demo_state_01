# GDevelop 工程源

用当前稳定版 GDevelop 打开 `game.json`。主场景为 `Playground`，其中 A、B、C 是同一个 `Entity` Sprite 的三个实例；拖动由 GDevelop `Draggable` Behavior 提供，Attribute 与 State 存在实例变量中。

核心规则按职责声明为外部事件：`ApplyInfluence`、`AdvanceState`、`EvaluateStateTriggers`、`EvaluateConditionRules`、`ApplyEffect`、`GetAttributeTotal`。当前可运行迁移层通过场景 JavaScript Event 调度这些同名职责，避免为 Fire/Burning 建立专用 Object。

本仓库不在 CI 安装非官方构建器。请在 GDevelop 中 Web 导出到仓库根目录的 `web-build/`，提交后由 GitHub Actions 原样部署。
