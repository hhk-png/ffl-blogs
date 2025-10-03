### git hooks简介

git一个基本的commit操作包括以下步骤：

1. 添加变更到暂存区
2. 将暂存区的内容保存为一个新的提交对象，并创建提交信息。
3. 生成提交对象的哈希值
4. 更新当前分支的引用
5. 清空暂存区

`git hooks`，译为 `git` 钩子，是程序设计人员暴露出来的能够在程序执行过程中的特定时间点被执行的文件或者函数，该函数由使用者编写，能够让使用人员在某个步骤执行之前和执行之后执行额外的操作。`git` 为 `commit` 命令提供了四个钩子，分别是 `pre-commit`、`commit-message`、`prepare-commit-msg` 和 `post-commit`，`pre-commit` 在上面的步骤2将暂存区的内容保存为一个新的提交对象之前执行，`prepare-commit-msg` 在打开提交信息编辑器之前触发，`commit-message` 在创建提交信息之后执行，`post-message` 在执行完 `commit` 操作，清空暂存区之后执行。

`vue` 也在组件实例的生命周期中提供了许多钩子，比如 `mounted`、`beforeMount`，但不同于 `vue`，`git` 钩子是以 `shell` 脚本的方式书写，而 `vue` 是直接在 `.vue` 文件中直接使用 `js` 代码插入。

