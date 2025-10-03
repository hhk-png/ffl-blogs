### 简介

`JSON` 是一种轻量级的数据交换格式，其设计来源于js语言语言标准ECMA-262第三版的一部分功能或语法规则。所有的c系语言在内部都能够表示json的数据结构，都能够实现 `json` 的 `parse` 和 `stringify` 方法。

在 `js` 中，除了 `parse` 和 `stringify` 之外，还有两个方法是 `JSON.rawJSON()` 和 `JSON.isRawJSON()`，这两个方法的出现是为了弥补js本身的缺陷。js中的number类型使用的是IEEE754标准的64位浮点数表示，在表示超过64位浮点数最大表示范围的数字时，js会将这个数字四舍五入到最接近的可表示数字，比如 `JSON.stringify({ value: 12345678901234567890 });` 的结果是 `{"value":12345678901234567000}`，最后面的`890` 被转换成了`000`，想要表示的数字与真实值不一样。这个时候如果先将 `12345678901234567890` 用 rawJSON 包裹，然后再将其作为value的值进行stringify，就可以达到预期的效果，如下：

```js
const rawJSON = JSON.rawJSON("12345678901234567890");
JSON.stringify({ value: rawJSON });
// {"value":12345678901234567890}
```

上面的代码，首先通过`JSON.rawJSON`将`12345678901234567890`转换为了一个json字符串，在要序列化的js对象中，将`rawJSON`作为`value`的值，然后调用`JSON.stringify`，最终表示的数字就和预期一样，是12345678901234567890，且没有被转换为`string`类型。

`JSON.rawJSON` 可以将字符串、数字、关键字（true，false，null）转换为rawJSON，不可以转换数组和对象，否则会报错。`JSON.isRawJSON` 则是判断一个值是不是一个`rawJSON`。

本文先讲一下js中json的parse方法的解析过程，即将`json`字符串转换为js中的对象，其实现与目前js正在用的实现有一些出入，会有一些没有覆盖到的地方。之后会借用ling这个ai框架讲一下json解析过程的应用。

### JSON.parse的解析过程

json中共有6中数据类型，分别是对象、数组、字符串、数字、布尔（true和false）、null。对于对象类型，由不定数量的键值对组成，用逗号分隔，用大括号（{，}）包裹，其中对象的键为字符串，值为json的数据类型。对于数组类型，数组的值的范围为json所有的数据类型，用逗号分隔，用中括号（[，]）包裹。布尔值和null都有固定的表示形式，所以可以当作关键字来解析。因此，在解析的时候，json的类型可以分为三类，第一类是关键字，有true、false 和 null，第二类是基础类型，包括字符串，数字，也可以说原子类型，第三类是高级类型，有对象和数组，由前面的基础类型和关键字，再增加一些特定的表达形式组成。

首先定义一个解析函数 `parse`，然后定义一个i变量，表示在当前字符串中的位置，如下：

```typescript
function parse(str: string) {
    let i: number = 0
}
```

#### 关键字的解析

关键字在 `json` 字符串中的表达形式固定，如果在字符串中的字符为 `"true"`，那该值就为布尔类型 `true`，如果为 `"null"`，该值就是 `null`，`false` 同理。因此定义如下函数：

```typescript
const parseKeyword = (name: string, value: boolean | null):  => {
    if (str.slice(i, i + name.length) === name) {
        i += name.length
        return value
    } else {
        return undefined
    }
}

// use in parse(str: string)
parseKeyword('true', true) 
parseKeyword('false', false)
parseKeyword('null', null)
```

`parseKeyword` 函数接收两个参数，第一个参数为关键字的字符串表达形式，第二个参数为该关键字对应的值。在函数中，从 `i` 位置的字符串进行截取，截取 `name` 长度个字符，如果截取的字符串与 `name` 相同，则先将i向后移动 `name` 长度个字符，然后返回对应的值，如果与 `name` 不相同，则返回 `undefined`。`parseKeyword` 函数定义在 `parse` 函数中，`i` 变量也是从 `parse` 函数的作用域中获取。之后是 `parseKeyword` 的使用例子，共有三个。

关键字的解析并不会与字符串的解析相混淆，因为字符串是以 `"` 开头的。

#### 字符串的解析

`json` 中字符串以 `"` 开头，后面跟一堆字符，然后以 `"` 结尾。字符类型有三中，第一种是正常字符，第二种是转义字符，以 `\` 开头，后面跟 `b`、`f`、`n` 等一些特定的字符来形成另一种表示，`\n` 就是换行符，`\b` 为空格，第三种是 `unicode` 字符，以 `\u` 开头，后面跟四个十六进制的数字。在解析的时候，可以先分为两类，以 `\` 开头的和不以 `\` 开头的，在以\开头的判断中再分别处理转义字符和 `unicode` 字符。

在 `json` 中，时间通常为 `ISO 8601` 格式，通过字符串来表示，因此在解析完字符串之后，需要先通过正则表达式来判断该字符串表示的是否是时间，然后返回对应的结果。

```typescript
const ISORegExp =
  /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?$/

