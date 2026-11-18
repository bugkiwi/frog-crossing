# AGENTS.md — Frog Crossing (青蛙过河)

本文件为仓库级开发与数据约定，所有后续功能迭代、词库编写与重构均须遵循。

## 1. 词库与教材数据规范（强制引用）

所有内置分册课本（按年级上/下册加载）、考试词典（如雅思、托福、四六级）以及用户导入/导出的标准 JSON 词库功能，**必须严格遵循**：

- 规范文档：[`docs/vocab-json-spec.md`](./docs/vocab-json-spec.md)（`frog-crossing-vocab/v1`）

核心要求摘要：
- 顶层支持 `book`（单本教材/词典）或 `books`（多本合集），支持按 `grade` + `semester`（`upper` / `lower` / `full` / `none`）组织加载。
- 单词、单元、书目字段及必填/可选约定以 `docs/vocab-json-spec.md` 为准；导入时自动补齐缺省 `id`，并保持内置 `book.id` 与 `unit.id` 稳定，以兼容本地学习统计记录。
- **每单元词汇数量只提供软建议，严禁硬性拦截导入**：参考 `docs/vocab-json-spec.md` 第 4 节（低年级建议 10–18 词、高年级/初中建议 15–25 词、考试词典建议 20–35 词；`< 6` 词或 `> 40` 词仅做温和提示，超长单元可提供可选自动拆分）。
- 新增多册内置教材时，优先按 `public/vocab/catalog.json` + 分册 JSON 的按需懒加载方式组织，避免将全部年级词库直接打入主包。

## 2. 关键交互与持久化约定

- **本地进度同步**：`localStorage`（`src/services/progressStorage.ts`）须在**每跳过一只青蛙上岸时**刷新积分、护送进度、单元学习统计及按键准确率。
- **多端响应式适配**：所有界面变更须兼顾超宽桌面（≥1650px）、常规桌面（1440px）、iPad 横竖屏（1024×768 / 768×1024）及手机端（390×844），确保顶部导航栏无溢出重叠、手机端空格键与触控上岸按钮可见。
- **语音识别模式**：
  - 读对目标单词跳跃，读错不跳并给出温和重试提示；TTS 播报期间启用防回声抑制。
  - 完成单元点击「下一单元」或重开本局时，须保持麦克风监听状态持续开启（由 `App.tsx` 顶层维护 `voiceMicActive`）。
  - 底部语音控制栏（`src/components/VoiceControlPanel.tsx`）须保持锁定固定高度，避免识别状态切换引发河面高度闪动。

## 3. 构建与验证

- 每次代码改动后须运行 `npx tsc --noEmit && npm run build` 确认类型与构建零错误。
- 推送至 `main` 分支会自动触发 Vercel 生产部署（`https://frog-crossing.vercel.app`）。
