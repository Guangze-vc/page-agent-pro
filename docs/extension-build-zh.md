# Page Agent 扩展打包与 Chrome 加载指南（中文）

本说明用于把仓库 `packages/extension` 打包成可在 Chrome 里“开发者模式 - 加载已解压的扩展程序”进行测试的产物。

## 1. 打包前准备

确认你已安装依赖并具备 Node 环境（项目要求 Node 20+，仓库根 `package.json` 有 `engines` 约束）。

## 2. 构建扩展

在仓库根目录执行以下单一命令即可完成构建（该命令会自动构建所有依赖库）：

```bash
npm run build:ext
```

如果你需要生成用于发布的压缩包（zip），可以使用：

```bash
npm run zip:ext
```

构建完成后会输出未压缩的扩展目录（包含 `manifest.json`）。

## 3. 找到产物目录

本次构建输出目录为：

`packages/extension/.output/chrome-mv3/`

其中包含 `manifest.json`，Chrome 加载时需要选择这个目录。

完整路径（以你当前仓库位置为准）：

`C:\Users\25498\Desktop\work\guagnze\page-agent\packages\extension\.output\chrome-mv3`

## 4. 在 Chrome 中加载测试

1. 打开 `chrome://extensions/`
2. 右上角开启 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 选择上一步的目录：`packages/extension/.output/chrome-mv3`
5. 回到你要测试的网页，必要时刷新页面，并检查扩展是否已生效

每次你重新执行第 2 步打包后，在 `chrome://extensions/` 页面点击对应扩展的 `重新加载`（或刷新扩展页面），让 Chrome 使用新的产物文件。

---

## 6. 开发模式下的自动刷新 (Auto-Reload)

为了在开发期间（例如修改 React 组件或 CSS 时）获得更快的反馈，WXT 提供了开发模式。在这种模式下，文件变更会自动重新编译并刷新扩展程序。

在仓库根目录执行：

```bash
npm run dev:ext
```

1. 该命令会启动一个 WXT 开发服务器，并尝试为你打开一个新的 Chrome 窗口。
2. 此时，任何对 `packages/extension/src/` 下源文件的修改都会自动同步到扩展中，通常无需手动重新加载或刷新页面。
3. 如果你想手动启动 Chrome 进行调试，在 `chrome://extensions/` 里加载 `.output/chrome-mv3` 即可，只要 `npm run dev:ext` 还在运行，它就会持续监听并更新。