const parseString = () => {
    if (str[i] === '"') {
        let result = ''
        // "
        i++
        while (str[i] !== '"') {
            if (str[i] === '\\') {
				// handle in bottom
            } else {
                result += str[i]
            }
            i++
        }
        if (str[i] !== '"') {
            throw new Error()
        }
        // "
        i++
        if (ISORegExp.test(result)) {
            return new Date(result)
        }
        return result
    } else {
        return undefined
    }
}
```

上述代码定义了字符串解析函数的实现，最开始定义了一个 `ISO` 时间格式的正则表达式。在 `parseString` 函数中，首先判断第一个字符是不是 `"`，如果不是则返回 `undefined`，如果是再进行处理。先初始化 `result` 为空字符串，然后调用 `i++` 跳过最开始的"字符。`json` 字符串需要以 `"` 结尾，所以以当前位置字符不为 `"` 作为 `while` 循环的跳出条件，不断向前遍历。在 `while` 循环内部，如果是普通字符则直接拼接到 `result`，如果为其他类型的字符，则需要做进一步处理，后面在讲。跳出循环之后，`i` 位置应该为 `"`，如果不是需要报错，这里报错的逻辑简化处理，没有携带报错信息。之后调用 `i++` 跳过最后的引号（"），此时字符串已经解析完成，并将结果存储到了 `result` 中，在返回结果之前，使用 `ISORegExp` 正则表达式验证 `result` 是否是时间，如果是，返回的是一个 `Date` 对象，如果不是返回的是 `result` 字符串。

下面介绍一下转义字符和 `unicode` 字符的解析：

```typescript
// ....

if (str[i] === '\\') {
    i++
    const char = str[i]
    if (char === '"') {
        result += '"'
    } else if (char === '\\') {
        result += '\\'
    } else if (char === '/') {
        result += '/'
    } else if (char === 'b') {
        result += '\b'
    } else if (char === 'f') {
        result += '\f'
    } else if (char === 'n') {
        result += '\n'
    } else if (char === 'r') {
        result += '\r'
    } else if (char === 't') {
        result += '\t'
    } else if (char === 'u') {
        // \u unicode-16 编码
        if (
            isHexadecimal(str[i + 1]) &&
            isHexadecimal(str[i + 2]) &&
            isHexadecimal(str[i + 3]) &&
            isHexadecimal(str[i + 4])
        ) {
            result += String.fromCharCode(
                parseInt(str.slice(i + 1, i + 5), 16)
            )
            i += 4
        } else {
            throw new Error()
        }
    } else {
        result += str[i]
    }
}

// ....
```

js中，转义字符需要以`\\`来表示。先调用 `i++` 跳过转义字符，然后取转义字符之后的字符，如果该字符为 `"`、`/`、`\`，则直接在result上拼接拼接这些字符，如果为 b、f、n、r、t，则需要拼接对应的特殊字符，即在前面增加 `\`，`\b`、`\f` 等占一个字节。如果为 `u`，表示是一个 `unicode` 字符，则判断 `u` 往后的四个字符是不是16进制的数字，即字符是不是在0-9，a-f，A-F范围内，如果是，则截取这四个字符，使用 `parseInt` 将其作为16进制的数字来解析，再之后使用 `String.fromCharCode` 将其解析为字符并拼接到 `result` 上，如果 `\u` 后面的字符不是十六进制的数字，则进行报错。最开始的转义符 `\` 后面如果跟的不是特定的英文字母，则需要做的是将其后面的字符拼接到 `result` 上。判断是否是十六进制数的函数 `isHexadecimal` 如下：

```typescript
const isHexadecimal = (char: string) => {
    return (
        (char >= '0' && char <= '9') ||
        (char.toLowerCase() >= 'a' && char.toLowerCase() <= 'f')
    )
}
```

js中的字符格式为 `UTF-16`，一个字符占两个字节，但也有的 `unicode` 字符无法用两个字节来表示，需要用到四个字节，两个 `unicode` 字符，比如 `😀`。在 `parseString` 的时候会将这样的字符当作两个独立的 `unicode` 字符来解析，拼接到最终结果上，所以 `parseString` 函数可以正常解析四个字节的字符。

#### 数字的解析

数字有三种表达形式，分别整数、小数、科学计数法表示的数字，在解析的过程中还涉及到正负数的问题。

与字符串的解析不同，解析数字时，是先记录 `i` 的初始位置为 `start`，然后将i移动到数字之后的最后一位，然后截取这之间的字符串，通过 `Number` 函数转换为数字返回，如果i没有移动，则返回 `undefined`。

```typescript
const isSign = (char: string) => {
  return char === '-' || char === '+'
}

const isDigit = (char: string) => {
  return char >= '0' && char <= '9'
}

const expectDigit = (str: string) => {
    if (!isDigit(str)) {
        throw new Error()
    }
}

