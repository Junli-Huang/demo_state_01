# 状态实验场 · Demo 01 V0.2.2

一个用于验证 `Attribute → State → Trigger → Effect → Attribute` 闭环的纯前端 H5 原型。

## 当前版本

- 生成、选择、命名、删除实体
- 为实体直接增加火 / 水 / 冰 / 毒属性
- 为实体直接施加燃烧 / 潮湿 / 冻结 / 中毒状态
- 拖动实体；实体重叠时互相产生属性影响
- 环境作为特殊实体，对所有普通实体产生全局影响
- 状态拥有相互独立的进入值和退出值
- 互斥属性会削弱影响，但状态仍允许同时存在
- 实时事件日志，便于观察规则是否符合预期
- Attribute Contribution：Base 与 Rule/Effect 来源独立叠加
- State 支持 OnEnter / OnTick / OnExit Trigger
- Effect 仅包含 Add/Remove Attribute 与 Add/Remove StateProgress
- 预置 Burning 持续/退出规则和 Burning/Frozen 状态克制
- Environment 复用普通实体的 Attribute / State / Effect 数据结构
- 暂停模拟时，可在每个 State 中编辑全局 OnEnter / OnTick / OnExit Effects[]
- Effect 编辑器开放现有四类 Effect，支持多条追加、修改与删除
- Trigger Effects 可编辑；V0.2.1 Condition Effects 保持只读且独立运行
- Reset 会恢复默认 Trigger Effect 配置

## 运行

不需要安装依赖，直接打开 `index.html`；也可直接通过 GitHub Pages 部署。

## Demo 规则

1. 属性是影响源，并不等同于状态。
2. 某状态的进入值达到 100 时进入状态。
3. 对应影响消失后，退出值增长；达到 100 时退出状态。
4. 火 / 水、火 / 冰属性会相互削弱，但燃烧、潮湿、冻结等状态可以共存。

## 核心验收路径

拖动 `A · 火源（Fire +2）` 与 B 重叠。B 进入 Burning 时不会立即获得属性；持续 Burning 5 秒后，`StateActiveFor → AddAttribute` 使 B 获得 `Fire +1`。B 退出 Burning 后属性仍保留；若连续 10 秒没有重新进入 Burning，`StateInactiveFor → RemoveAttribute` 移除这份 Fire。期间重新 Burning 会取消移除倒计时，且不会重复叠加。

## 测试

```bash
node --test tests/state-system.test.js
```

本版本只验证 V0.2 核心闭环；不包含抗性、计数器、伤害、范围、装备、战斗、AI、技能或通用脚本语言。
