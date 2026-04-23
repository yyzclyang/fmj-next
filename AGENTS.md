# Repository Guidelines

## 项目结构

本仓库是一个引擎重写项目，当前运行时分层以 `packages/core`、`packages/browser-runtime` 和 `apps/bbk-games` 为主：`packages/core/src/` 负责宿主无关的核心运行时，`packages/browser-runtime/` 负责浏览器侧通用运行时壳层，`apps/bbk-games/` 负责实际应用组装。`resources/fmj_kt` 作为原版 Kotlin/JS 实现基线，仅用于语义对照、流程核对和资源格式参考。`resources/fmj_kt/src/` 包含原实现，按 `combat`、`scene`、`script`、`characters`、`goods`、`views` 等领域分目录；`resources/fmj_kt/assets/` 存放 `DAT.LIB`、字库和资源转换脚本。`resources/fmj_c_engine/` 保留更早期 C 引擎与逆向资料，`resources/fmj_c_engine/docs/` 存放设计说明。

## 构建与开发命令

重写阶段优先围绕 `packages/core/`、`packages/browser-runtime/` 与 `apps/bbk-games/` 组织代码，涉及旧实现核对时再回到 `resources/fmj_kt/`：

- `packages/core/`：优先放置 TypeScript 重写源码、构建脚本与运行入口；如需新增命令，默认围绕这里组织。
- `packages/browser/`：放置浏览器运行时胶水层与固定渲染逻辑，避免把主循环和画布渲染散落到应用层。
- `apps/bbk-games/`：放置实际 webapp，负责游戏切换、资源获取、输入接入、存储与音频实现。

## 代码风格与命名

TypeScript 重写时优先保持模块边界与原工程可映射，例如 `combat`、`scene`、`script` 等目录语义尽量稳定，便于逐步迁移与交叉校验。类型名使用 `PascalCase`，函数与变量使用 `camelCase`；屏幕、动作、脚本进程等核心概念可延续旧工程命名习惯，如 `ScreenMainGame`、`ActionDefend`、`ScriptVM`，前提是不会明显违背 TS 侧现有风格。修改时只格式化直接改动的部分，不整理无关旧代码。C 代码、反汇编资料和 Kotlin 旧实现默认都只作为参考，不做顺手重构。

## 测试与验证

仓库当前没有稳定的统一测试体系。重写任务以最小必要验证为主：优先核对 `packages/core` 的构建或运行入口是否可用，再与 `resources/fmj_kt` 对照关键流程，例如开场、地图切换、战斗、菜单输入和脚本事件。若后续补充测试，优先放在 `packages/core/src` 邻近模块，命名与被测对象对应；除非任务明确要求，不要为了“看起来完整”补一整套测试基础设施。

## 提交与合并请求

Git 历史目前很短，提交信息请使用简短、可检索的祈使句，并带实现前缀，例如 `重写脚本解释器入口`、`校准基线战斗行为`。PR 应说明影响模块、是否是“重写实现”还是“基线校对”、验证方式、是否涉及资源文件重生成。避免把生成物、格式化噪音、旧实现同步修改和无关目录改动混入同一提交。