const parseNumber = () => {
    let start = i
    if (isSign(str[i])) {
        i++
        // i 位置应该为数字
        expectDigit(str[i])
    }
    while (isDigit(str[i])) {
      i++
    }

    if (str[i] === '.') {
        i++
        expectDigit(str[i])
        while (isDigit(str[i])) {
            i++
        }
    }

    if (str[i] === 'e' || str[i] === 'E') {
        i++
        if (isSign(str[i])) {
            i++
        }
        expectDigit(str[i])
        while (isDigit(str[i])) {
            i++
        }
    }
    if (i > start) {
        return Number(str.slice(start, i))
    }
    return undefined
}
```

最开始先通过 `isSign` 判断 `i` 位置是不是正负号，如果是，则将 `i` 向前移动一位，并使用 `expectDigit` 判断移动后的位置应该一个数字，如果不是需要报错。之后将 `i` 向后移动，并保证这些位置上的字符都为数字。至此整数的解析已经完成，另外要考虑的是小数和科学计数法。因为科学计数法的系数（`e` 之前）也可以是小数，所以先对小数进行处理，然后再看情况解析 `e` 和之后的数字。为 `.` 时，先向前移动一个字符，然后向前移动一个整数的距离。为 `e` 或者 `E` 时，向前移动一个字符，然后判断正负号，再之后向前移动一个整数的距离。最后再使用 `Number` 函数将 `[start, i)` 范围内的字符串转换为 `number` 返回。

#### 值的解析函数

整个json字符串都可以当作一个值来看待，不管这个值是对象、数组，还是字符串等任何类型，都可以是被合法解析的。对象和数组中的值也可以是对象和数组这样的高级类型，进行嵌套。因此解析的主函数可以如下定义：

```typescript
const skipWhitespace = () => {
    while (/\s/.test(str[i])) {
        i++
    }
}

const parseValue = () => {
    skipWhitespace()
    const value: any =
          parseString() ??
          parseNumber() ??
          parseObject() ??
          parseArray() ??
          parseKeyword('true', true) ??
          parseKeyword('false', false) ??
          parseKeyword('null', null)
    skipWhitespace()
    return value
}
```

`parseValue` 是 `json` 中值的解析函数，既可以用于解析整个 `json` 字符串，也可以用于解析数组或对象中的值。`parseValue` 依赖 `skipWhitespace` 来跳过空白字符，在其中通过正则表达式来判断当前字符是不是空白字符，如果是，则向前移动一位，跳过，使用 `while` 循环来不断向前移动，直到 `i` 位置的字符为空白字符，`parseValue` 在最前面和最后面都会调用 `skipWhitespace` 来跳过空白字符。

`value` 是通过将各个parse函数调用并用??运算符连接获取。空值合并运算符（??）是一个逻辑运算符，当左侧的操作数为 `null` 或者 `undefined` 时，返回其右侧操作数，否则返回左侧操作数。此运算符与逻辑或（||）运算符的区别是操作数不会发生隐式类型转换，表达式 `"" || 1` 的返回结果是1，表达式 `"" ?? 1` 的返回结果是 `""`，原因是使用 `||` 时，`""` 会被返回 `false`。`parseValue` 中 `value` 的计算可以理解为会返回多个 `parseXXX` 函数中返回值不为 `undefined` 的那一个，前面在讲解关键字等解析的时候解析不成功会返回一个 `undefined`，就是这个作用。`json` 字符串中所有数据类型的第一个字符都不相同，所以正常情况下肯定会有一个parse函数返回对应的值，其他的parse函数返回 `undefined`。

`parseArray` 和 `parseObject` 会在后面讲解。

#### 数组的解析

`json` 中数组的值可以是任何类型，用逗号连接，最后一个值后面的非空字符不可以为逗号，必须是 `]`，否则应该报错，值、逗号、方括号之间允许空格存在。在具体解析的时候，除了方括号以外，会将逗号和后面的值作为一个整体，来使用 `while` 循环进行解析，比如 `[a,b,c]` 这个数组，会按照 `,a`、`,b`、`,c` 的结构来解析，因为最开始的 `a` 没有 `,`，所以会做一些特殊的处理，具体如下：

```typescript
const expectNotCharacter = (expected: string) => {
    if (str[i] === expected) {
        throw new Error()
    }
}

const expectCharacter = (expected: string) => {
    if (str[i] !== expected) {
        throw new Error()
    }
}

const eatComma = () => {
    expectCharacter(',')
    i++
}