`git hooks` 以 `shell` 文件的方式配置，将特定文件名的 `shell` 文件放到 `git` 指定的文件夹下，`git` 会在相应时刻默认读取并执行文件中的脚本代码，`git hooks` 的默认地址为**项目根目录/.git/hooks/**，文件夹内容如下图所示：

![git hooks dir](.\images\git hooks dir.png)

`shell` 脚本可以没有文件后缀名，或者以 `.sh` 为后缀，图中文件的 `.sample` 后缀是 `git` 为你提供的钩子文件使用说明，使用 `vscode` 打开该文件就可以查看。`.sample` 文件不会被 `git` 执行，将`.sample` 后缀去掉之后，变成 `shell` 脚本之后就会被当作钩子文件执行。`.sample` 文件的文件名就是 `git` 提供的钩子名称，`git` 提供的钩子有：

- pre-commit:  在执行 `git commit` 命令时，在提交被创建之前触发。它允许你在执行提交之前自定义一些操作，例如代码风格检查、代码静态分析、单元测试等。

- prepare-commit-msg：在提交消息编辑器打开之前触发，如果使用-m传递提交信息，则不会触发该钩子
- commit-msg: 它在执行 `git commit` 命令时，编辑提交信息之后、提交之前触发。具体来说，`commit-msg` 钩子会在提交信息（commit message）被写入提交文件（如 `.git/COMMIT_EDITMSG`）后被触发。
- post-commit:  在执行 `git commit` 命令时，在提交被创建之后触发。
- pre-push：在执行 `git push` 命令之前触发 
- post-update：在执行 `git push` 命令后，远程仓库中的更新已成功推送到目标仓库后触发。 
- pre-receive：运行在**服务端**，在远程仓库接收推送操作时，在所有分支引用更新之前触发
- update：运行在**服务端**，在执行 `git push` 命令后，远程仓库中的更新被成功推送到目标仓库，在**每个**分支引用被更新之前触发，`pre-receive` 先于 `update`。
- pre-applypatch：在应用 `patch` 到工作目录之前触发。
- applypatch-msg: 在 `git` 应用 `patch` 时被触发。具体来说，`applypatch-msg` 钩子会在 `git` 应用补丁到工作目录之前，对补丁的提交信息（commit message）进行处理。  
- pre-rebase：在执行 `git rebase` 命令之前触发
- pre-merge-commit：在执行合并操作之前触发。具体来说，当你执行 `git merge` 命令时，`git` 将会在执行合并操作之前触发 `pre-merge-commit` 钩子。
- push-to-checkout：运行在**服务端**，在客户端强制推送到当前检出分支时触发。

- fsmonitor-watchman: `fsmonitor-watchman` 是一个可选的特性，`git` 可以通过 `Watchman` 服务来实现高效的文件系统监视功能。执行 `git` 的一些操作，比如 `git status`、`git diff`、`git commit`、`git pull` 等，需要检查文件系统的状态，在较大的代码库中，每次使用这些操作都会将整个项目文件夹检查一遍，频繁使用这些操作会导致较长时间的耗时，`git` 可以利用 `WatchMan` 提供的高效文件系统监视功能，从而减少状态检查操作的耗时。要使用 `WatchMan`，首先确保系统上已经安装了 `Watchman` ，并且 `git` 版本支持该特性。然后，通过配置 `git`，启用 `core.fsmonitor` 选项，并将其设置为 `Watchman` 来启用该特性。

  `watchman` 通过减少不必要的操作来提高文件系统的检测性能，在检测时只关注文件变化的部分，而不是每次检测都将所有的项目文件都遍历一遍。`fsmonitor-watchman` 会在你执行任何与文件系统变更相关的 `git` 操作和文件系统变化时触发。

- sendemail-validate：是 `git` 的一个配置选项，要想将其开启 `sendemail-validate`，可以通过 ` git config --global sendemail.validate true ` 设置，该选项的默认值取决于 `git` 版本。`sendemail-validate` 钩子在邮箱被发送之前调用。

### husky基本使用与原理

#### 基本使用

 `husky` 是一个帮助开发者更方便配置 `git hooks` 的第三方库。直观上看，其将 `git hooks` 的配置位置从**项目根目录/.git/hooks/**转移到了**项目根目录/.husky/**。下面简单介绍以下它的使用：

首先创建一个项目文件夹，然后初始化 `git` 仓库。之后并执行安装 `husky` 并执行husky的初始化

```shell
git init

pnpm add --save-dev husky

pnpm exec husky init
```

`husky` 默认在**.husky/pre-commit**中写入了 `pnpm test`，因此，在`[package.json].scripts` 中添加 `"test": "echo husky test"` 就可以在 `commit` 的时候看到 `"husky test"` 在命令终端中打印了出来。

如果 `[package.json].scripts.test` 命令为 `vitest`，则就会执行 `vitest` 测试流程。

#### 原理剖析

`husky` 的初始化主要是 `pnpm exec husky init` 这条语句，其中 `husky` 能被当作可执行文件来执行，是因为在 `husky` 项目中的 `[package.json].bin` 中添加了 `"husky": "bin.mjs"`，这样执行 `pnpm exec husky init` 实际上执行的是 `bin.mjs` 文件，init是命令执行所携带的参数，在程序中使用 `process.argv[2]` 取出。`exec` 是 `pnpm` 的特殊写法，其他包管理工具比如 `npm` 执行这个过程的时候可以直接省略 `exec` 不写，效果与 `pnpm` 相同。

`husky` 在执行 `init` 初始化的时候会覆盖掉 `[package.json].scripts.prepare` 的内容，因此如果是在项目开发过程中间加入的 `husky`，请使用 `pnpm exec husky` 执行 `husky` 的初始化。`prepare` 是 `npm` 的钩子，在执行 `npm install`、`npm publish` 等多数 `npm` 时被触发，`husky` 默认配置了 `prepare` 为 `husky` 是为了保证 `.husky/_/` 文件夹的初始化和确保 `git hooks` 加载路径改变。

`bin.mjs` 文件的代码如下：

```js
#!/usr/bin/env node
import f, { writeFileSync as w } from 'fs'
import i from './index.mjs'

let p, a, n, s, o, d

p = process
a = p.argv[2]

if (a == 'init') {
	n = 'package.json'
	s = f.readFileSync(n)
	o = JSON.parse(s)
	;(o.scripts ||= {}).prepare = 'husky'
	w(n, JSON.stringify(o, 0, /\t/.test(s) ? '\t' : 2) + '\n')
	p.stdout.write(i())
	try { f.mkdirSync('.husky') } catch {}
	w('.husky/pre-commit', p.env.npm_config_user_agent.split('/')[0] + ' test\n')
	p.exit()
}

d = c => console.error(`${c} command is deprecated`)
if (['add', 'set', 'uninstall'].includes(a)) { d(a); p.exit(1) }
if (a == 'install') d(a)

p.stdout.write(i(a == 'install' ? undefined : a))
```

其首先声明了 `#!/usr/bin/env node`，让 `node` 认这是一个可执行文件，然后从 `index.mjs` 中引入了 `i` 函数，该函数主要是 `.husky/_/` 文件夹的初始化，携带的有一个，为存储git钩子的文件夹名称，默认为 `.husky`，稍后介绍。

之后使用 `processs.argv` 接收了命令行的第三个参数，判断如果该参数为 `init`，则首先读取 `package.json` 文件并解析，向 `scripts` 对象里写入了 `"prepare": "husky"` 之后，又将编辑后的内容写到了 `package.json` 文件中，然后调用 `i` 函数，并将 `i` 函数的返回值输出，创建 `.husky` 文件夹，并向 `./husky/pre-commit` 文件中写入 `pnpm test`，`p.env.npm_config_user_agent.split('/')[0]` 的值是所使用的 `npm` 包管理工具，`npm_config_user_agent` 是环境变量，最后使用 `p.exit()` 退出程序。

如果携带的额外参数不是 `init`，则首先进行兼容性检查。如果 `a` 是 `add`，`set` 或者 `uninstall` 则打印报错信息并退出程序，如果 `a` 为 `install`， 则仅打印报错信息。随后调用 `i` 函数初始化 `_` 文件夹，此时`a` 代表存放 `git hooks` 的文件夹名称，假设使用的是 `pnpm exec husky .otherHusky` 命令初始化 `husky`，则项目根目录中会出现一个名为 `.otherHusky` 的文件夹，作用与默认的 `.husky` 相同。

下面分析 `index.mjs` 的代码，也就是 `i` 函数，代码如下：

```js
import c from 'child_process'
import f, { writeFileSync as w } from 'fs'
import p from 'path'

let l = [ 'pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit', 'applypatch-msg', 'pre-applypatch', 'post-applypatch', 'pre-rebase', 'post-rewrite', 'post-checkout', 'post-merge', 'pre-push', 'pre-auto-gc' ]

export default (d = '.husky') => {
	if (process.env.HUSKY === '0') return 'HUSKY=0 skip install'
	if (d.includes('..')) return '.. not allowed'
	if (!f.existsSync('.git')) return `.git can't be found`

	let _ = (x = '') => p.join(d, '_', x)
	let { status: s, stderr: e } = c.spawnSync('git', ['config', 'core.hooksPath', `${d}/_`])
	if (s == null) return 'git command not found'
	if (s) return '' + e

	f.mkdirSync(_(), { recursive: true })
	w(_('.gitignore'), '*')
	f.copyFileSync(new URL('husky', import.meta.url), _('h'))
	l.forEach(h => w(_(h), `#!/usr/bin/env sh\n. "\${0%/*}/h"`, { mode: 0o755 }))
	w(_('husky.sh'), '')
	return ''
}
```

首先引入了几个系统库，`l` 为要设置的 `git hooks` 的名字，其中一部分已经在前面介绍过，两者有交集，也有互相没有的钩子名称。

当环境变量 `HUSKY` 为 0 时，跳过 `_` 文件夹的安装，并且 `husky` 不希望你使用相对路径，只希望你传递一个正常的文件名，当项目中没有初始化 `git` 时，则返回。之后的三个 `if` 语句就是这些作用。

随后主要是使用 `child_process.spawnSync()` API 来执行 `git config core.hooksPath` 命令改变hooks的默认目录为 `.husky/_/`。

最后执行 `mkdirSync` 递归创建自定义的hooks目录，向 `_` 中写入 `.gitignore` 文件，内容为 `*`，表示忽略 `_` 文件夹下的所有更改。随后将项目中 `husky` 文件写入 `_`，并命名为 `h`，之后在该文件夹下创建 `l` 中所写的的钩子文件，内容**均为**下面所示，表示调用当前目录中的 `h` 文件

```shell
#!/usr/bin/env sh
. "${0%/*}/h"
```

其中 `${0}` 表示当前执行的脚本的路径，包括文件名，`%/*` 表示删除 `${0}` 从末尾到最后一个 `/` 的所有内容，之后再末尾拼接 `/h`，得到 `h` 的文件路径。`h` 文件的内容为：

```shell
#!/usr/bin/env sh
[ "$HUSKY" = "2" ] && set -x
h="${0##*/}"
s="${0%/*/*}/$h"

