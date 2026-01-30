# AICode CLI

AI-powered CLI code generation tool - 类似 Claude Code 的终端编程助手。

## 功能特性

- 🤖 **多 AI 提供商支持** - Anthropic Claude、OpenAI GPT
- 💬 **交互式对话** - REPL 风格的聊天界面
- 🛠️ **内置工具** - 文件操作、Shell 命令、代码搜索
- 📝 **流式输出** - 实时显示 AI 响应
- ⚙️ **灵活配置** - 支持配置文件和环境变量

## 安装

### 全局安装

```bash
npm install -g aicode
```

### 本地开发

```bash
# 克隆仓库
git clone <repo-url>
cd aicode

# 安装依赖
npm install

# 构建项目
npm run build

# 全局链接
npm link
```

## 快速开始

### 1. 配置 API Key

**方式一：使用配置命令**

```bash
# 初始化配置文件
aicode config init

# 设置 Anthropic API Key
aicode config set ai.anthropic.apiKey sk-ant-api03-...

# 设置 OpenAI API Key
aicode config set ai.openai.apiKey sk-proj-...
```

**方式二：使用环境变量**

```bash
# Linux/macOS
export ANTHROPIC_API_KEY=sk-ant-api03-...
export OPENAI_API_KEY=sk-proj-...

# Windows
set ANTHROPIC_API_KEY=sk-ant-api03-...
set OPENAI_API_KEY=sk-proj-...
```

**方式三：创建配置文件**

在 `~/.aicode/config.json` 或项目根目录创建 `aicode.config.json`：

```json
{
  "ai": {
    "provider": "anthropic",
    "anthropic": {
      "apiKey": "sk-ant-api03-...",
      "model": "claude-3-5-sonnet-20241022"
    },
    "openai": {
      "apiKey": "sk-proj-...",
      "model": "gpt-4o"
    }
  },
  "ui": {
    "theme": "dark",
    "streamOutput": true
  },
  "workspace": "/path/to/your/workspace"
}
```

### 2. 启动交互式 Chat

```bash
# 使用默认配置
aicode chat

# 指定提供商
aicode chat -p openai

# 指定模型
aicode chat -p anthropic -m claude-3-5-sonnet-20241022

# 使用自定义配置文件
aicode chat -c ./my-config.json
```

## 命令参考

### 全局选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--config <path>` | `-c` | 指定配置文件路径 |
| `--debug` | `-d` | 启用调试模式 |
| `--verbose` | `-v` | 启用详细输出 |
| `--version` | `-V` | 显示版本号 |
| `--help` | `-h` | 显示帮助信息 |

### Chat 命令

```bash
aicode chat [options]

选项:
  -p, --provider <anthropic|openai>  AI 提供商
  -m, --model <model>                模型名称
  -c, --config <path>                配置文件路径
```

### Config 命令

```bash
# 初始化配置
aicode config init

# 获取配置值
aicode config get ai.provider

# 设置配置值
aicode config set ui.theme light

# 列出所有配置
aicode config list
```

## REPL 内部命令

进入 chat 模式后，可使用以下特殊命令：

| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助信息 |
| `/clear` | 清除对话历史 |
| `/exit` / `/quit` | 退出 REPL |
| `/config` | 显示当前配置 |
| `/tools` | 列出可用工具 |
| `/history` | 显示对话历史 |

## 可用工具

AI 可以调用以下工具来辅助编程：

| 工具 | 功能 | 示例 |
|------|------|------|
| `read_file` | 读取文件内容 | "读取 package.json" |
| `write_file` | 写入文件 | "创建 utils.js 文件" |
| `create_dir` | 创建目录 | "创建 src/components 目录" |
| `list_files` | 列出目录文件 | "列出 src 目录的文件" |
| `delete_file` | 删除文件/目录 | "删除 test.txt" |
| `exec` | 执行 Shell 命令 | "运行 npm test" |

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 构建
npm run build
```

## 配置文件示例

参考 [aicode.config.example.json](./aicode.config.example.json) 获取完整配置示例。

## 测试覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 | 93%+ |
| 分支 | 85%+ |
| 函数 | 100% |
| 行 | 93%+ |

## License

MIT

---

**提示**: 首次使用前请确保已配置 API Key，否则无法调用 AI 服务。