const parseArray = () => {
    if (str[i] === '[') {
        // [
        i++
        skipWhitespace()
        const result = []
        let initial = true
        while (str[i] !== ']') {
            if (!initial) {
                eatComma()
                skipWhitespace()
            }
            expectNotCharacter(']')
            const value = parseValue()
            skipWhitespace()
            result.push(value)
            initial = false
        }
        // 应该以 ] 结尾
        if (str[i] !== ']') {
            throw new Error()
        }
        // ]
        i++
        return result
    } else {
        return undefined
    }
}
```

与之前一样，最开始会做一个特判，如果第一个字符不为 `[`，则会返回 `undefined`。在开始解析时，会先调用 `i++` 跳过 `[`，调用 `skipWhitespace()` 跳过空格，然后声明一个 `result` 数组和用来处理最开始的逗号的 `initial` 变量，表示是否处于最前面，在 `while` 循环的最后会被置为 `false`。之后就是使用 `while` 循环来不断的解析数组中的值，如果为初始状态，则不会执行 `eatComma()` 来检测当前位置是不是 `,` 并向前移动一个字符的距离，如果 `initial` 为 `false`，则表示执行了一次 `while` 循环，会在这次循环内将 `,` 和值当作一个整体来解析。`if` 判断之后会执行一次 `expectNotCharacter(']')`。然后调用 `parseValue` 进行值的解析，如果该数组的解析是发生在其他数组或对象的内部，则调用 `parseValue` 的时候发生的是一次递归调用，值解析完成之后会将其放入 `result` 数组中。跳出 `while` 循环之后，因进行一次最后的字符是 `]` 的判断，并使用 `i++` 跳过该字符，最后返回 `result`。

#### 对象的解析

与数组的解析类似，json中对象字符串和数组字符串的区别是方括号换成了大括号，然后值变成了 `key: value` 键值对。`key: value` 键值对以逗号分隔，但最后一个键值对的后面也是不能携带逗号。具体解析如下：

```typescript
const eatColon = () => {
    expectCharacter(':')
    i++
}

const parseObject = () => {
    if (str[i] === '{') {
        // {
        i++
        skipWhitespace()

        const result: any = {}
        let initial = true
        
        while (i < str.length && str[i] !== '}') {
            if (!initial) {
                eatComma()
                skipWhitespace()
            }
            const key: any = parseString()
            if (key === undefined) {
                throw new Error()
            }
            skipWhitespace()
            eatColon()
            skipWhitespace()
            const value = parseValue()
            skipWhitespace()
            result[key] = value
            initial = false
        }
        if (str[i] !== '}') {
            expectNotEndOfInput('}')
        }
        // }
        i++
        return result
    } else {
        return undefined
    }
}
```

代码的整体结构与 `parseArray` 相同，`parseObject` 会判断第一个字符是不是 `{`，然后跳过该字符和空格，声明 `result` 为对象，并使用 `initial` 变量跳过最开始的逗号的解析，在 `while` 循环内部进行 `key:value` 键值对的解析，在最后判断最后一个字符应该为 `}`，然后跳过 `}`，返回结果。

在解析 `key:value` 键值对时，解析 `key` 的时候使用的是 `parseString()`，然后调用 `eatColon()` 跳过冒号（:），调用 `parseValue()` 解析值，最后将结果放入 `result` 当中，解析完成后返回。

要对一个完整的json字符串进行解析，只需要调用parseValue就可以，最后判断一下i应该大于等于json字符串的的长度，如下：

```typescript
function parse(str: string) {
    let i: number = 0
    
    // ....
    
    const value = parseValue()
    if (i < str.length) {
        throw new Error()
    }
    return value
}
```

代码地址为：[https://github.com/hhk-png/json-implementation](https://github.com/hhk-png/json-implementation)

### Ling

> 本博客引用了 [ling](https://github.com/WeHomeBot/ling) 中的部分内容，该项目基于 [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0) 授权。 
>
> 在 AI 内容生成工作流中，使用结构化的 JSON 作为输入输出有非常多的便利性，因为 JSON 自带有意义的结构和语义化的字段名，能够让 AI 天然非常好地理解工作内容，大大节省提示词，同时因为 JSON 的扩展性增加工作流的扩展能力。
>
> 但是 JSON 结构也有弊端，因为 JSON 是一种封闭的数据结构，具有完整的结构，从 `{` 开始到 `}` 结尾，正常情况下只有完整生成全部内容， JSON 结构才能完整并被解析。这带来一个问题，就是追求快速响应的一些场景里，JSON 数据协议和流式输出是冲突的，虽然流式输出能减少接收到数据的时间，但是因为流式输出过程中 JSON 结构不完整，导致前端很难立即使用这些输入，这就造成了流式输入的优势丧失。
>
> AI 流式响应框架 Ling ( https://ling.bearbobo.com）就是专注于这个问题，提供一种流式输出 JSON 结构的解决方案，它的核心是一个实时解析 JSON Token 的解析器，将实时解析的内容立即以 Stream 的方式，用 JSONURI 的数据协议格式发送给前端处理，而且默认支持 Server Sent Events，让前端能够非常方便地立即接收并更新结构化数据。

假设从大模型接收到的数据如下：

```
{
  "outline": [
    {
      "topic": "What are clouds?"
    },
}
```

在进行数据的流式传输时，json字符串的接收顺序是从前往后，在处理前面的数据时还未收到最后的 `}`，这样的话因为前端无法接收到完整的json数据，导致数据难以利用。在经过ling处理之后，往前端传输的数据就变成了如下的一系列对象：

```json
{"uri": "outline/0/topic", "delta": "W"}
{"uri": "outline/0/topic", "delta": "h"}
{"uri": "outline/0/topic", "delta": "a"}
{"uri": "outline/0/topic", "delta": "t"}
{"uri": "outline/0/topic", "delta": " "}
{"uri": "outline/0/topic", "delta": "a"}
{"uri": "outline/0/topic", "delta": "r"}
{"uri": "outline/0/topic", "delta": "e"}
{"uri": "outline/0/topic", "delta": " "}
{"uri": "outline/0/topic", "delta": "c"}
{"uri": "outline/0/topic", "delta": "l"}
{"uri": "outline/0/topic", "delta": "o"}
{"uri": "outline/0/topic", "delta": "u"}
{"uri": "outline/0/topic", "delta": "d"}
{"uri": "outline/0/topic", "delta": "s"}
{"uri": "outline/0/topic", "delta": "?"}
```

这种数据格式叫做 `jsonuri`，其中对象中的 `uri` 属性是一个层级式路径描述，使用斜杠 `/` 分隔各个层级，`outline` 表示顶层对象的 `outline` 字段，`0` 表示 `outline` 对应数组的第一个元素，`topic` 则是第一个数组元素的 `topic` 字段。`jsonuri` 对象是解析值的时候生成的，上面的对象是在解析 `topic` 对应的值的时候生成的，将 `delta` 的字符连接起来就可以得到完整的字符串。

前端接收到数据后，使用 [jsonuri](https://github.com/aligay/jsonuri) 这个库的 `set` 和 `get` 方法就可以将这些数据依此拼接起来，达到流式传输的效果。下面是一个简易的演示，摘自 [ling](https://github.com/WeHomeBot/ling)，项目github上的例子更完善。

```typescript
import { get, set } from 'jsonuri'
const data = {
    answer: 'Brief:',
    details: 'Details:',
    related_question: [],
};
const content = get(data, input.uri);
set(data, input.uri, (content || '') + input.delta);
```

除此之外，`ling` 的 `jsonuri` 解析器还提供了部分情况下的纠错功能。比如 `"outline”` 这个 `json` 字符串的右引号是中文形式的，使用 `ling` 的时候就会将右侧的引号自动纠错。

