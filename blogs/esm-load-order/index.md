### 1.

有以下js代码：

```javascript
// index.js
console.log(1)
import { sin } from './sin.js'
```

```javascript
// sin.js
console.log(2)
export const sin = (x) => {
    return Math.sin(x)
}
```

执行 `index.js` 时，输出顺序是：

```javascript
// 2
// 1
```

这是因为如果使用的esm规范，在执行 `index.js` 时，会先执行其导入的模块文件，然后再执行当前文件的代码，所以先输出 `2`，然后输出 `1`。

### 2.

所以如果在index.js中通过globalThis在全局挂载了一个变量\_B，在sin.js的全局中读取这个变量，就会报错\_B is not defined。代码如下：

```javascript
// index.js
globalThis._B = 1
import { sin } from './sin.js'
```

```javascript
// sin.js
console.log(_B)
export const sin = (x) => {
    return Math.sin(x)
}
```

### 3.

要解决这个问题，一个解决方案是将对\_B的读取放在运行时，而不是在模块加载执行的时候读取，以下代码：

```javascript
// index.js
globalThis._B = 1
import { sin } from './sin.js'
sin(1)
```

```javascript
// sin.js
export const sin = (x) => {
    console.log(_B)
    return Math.sin(x)
}
```

这样在index.js中执行sin的时候就可以打印出\_B的值，而不会报错。

### 4.

另一个解决方案是使用import进行动态加载，如下

```javascript
// index.js
globalThis._B = 1
const sin = await import('./sin.js')
```

```javascript
// sin.js
console.log(_B)
export const sin = (x) => {
    return Math.sin(x)
}
```

这时只需要确保 `globalThis._B = 1` 在 `await import('./sin.js')` 之前执行就可以。

### 5.

在esm中，模块是单例的，首次导入后，模块所有的导出都被缓存，且只会执行一次。如下代码：

```javascript
// index.js
globalThis._B = true
const sinMod = await import('./sin.js')

sinMod.print() // 1

globalThis._B = false
const sinMod2 = await import('./sin.js')
sinMod2.print() // 1
```

```javascript
// sin.js
console.log(22)
function print1() {
  console.log('1')
}
function print2() {
  console.log('2')
}

export const print = _B ? print1 : print2
```

上述代码的输出是：

```javascript
// 22
// 1
// 1
```

即使执行了 `globalThis._B = false`，然后重新加载，加载的sinMod2也会只是用第一次加载的缓存，此时print函数还是print1，而不是print2，所以打印了两个1。

要使import()的模块不相同，可以在路径后面增加一个查询参数，如下：

```javascript
// index.js
globalThis._B = true
const sinMod = await import('./sin.js')

sinMod.print() // 1

globalThis._B = false
const sinMod2 = await import('./sin.js?cacheBust=1')
sinMod2.print() // 1
```

这样sinMod和sinMod2在内存中就是两个不同的模块。代码的输出如下，模块会执行两次。

```javascript
// 22
// 1
// 22
// 2
```

### 6.

如果使用的是commomjs规范，就不会遇到最前面说的问题，因为commonjs模块是同步加载的。下面的代码不会报错，会打印 `1`。

```javascript
// index.js
globalThis._B = 1
const sinMod = require('./sin.js')
```

```javascript
// sin.js
console.log(_B)
module.exports.sin = (x) => {
    return Math.sin(x)
}
```

