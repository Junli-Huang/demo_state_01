# GDevelop 工程源

用当前稳定版 GDevelop 打开 `game.json`。主场景为 `Playground`。

核心规则按职责拆为外部事件：`ApplyInfluence`、`AdvanceState`、`EvaluateStateTriggers`、`EvaluateConditionRules`、`ApplyEffect`、`GetAttributeTotal`。场景事件仅负责调度。

本仓库不在 CI 安装非官方构建器。请在 GDevelop 中 Web 导出到仓库根目录的 `web-build/`，提交后由 GitHub Actions 原样部署。
