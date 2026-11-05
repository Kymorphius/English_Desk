# 词库授权与版本

来源：[Word Atlas](https://github.com/designfuchen/word-atlas)，Word Atlas contributors — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

同步日期：2026-11-03。上游版本：`19a9bd889d2f642fef1d8d0eef85a3f35e1a66ff`。

共 7,298 个词条。将上游 `data/word-atlas.json` 转换为本应用字段，保留单词、中英文音标、中英文释义、两条例句及译文、常用搭配、用法提示和 CEFR 级别；未包含图片和录音。朗读使用系统语音。本应用的简化间隔复习算法不是 Anki 或 FSRS 算法。

上游说明词条由 AI 辅助生成，可能存在错误，且不是官方 IELTS 词表。原始授权见 [CONTENT_LICENSE.md](https://github.com/designfuchen/word-atlas/blob/19a9bd889d2f642fef1d8d0eef85a3f35e1a66ff/CONTENT_LICENSE.md)。

## 搭配例句

`data/collocation-examples.js` 收录词库自带例句没有用到的搭配的例句，共 18,931 条，覆盖 7,253 个词。初稿由 OpenAI gpt-6-luna 于 2026-11-04 至 05 生成（要求 12–25 词、贴近雅思话题并附中文翻译）；每条都经程序检查确实用上了对应搭配（允许时态、单复数、人称代词和常见不规则变化）、长度合理、有译文。随后由 Claude Opus 5.5 按严格编辑标准逐条交叉审核（语法与单复数、搭配是否地道、意思是否与释义一致、同义反复、逻辑、译文），挑出的 878 条以及原先缺例句的搭配由 Claude Sonnet 5.5 针对问题重写，再经 Opus 复审，两轮后仍不合格的删除。另有 123 个搭配没有收录例句，收藏时再按需生成。未逐条人工审核（分层人工抽查过约 100 条），可能仍有个别措辞不够自然。界面中标为「AI 例句」，学习者可在本机重新生成替换。

## 生义例句

`data/sense-examples.js` 为多义词第一个以外的每个词义各收录一句例句，共 6,391 条，覆盖 4,586 个词，由 Claude Sonnet 5.5 于 2026-11-05 编写（给出词性、中文释义、英文释义和这个词的其他词义，要求用的正是这个词义、12–25 词、贴近雅思话题并附中文翻译）。每条都经程序检查确实用上了这个词（允许词形变化），再由 Claude Opus 5.5 逐条审核，重点检查用的是不是指定词义；不合格的针对问题重写并复审，两轮后仍不合格的删除。界面中标为「AI 例句」，可能仍有个别措辞不够自然。