[ ! -f "$s" ] && exit 0

for f in "${XDG_CONFIG_HOME:-$HOME/.config}/husky/init.sh" "$HOME/.huskyrc"; do
	# shellcheck disable=SC1090
	[ -f "$f" ] && . "$f"
done

[ "${HUSKY-}" = "0" ] && exit 0

sh -e "$s" "$@"
c=$?

[ $c != 0 ] && echo "husky - $h script failed (code $c)"
[ $c = 127 ] && echo "husky - command not found in PATH=$PATH"
exit $c
```

`[expression]` 在 `shell` 中为条件表达式，当环境变量 `HUSKY` 为 `"2"` 时，则该表达式为真，执行后面的 `set -x]` 启用脚本的调试模式。

`h` 文件在被其他文件调用时，假设为 `pre-commit`，`h` 文件代码中的 `${0}` 表示的是 `pre-commit` 文件的路径，而不是 `h` 文件的路径，`##*/` 表示删除最后一个/之前的所有内容，`##` 表示删除，`*/` 匹配最后一个斜杠 `/` 之前的所有字符，因此该表达式得到的是 `pre-commit`。

后面的 `s` 的结果为 `h` 文件的父目录中的对应钩子名称，即 `.husky/` 文件夹下存放的 `git` 钩子。`%/*/*` 表示在 `${0}` 中删除匹配模式 `/*/*` 的最短后缀。