下面会介绍 `ling` 的 `json` 解析器的实现。

#### 有限状态机的状态转移

`ling` 的 `json` 解析采用的是主流的词法分析、语法分析的过程，也是将字符串转换为ast的过程，将对 `json` 的解析转换为了一个有限状态机，定义了11个状态，如下：

```typescript
const enum LexerStates {
    Begin = 'Begin',
    Object = 'Object',
    Array = 'Array',
    Key = 'Key',
    Value = 'Value',
    String = 'String',
    Number = 'Number',
    Boolean = 'Boolean',
    Null = 'Null',
    Finish = 'Finish',
    Breaker = 'Breaker',
}
```

其中 `Object`，`Array`，`String`，`Number`，`Boolean`，`Null` 代表的是解析对应数据类型时候的状态，`Key` 是在解析对象的键时的状态，`Value` 是在解析对象和数组的值时的状态，`Begin` 是最开始的状态，在解析器初始化时就会存在，`Finish` 时解析完成时的状态，最终要求该状态机要停留在 `Finish` 状态上，`Breaker` 则是在碰到数组的值和对象键值对之间间隔时要转移到的状态。

`ling` 的 `parser` 主要目的不是为了解析 `json` 字符串，而是生成前面说的那种 `jsonuri`，所以会额外存在一些操作来达到生成jsonuri的目的。

为了表示 `json` 中的层级，状态机使用栈来存放状态，下面通过一个例子来介绍一下解析中的状态转移：

```json
{"name" : "Alice"}
```

初始时栈中的状态为 `Begin`，读取第一个字符 `{` 会向栈中加入Object，读取字符 `"` 会向栈中加入 `Key` 和 `String` 两个状态，读取 `n` 时，因为是字符串所以会将该字符拼接到一个变量中，叫做 `currentToken`，之后的 `ame` 同理。读取之后的 `"` 时，会进行状态的归约，首先将`currentToken` 存储到一个临时变量 `str` 中，之后将 `currentToken` 清空，将状态栈栈顶的 `String` 出栈，然后将 `str` 放到 `keyPath` 当中，`keyPath` 适用于存储层级路径的数组。在字符串外面遇到遇到空格时，状态机会自动忽略。此时栈顶的状态为 `Key`，在遇到 `:` 时，会先将状态 `Key` 出栈，然后将 `Value` 放到栈中，之后是忽略空格，遇到 `"`，将 `String` 放到状态栈中。此时栈顶的状态为 `String`，前一个状态为 `Value`，所以在逐个解析 `Alice` 的时候，会不断地产生 `jsonuri` 数据，比如读到 `A` 的时候产生的数据如下：

```typescript
{
    uri: this.keyPath.join('/'),
    delta: input,
}
```

其中的 `uri` 为层级路径，由 `keyPath` 拼接而成，`delta` 对应的 `input` 则为 `'A'`， 在读取之后的 `lice` 的时候，也会产生这种数据，只是其中的 `input` 换成了对应的字符，`uri` 不变。

继续读取到最后一个 `"`，会将状态栈顶的 `String` 出栈，将 `keyPath` 栈顶的值出栈，此时为 `"name"`，然后向状态栈中放入Breaker状态。继续读取 `}`，将 `Breaker` 和 `Value` 分别出栈，此时栈顶为 `Object`，然后重新读取 `}`，出栈 `Object`，出栈 `Begin`，放入 `Finish`，状态转换，结束。

下面，左边的颜色代表是 `Key`，`String` 状态，右边的颜色代表是 `Value`，`String` 状态，在 `:` 处发生转换。<span style="font-weight:bold; padding: 1px 5px; border: 1px solid black;">{<span style="background-color: #f4d200;">"name" :</span> <span style="background-color: #ff87a2;">"Alice"</span>}</span>



#### JSONParser

```typescript
export class JSONParser extends EventEmitter {
    private content: string[] = [];
    private stateStack: LexerStates[] = [LexerStates.Begin];
    private currentToken = '';
    private keyPath: string[] = [];
    private arrayIndexStack: any[] = [];
    get currentState() {
        return this.stateStack[this.stateStack.length - 1];
    }
    get lastState() {
        return this.stateStack[this.stateStack.length - 2];
    }
    get arrayIndex() {
        return this.arrayIndexStack[this.arrayIndexStack.length - 1];
    }
}
```

