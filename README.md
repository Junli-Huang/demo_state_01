# 状态实验场 · Demo 01 V0.2

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
- Attribute Contribution：Base 与临时 Effect 来源独立叠加、独立到期
- State 支持 OnEnter / OnTick / OnExit Trigger
- Effect 仅包含 Add/Remove Attribute 与 Add/Remove StateProgress
- 预置 Burning 传播和 Burning/Frozen 状态克制
- Environment 复用普通实体的 Attribute / State / Effect 数据结构

## 运行

不需要安装依赖，直接打开 `index.html`；也可直接通过 GitHub Pages 部署。

## Demo 规则

1. 属性是影响源，并不等同于状态。
2. 某状态的进入值达到 100 时进入状态。
3. 对应影响消失后，退出值增长；达到 100 时退出状态。
4. 火 / 水、火 / 冰属性会相互削弱，但燃烧、潮湿、冻结等状态可以共存。

## 核心验收路径

拖动 `A · 火源（Fire +2）` 与 B 重叠。B 进入 Burning 后，通过 OnEnter 临时获得 `Fire +1 / 10s`；再让 B 与 C 重叠，C 会被 B 点燃。B 与火源分离后仍按 Exit Progress 正常退出 Burning。

## 测试

```bash
node --test tests/state-system.test.js
```

本版本只验证 V0.2 核心闭环；不包含抗性、计数器、伤害、范围、装备、战斗、AI、技能或通用脚本语言。
