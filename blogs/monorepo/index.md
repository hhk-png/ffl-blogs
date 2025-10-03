### 简介

`monorepo` 可以概括为前端模块化、工程化的进一步演进，使得我们能够在不将自己的包发布到npm上的情况下，就可以使用 `pnpm add` 和 `pnpm install` 的方式，向当前项目引入本地其他项目里的包，使得能够在同一个工作目录下存放多个项目，方便管理。换句话说，我们可以通过两个途径来将第三方库引入到项目中，一个是本地，一个是npm。

关于为什么要使用monorepo，使用monorepo的好处和坏处，可以查看 [What is monorepo? (and should you use it?)](https://semaphoreci.com/blog/what-is-monorepo) 这篇文章，在此不再叙述。

实现 `monorepo` 可以通过 `pnpm` 和 `yarn` 两种包管理方式，本文使用 `pnpm` 来进行实践。

本文的示例代码已经push到了github上 [https://github.com/hhk-png/monorepo-blog](https://github.com/hhk-png/monorepo-blog).

### 实践

使用的电脑是 `windows`。根目录的名称为monorepo，下文的 `/api/user.js  `表示 `monorepo/api/user.js`，其他相同。

#### 1.

首先依此敲入以下命令：

```bash
mkdir monorepo # 创建根目录
pnpm init
echo "" >> pnpm-workspace.yaml # 创建 pnpm-workspace.yaml 文件
```

其中，`pnpm-workspace.yaml` 文件可以为空，但是一定要有，否则会报错。现在当前目录有两个文件 `package.json` 和 `pnpm-workspace.yaml`。

接下来执行

```bash
mkdir api # 创建api文件夹
cd api
pnpm init
pnpm install axios
```

在 `/api `下创建 `base.js`，`user.js`，`index.js`，三个文件，文件内容如下：

```js
# /api/base.js
import axios from 'axios'

let Axios = axios.create({
  baseURL: "/"
})

export default Axios
```

```js
# /api/user.js
import Axios from "./base"

export const getUser = (data) => Axios.get(data)
```

```js
# /api/index.js
export * from './user'
```

接下来将 `package.json` 文件中的 name 改为 `"@fll/api"`。

至此就完成了一个简易项目的构建。

#### 2.

回到根目录，执行以下命令，进入到了 `/packages/web` 文件目录下。

```shell
mkdir packages # 创建packages文件夹
cd packages
pnpm create vite # 选项依此设置为 web Vanilla JavaScript
cd web
pnpm install
pnpm install @fll/api # 添加 @fll/api 本地库
```

在 `main.js` 中加入下面的代码

```js
import { getUser } from '@fll/api'
console.log(getUser)
```

运行 `pnpm run dev`

可以看到控制台中输出了 `getUser` 函数，`@fll/api` 模块倍成功引入。

![output](.\output.png)

#### 3.

回到 `monorepo` 根目录，创建 `components` 文件夹，先创建 `addOne`，`addTwo` 两个项目，分别在项目目录下使用 `pnpm init` 初始化项目，并分别添加 `index.js` 文件，文件内容分别为

```js
# /components/addOne/index.js
const addOne = (x) => x + 1;

export default addOne;
```

```js
# /components/addTwo/index.js
const addTwo = (x) => x + 2;

export default addTwo;
```

接下来，在 `components` 目录下使用 `pnpm create vite` 创建一个 vite 项目，选项分别为 `addThree Vanilla JavaScript`。因为使用vite在运行项目时基本上不会报错，所以这里直接使用 vite，而不是原生 node。

执行以下命令：

```shell
cd addThree
pnpm install
pnpm install addOne addTwo
```

在 `main.js` 文件中添加如下代码

```js
import addOne from 'addOne'
import addTwo from 'addTwo'

console.log(addTwo(addOne(2)))
```

运行 `pnpm run dev`，可以看到浏览器输出控制台中打印了 5。

本节最终的文件结构如下：

![components](.\components.png)

#### 4.

回到 `monorepo` 根目录，使用 `pnpm create vite` 创建一个 vite 项目，选项分别为 `temp Vanilla Javascript`。并在 `main.js` 文件中添加和 `addThree` 一样的代码，即

```js
import addOne from 'addOne'
import addTwo from 'addTwo'

console.log(addTwo(addOne(2)))
```

使用 `pnpm run dev` 运行项目，可以看到控制台中输出了 5。



### 总结

1.`monorepo`是一个项目组织形式的代名词，pnpm是通过 `workspace` 机制来实现monorepo的。如果根目录中包含了 `pnpm-workspace.yaml` 文件，那么任何包含package.json文件的目录都会被看作为一个本地的第三方库，都可以在其他项目中通过pnpm install安装，包名为 `package.json`中的name。使用 `pnpm install` 指令时，如果本地库的名称和已经发布的第三方库的名称相同，优先安装本地库。

2.包名name没有被赋予任何特殊含义，只要符合命名规则就可以。但是为了便于区分项目，一般使用 `@xxx/xxx` 的形式来为workspace命名。本文的演示在根目录下总共创建了api，components，packages，temp四个文件夹，也没有什么特殊含义。

3.`pnpm-workspace.yaml` 文件的作用我不清楚，你可以通过阅读其他资料进行了解。

4.如果想在特定的workspace下执行命令，可以通过 `--filter` 来指定，比如 `pnpm install --filter temp` 就表示要在 `/temp` 下执行 `pnpm install` 命令。



> SEO
>
> monorepo可以概括为前端模块化、工程化的进一步演进，使得我们能够在不将自己的包发布到npm上的情况下，就可以使用pnpm add和的方式，向当前项目引入本地其他项目里的包，使得能够在同一个工作目录下存放多个项目，方便管理。换句话说，我们可以通过两个途径来将第三方库引入到项目中，一个是本地，一个是npm。实现monorepo可以通过pnpm和yarn两种包管理方式，本文使用pnpm来进行实践。monorepo实践,monorepo原理，monorepo概述
>
> pnpm,npm,yarn,monorepo,前端模块化工程化的进一步演进，monorepo实践,monorepo原理，monorepo概述,pnpm workspace,pnpm-workspace

### 参考资料

[文章封面来源：必应每日高清壁纸 - 精彩，从这里开始](https://bing.ioliu.cn/)

[What is monorepo? (and should you use it?)](https://semaphoreci.com/blog/what-is-monorepo) 

[超详细pnpm monorepo教程，从开发到打包，正片从第7分钟开始。](https://www.bilibili.com/video/BV1e84y1B7s3/?spm_id_from=333.337.search-card.all.click&vd_source=36bfa49fd2dca513136af48ec97cffbe)

[Pnpm Workspace: 单仓库多项目(monorepo)](https://blog.csdn.net/weixin_44691608/article/details/122379051)

[pnpm官方文档](https://pnpm.io/zh/workspaces)