`ling` 的 `JSONParser` 类继承自 `EventEmitter`，这样在class中调用 `this.emit(eventName, "data")` 的时候就能够通过该类的实例上使用 `on(eventName, (data)=>{})` 接收类内传输的数据。

其中的 `content` 存储的是 `json` 字符串的各个字符，正常解析的情况下，`content.join('')` 的值一定是一个合法的 `json` 字符串。`stateStack` 则是状态栈，初始的时候会放一个默认的 `LexerStates.Begin`，`currentToken` 和 `keyPath` 如上一小结描述的作用。`arrayIndexStack` 用于存储数组索引，`arrayIndex` 表示当前的数组索引。`currentState` 和 `lastState` 和名字描述的一样。

#### trace函数

```typescript
public trace(input: string) {
    const currentState = this.currentState;

    const inputArray = [...input];
    if (inputArray.length > 1) {
        inputArray.forEach((char) => {
            this.trace(char);
        });
        return;
    }

    this.content.push(input);
    if (currentState === LexerStates.Begin) {
        this.traceBegin(input);
    }
    else if (currentState === LexerStates.Object) {
        this.traceObject(input);
    }
    else if (currentState === LexerStates.String) {
        this.traceString(input);
    }
    else if (currentState === LexerStates.Key) {
        this.traceKey(input);
    }
    else if (currentState === LexerStates.Value) {
        this.traceValue(input);
    }
    else if (currentState === LexerStates.Number) {
        this.traceNumber(input);
    }
    else if (currentState === LexerStates.Boolean) {
        this.traceBoolean(input);
    }
    else if (currentState === LexerStates.Null) {
        this.traceNull(input);
    }
    else if (currentState === LexerStates.Array) {
        this.traceArray(input);
    }
    else if (currentState === LexerStates.Breaker) {
        this.traceBreaker(input);
    }
    else if (!isWhiteSpace(input)) {
        this.traceError(input);
    }
}
```

上述代码描述的是用于解析的 `trace` 函数，类似于 `JSON.parse`，删除了源代码的一些东西。

最开始的操作是获取当前栈顶的状态，如果是第一次解析，这个值为 `Beigin`。之后会使用扩展运算符将字符串转换为数组，然后进行依此判断，如果该数组长度大于一，则将该数组中的字符逐个调用 `trace` 解析，那如果小于等于 `1`，则执行正常的解析流程。因为整个 `parser` 是一个状态机，这样的作法也保证了能够对字符串进行断点解析，不用一次性解析所有的字符串，哪怕最后的 `json` 字符串结构出错，也能够保证前面解析数据的时候能够产生正确的输出。

在进行状态判断之前，会先将当前正在处理的字符放到 `content` 当中，接下来就是根据当前的状态调用不同状态的解析函数来进行状态机状态的转移和数据的收集。

#### traceBegin

最开始会调用 `traceBegin`，在遇到 `{` 时会将状态转移为 `Object`，遇到 `[` 会将状态转移为 `Array`，其他情况会调用 `traceError`，里面有自动纠错的逻辑，可以自动修正一些不正确的 `json` 写法，也是使用 `if else` 根据当前的状态选择对应的纠错逻辑。目前只处理了对象和数组两种情况，其他情况比如纯字符串等没处理，要处理也是应该是以 `traceBegin` 为入口，在流程内加入其他处理逻辑。

```typescript
private traceBegin(input: string) {
    if (input === '{') {
        this.pushState(LexerStates.Object);
    } else if (input === '[') {
        this.pushState(LexerStates.Array);
    } else {
        this.traceError(input);
        return;
    }
}
```

#### traceObject

下面是traceObject的逻辑，主要对对象的开始和结束进行处理。

```typescript
private traceObject(input: string) {
    if (isWhiteSpace(input) || input === ',') {
        return;
    }
    if (input === '"') {
        this.pushState(LexerStates.Key);
        this.pushState(LexerStates.String);
    } else if (input === '}') {
        this.reduceState();
    } else {
        this.traceError(input);
    }
}
```

在开始的时候，首先对空格和逗号进行跳过，然后当字符为 `"` 的时候，向状态栈中加入 `Key` 和 `String`，开始执行 `key-value对` 解析逻辑。当为 `}` 时，执行状态的归约，对应的归约逻辑如下所示。其余情况执行 `traceError`。

```typescript
private reduceState() {
    // ....
    else if (currentState === LexerStates.Array || currentState === LexerStates.Object) {
        this.popState();
        if (this.currentState === LexerStates.Begin) {
            this.popState();
            this.pushState(LexerStates.Finish);
            const data = (new Function(`return ${this.content.join('')}`))();
            this.emit('finish', data);
        } else if (this.currentState === LexerStates.Value) {
            this.pushState(LexerStates.Breaker);
        }
    }
    // ....
}
```

此时这里的 `this.popState` 可以简单理解为将栈顶的状态出栈，如果出栈后的顶部状态为 `Begin` 则表示该对象在最外层，目前正在解析该 `json` 的最后一个字符，则会将 `Begin` 状态弹出，放入 `Finish` 状态，并将 `content` 拼接转换成对象，传入到 `finish` 事件。这里将 `content` 转换为 `js` 对象使用的方式是 `Function`。如果 `currentState` 为 `Value`，表示到了 `key-value对` 的最后，向栈中放入 `Breaker`。

