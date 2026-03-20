# Page Agent 扩展打包与 Chrome 加载指南（中文）

本说明用于把仓库 `packages/extension` 打包成可在 Chrome 里“开发者模式 - 加载已解压的扩展程序”进行测试的产物。

## 1. 打包前准备

确认你已安装依赖并具备 Node 环境（项目要求 Node 20+，仓库根 `package.json` 有 `engines` 约束）。

## 2. 构建扩展（推荐顺序）

在仓库根目录执行以下命令：

### 2.1 先构建各个 workspace 的库产物（防止扩展构建找不到入口）

```bash
npm run build:libs
```

这是因为扩展打包依赖 `@page-agent/core`、`@page-agent/page-controller` 等包的 `dist` 产物。若跳过这一步，`wxt build` 可能会报类似“Failed to resolve entry for package `@page-agent/core`”的问题。

### 2.2 再构建扩展

```bash
npm run build:ext -w @page-agent/ext
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

## 5. 重新打包后如何让 Chrome 立刻生效

每次你重新执行第 2 步打包后，在 `chrome://extensions/` 页面点击对应扩展的 `重新加载`（或刷新扩展页面），让 Chrome 使用新的产物文件。