之后 `!` 表示取反，`-f` 表示检测文件 `s` 是否存在，不存在则退出程序。

`for` 循环是执行两个配置文件，`$HOME` 代表当前用户的用户目录，`XDG_CONFIG_HOME:-$HOME` 表示取`XDG_CONFIG_HOME` 或者 `$HOME`，当 `XDG_CONFIG_HOME` 为空时，取 `$HOME`。`XDG_CONFIG_HOME:-$HOME` 表示用户指定的配置文件存储目录。

当 `HUSKY` 为 0 时，退出脚本，表示执行 `git` 命令时不需要钩子处理。后面带上一个 `-` 是为了避免 `HUSKY` 未设置时程序报错，当 `HUSKY` 没有设置时，`${HUSKY-}` 返回空字符串。

之后使用 `sh` 执行 `git` 钩子脚本。`$@` 用于在脚本中遍历所有的命令行参数，如果向下面这样调用 `h` 文件

```shell
./h arg1 arg2 arg3
```

那么在 `h` 文件中， ，`$@` 将会展开为 `arg1 arg2 arg3`。  

在 `sh` 命令中，`-e` 通常表示在脚本执行过程中遇到错误时立即退出。这样可以防止脚本继续执行下去，避免出现潜在的问题。 

`$?` 用于获取上一个命令，也就是 `sh` 命令的退出状态码。最后是对 `sh` 命令退出状态码的处理。



### 其他

1. 通过git add命令添加变更到暂存区

2. 如果在执行commit命令的时候没有携带-m参数，git会打开文本编辑器以让你输入提交信息。

3. 检出分支：正在活跃的分支。

4. pnpm是node的其中一个包管理工具，其他的还有yarn、

5. `[package.json].scripts` 表示 `package.json` 文件里的 `scripts` 对象，这样写是为了方便表达。

6. `process.exit(code)`，如果code为0，则仅是退出程序不报错，表示程序正常退出；如果code为1，则退出程序并报错，表示程序因为错误退出。

7. JSON.stringfy()的后两个参数：第三个参数是对空格和制表符的处理，第三个参数解析详见 [https://dillionmegida.com/p/second-argument-in-json-stringify/](https://dillionmegida.com/p/second-argument-in-json-stringify/)

8. `import.meta.url` 返回该文件的静态地址，`new URL('/foo', 'https://example.org/a.js')` 返回结果为

   ```js
   URL {
     href: 'https://example.org/foo',
     origin: 'https://example.org',
     protocol: 'https:',
     username: '',
     password: '',
     host: 'example.org',
     hostname: 'example.org',
     port: '',
     pathname: '/foo',
     search: '',
     searchParams: URLSearchParams {},
     hash: ''
   }
   ```

9. 执行 `shell` 脚本的时候尽量使用 `git bash here`，能保证脚本顺畅执行，不会有环境问题。



### 总结

本文首先介绍了 `git` 钩子的概念，和 `git` 提供的部分钩子文件以及存放位置，接着介绍了 `husky` 的基本使用，然后对 `husky` 项目的主要文件做了详细分析。

使用 `husky` 之后，`git` 在执行钩子文件时，因为 `husky` 改变了 `hooks path`，所以会首先在 `.husky/_/` 文件目录中查找，该目录下的钩子文件内容都被更改为了调用 `h` 文件，所以下一步是执行 `h` 文件，进而执行 `.husky/` 目录下用户配置的钩子。



### 参考资料

[https://dailybing.com/index/zh-cn/1.html](https://dailybing.com/index/zh-cn/1.html)

[https://www.bilibili.com/video/BV1jY411k7EL/](https://www.bilibili.com/video/BV1jY411k7EL/)

[https://docs.npmjs.com/cli/v10/using-npm/scripts/](https://docs.npmjs.com/cli/v10/using-npm/scripts/)

[https://typicode.github.io/husky/](https://typicode.github.io/husky/)

[https://dillionmegida.com/p/second-argument-in-json-stringify/](https://dillionmegida.com/p/second-argument-in-json-stringify/)