#### traceString

代码如下，`traceString` 中共有四个判断，其中中间两个判断是纠错逻辑，在开启了纠错功能并且满足了特定的情况之后就可以进行纠错。第一个和最后一个判断是解析字符串时的必要步骤。这里只讲普通的解析逻辑，不讲解纠错。

```typescript
private traceString(input: string) {
    if (input === '\n') {
        this.traceError(input);
        return;
    }
    const currentToken = this.currentToken.replace(/\\\\/g, '');
    if (input === '"' && currentToken[this.currentToken.length - 1] !== '\\') {
        const lastState = this.lastState;
        this.reduceState();
        if (lastState === LexerStates.Value) {
            this.pushState(LexerStates.Breaker);
        }
    } 
    else if(this.autoFix && input === ':' && currentToken[this.currentToken.length - 1] !== '\\' && this.lastState === LexerStates.Key) {
		// 默认这种情况下少了右引号，补一个
        this.content.pop();
        for(let i = this.content.length - 1; i >= 0; i--) {
            if(this.content[i].trim()) {
                break;
            }
            this.content.pop();
        }
        this.trace('":');
    } 
    else if(this.autoFix && isQuotationMark(input) && input !== '"' && this.lastState === LexerStates.Key) {
        // 处理 key 中的中文引号和单引号
        this.content.pop();
        return;
    } else {
        this.currentToken += input;
        if (this.lastState === LexerStates.Value) {
            this.emit('data', {
                uri: this.keyPath.join('/'),
                delta: input,
            });
        }
    }
}
```

最后一个判断的作用是拼接字符串，如果当前的字符串在对象和数组的值中，就会产生 `uri` 数据。第一个判断是判断字符串的末尾 `"`，进行状态的归约，如果解析的是值，则要入栈一个 `Breaker`。状态为 `String` 时候的归约逻辑如下：

```typescript
else if (currentState === LexerStates.String) {
    const str = this.currentToken;
    this.popState();
    if (this.currentState === LexerStates.Key) {
        this.keyPath.push(str);
    } else if (this.currentState === LexerStates.Value) {
        this.emit('string-resolve', {
            uri: this.keyPath.join('/'),
            delta: str,
        });
    }
}
```

最开始先将 `currentToken` 保存，如果当前解析的字符串是作为键存在，则只会在 `keyPath` 中添加该字符串，也不会执行上一层的添加 `Breaker`。如果是作为值，则会触发 `string-resolve` 事件，并在上一层入栈一个 `Breaker`，表示键值对解析完成。

#### popState

`popState` 的逻辑如下，除了会将状态栈栈顶的状态弹出以外，还会将层级路径进行弹出，只是在作为对象的值的时候弹出 `keyPath`，在作为数组的值的时候还需要额外弹出一个 `arrayIndexStack`。

```typescript
private popState() {
    this.currentToken = '';
    const state = this.stateStack.pop();

    if (state === LexerStates.Value) {
        this.keyPath.pop();
    }
    if (state === LexerStates.Array) {
        this.arrayIndexStack.pop();
    }
    return state;
}
```

#### traceKey

`Key` 状态只在解析对象时存在，其涉及到的主要是状态的转换，不涉及具体的解析逻辑。首先屏蔽掉空格。在遇到 `:` 的时候，要将 `Key` 状态弹出，然后替换为 `Value`，此时状态栈中 `Value` 之上的状态为 `Object`。

```typescript
private traceKey(input: string) {
    if (isWhiteSpace(input)) {
        this.content.pop();
        return;
    }
    if (input === ':') {
        this.popState();
        this.pushState(LexerStates.Value);
    } else {
        this.traceError(input);
    }
}
```

#### traceValue

`traceValue` 函数，发生在解析对象和数组的值的时候，所处理的主要为状态的转换，不涉及具体数据类型的处理。因为值可以是json的任何数据类型，值的类型又可以通过第一个字符来明确的区分，所以可以根据这个特点来进行状态的转换。代码如下，在开始的时候还有一个屏蔽空白字符的判断。

```typescript
private traceValue(input: string) {
    if (isWhiteSpace(input)) {
        return;
    }
    if (input === '"') {
        this.pushState(LexerStates.String);
    } else if (input === '{') {
        this.pushState(LexerStates.Object);
    } else if (input === '.' || input === '-' || isNumeric(input)) {
        this.currentToken += input;
        this.pushState(LexerStates.Number);
    } else if (input === 't' || input === 'f') {
        this.currentToken += input;
        this.pushState(LexerStates.Boolean);
    } else if (input === 'n') {
        this.currentToken += input;
        this.pushState(LexerStates.Null);
    } else if (input === '[') {
        this.pushState(LexerStates.Array);
    } else {
        this.traceError(input);
    }
}
```

`traceArray` 的代码也和 `traceValue` 类似，因为在执行 `traceArray` 的时候已经解析过 `[` 字符了，其要面对的值包括所有的 `json` 数据类型，而且还需要处理遇到 `]` 的情况，以及在判断内要将处理索引信息和层级路径。可以查看源码。

