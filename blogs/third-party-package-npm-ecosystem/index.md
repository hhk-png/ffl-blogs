第三方包的管理是一门编程语言最重要的部分之一。在开发业务和开发第三方库的时候，一定会使用第三方库来完成功能，不管是自己写，还是使用的开源方案。

在开发业务时，主要面对的是第三方库的引入，一般通过下面三种方式来添加：

```shell
npm install [pkgName]

yarn add [pkgName]

pnpm install [pkgName]
```

安装第三方库的方式取决于你使用的包管理工具。安装完成之后，会在 `package/json` 的 `Dependencies` 属性下添加包的描述，即添加 `"pkgName":"version"` 样式的字段，如果使用 `monorepo` 方式管理，版本名称则变为 `workspace:*`。

项目依赖分为`Dependencies`、`devDependencies` 和 `peerDependencies` 三种，`Dependencies ` 是真实的依赖，打包的时候会将这些依赖打包到最终的项目文件中，比如vue、react、echarts等；`devDependencies` 为运行时依赖，是一些对业务逻辑没有影响的依赖包，比如用于做代码格式检查和校验的eslint，vite、webpack等打包工具，其打包时不会放到最终的项目文件中。`peerDependencies` 主要用于声明项目对某些包的依赖关系，表示用户应该安装该依赖才能让项目正常工作。

在早期，因为js语言本身以及浏览器不支持模块化，没有相关的基础设置，所以当时的解决方案是使用js构建一套开发体系，就有了wepack、rollup等打包工具的出现。虽然现在浏览器逐渐支持了模块化，但开发项目时还是延续了之前的开发方案，开发业务时基于webpack或者vite等开发，再将项目代码转换为html、css、js等文件，使用原生的引入方式将其部署到服务器上，这一过程的结果一般在打包后的dist文件夹下可以看到。

下载第三方包时，包管理器会将作者上传到 `npm` 上的打包好的js文件、`package.json` 文件，以及其他文件下载到 `node_modules` 文件夹下。在webpack等打包工具解析第三方包时，会根据 `package.json` 中的特定描述字段以及运行环境，确定应该引入哪个js文件。以pinia为例，pinia的 `package.json` 文件控制导入导出的描述字段有以下几种：

```json
{
  ....
  "main": "index.js",
  "module": "dist/pinia.mjs",
  "unpkg": "dist/pinia.iife.js",
  "jsdelivr": "dist/pinia.iife.js",
  "types": "dist/pinia.d.ts",
  "exports": {
    ".": {
      "types": "./dist/pinia.d.ts",
      "node": {
        "import": {
          "production": "./dist/pinia.prod.cjs",
          "development": "./dist/pinia.mjs",
          "default": "./dist/pinia.mjs"
        },
        "require": {
          "production": "./dist/pinia.prod.cjs",
          "development": "./dist/pinia.cjs",
          "default": "./index.js"
        }
      },
      "import": "./dist/pinia.mjs",
      "require": "./index.js"
    },
    "./package.json": "./package.json",
    "./dist/*": "./dist/*"
  }
  ....
}
```

项目使用commonjs规范时，会选择从main对应的路径下引入文件。使用esm规范时，会选择从module对应的路径下引入文件。unpkg 和 jsdelivr 是两个CDN服务，其中的文件是IIFE(立即执行函数)格式，用于直接在浏览器中使用此库。types指定了类型定义文件的位置，用于开发时的typescript支持，使得编译器和编译器能够进行类型推理。

exports是node12+引入的规则，能够提供更加精细的导入导出控制。该字段下的 `"."` 表示使用 `import pinia from 'pinia'` 方式引入函数或者变量的时候，使用对应的导出规则，types表示类型文件，node下面的字段表示，在node环境下，分别使用esm规范和commonjs规范、不同开发环境下时要引入的包的路径，包括production生产环境、development开发环境，以及默认情况下。与node字段同级的 `"./package.json"` 和 `"./dist/*"` 表示该库向外暴露出了这两个文件。另外，如果exports字段下定义了 `"./xxx"`，表示使用 `import A from pinia/xxx` 时候应该查找的对应的文件路径。

关于exports等字段的解释，详见node官方文档：[https://nodejs.org/api/packages.html](https://nodejs.org/api/packages.html)

如果要开发第三方库，还需应该面对如何设置库的导出选项，一般使用rollup、unbuild等作为打包工具，所需遵守的是上面描述的规则，可以问**chatGPT**。