#### traceBoolean

下面为 `traceBoolean` 的代码，最开始使用 `if` 判断排除空白字符，然后判断是不是 `,`，如果是表示值已经解析完成，结果被存储到了 `currentToken` 当中，因为布尔类型的值只有两个，因此判断其是否为 `false` 或者 `true`。如果不是，则执行自动纠错逻辑 `traceError`。

如果遇到了 `}` 或者 `]`，表示到了数组或者对象的末尾，要求 `currentToken` 为 `true` 或者 `false`，然后进行状态的归约，重新 `trace` }或者]。

最后的 `if` 判断进行的是正常的 `true` 和 `false` 字符串的拼接，通过 `sartsWith` 来保证拼接的一定是 `true` 或者 `false`。

```typescript
private traceBoolean(input: string) {
    if (isWhiteSpace(input)) {
        return;
    }

    if (input === ',') {
        if(this.currentToken === 'true' || this.currentToken === 'false') {
            this.reduceState();
        } else {
            this.traceError(input);
        }
        return;
    }

    if (input === '}' || input === ']') {
        if(this.currentToken === 'true' || this.currentToken === 'false') {
            this.reduceState();
            this.content.pop();
            this.trace(input);
        } else {
            this.traceError(input);
        }
        return;
    }

    if ('true'.startsWith(this.currentToken + input) || 'false'.startsWith(this.currentToken + input)) {
        this.currentToken += input;
        return;
    }

    this.traceError(input);
}
```

下面的代码是布尔类型归约时候的逻辑，首先保存 `str`，然后将 `Boolean` 状态弹出，如果当前的布尔值作为对象的 `Value` 或者到了数组的最后一个值，内部还需要进行层级路径的处理。之后如果是值的话，需要触发 `data` 事件，并且将 `Value` 状态抛出。

```typescript
private reduceState() {
    // ....
    else if (currentState === LexerStates.Boolean) {
        const str = this.currentToken;
        this.popState();
        if (this.currentState === LexerStates.Value) {
            this.emit('data', {
                uri: this.keyPath.join('/'),
                delta: isTrue(str),
            });
            this.popState();
        }
    }
    // ....
}
```



### 总结

json的解析过程可以看作是一个将字符串转换为一个ast抽象语法树的过程。本文首先讲解了一种基于 `??` 的json解析过程。然后借助 `ling` 讲解了使用有限状态机来完成json解析任务的方法，讲解了其解析器的部分步骤。ling是一个用于ai流式输出的框架，其对json的解析主要是为了生成jsonuri数据，将json字符串解析为ast不是其主要目的。

因为json的语法比较简单，用第一种方式也可以满足对应的需求，但如果遇到的语法比较复杂，或者需要一些额外的处理，就需要转到有限状态机的方式。



### 参考资料

[ECMA-404 The JSON Data Interchange Standard](https://www.json.org/json-en.html)

[How to Create Your Own Implementation of JSON.stringify()](https://javascript.plainenglish.io/create-your-own-implementation-of-json-stringify-simiplied-version-8ab6746cdd1)

[https://github.com/WeHomeBot/ling](https://github.com/WeHomeBot/ling)

[https://github.com/hhk-png/json-implementation](https://github.com/hhk-png/json-implementation)

[JSON.rawJSON()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/rawJSON)

[空值合并运算符（??）](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)

[https://github.com/aligay/jsonuri](https://github.com/aligay/jsonuri)

[AI 流式结构化输出解决方案](https://mp.weixin.qq.com/s?__biz=MzIzNzA0NzE5Mg==&mid=2247490812&idx=1&sn=129a93cd6dc18a4454104a482aeff5f7&chksm=e92849b5587e426cb4f32ab2c1ba8a5ac8588e923579631a38e0dbda5719151b1d3da7033d12&sessionid=1731985639&scene=126&subscene=91&clicktime=1731985720&enterid=1731985720&ascene=3&fasttmpl_type=0&fasttmpl_fullversion=7477157-zh_CN-zip&fasttmpl_flag=0&realreporttime=1731985720783&devicetype=android-33&version=28003052&nettype=cmnet&abtest_cookie=AAACAA==&lang=zh_CN&session_us=gh_bcef7d5aa32c&countrycode=CN&exportkey=n_ChQIAhIQSCSiRElOJG7nI9RqSFGrIBLxAQIE97dBBAEAAAAAAKhXCh3tb00AAAAOpnltbLcz9gKNyK89dVj0SgictL012KyGAzw6ijTkNhRvHO0imMcCUsxF2klJEqxzXpv2lyaLuErplrKCoxQKoSzqPIxhv0zVf0gGqjkGm7oSrg2KXEMRjUZ5PX/RjmA/7GqBP1qUomVGGpzr/y/EzQWdQAusET/J8Aavdb0584wtn+MpWp2QRCT9+6fdykOdhLXfO0qDEhPZaL3VwfAmQ35eWCqEn7hxky/RGmEepOLzdL6310Vbw/EgfF52cmruCz67TLa0qC0RNuTCuG0G4fOumIT+Gsl673E=&pass_ticket=H8yDFaEaVcelW8Ysv76iBEIDth7+vQ4B3kOLgjCfNuEruhGyGVr5ClUAP3NvftoU&wx_header=3)