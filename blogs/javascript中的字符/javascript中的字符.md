1.JavaScript是在Unicode编码是16位的时候诞生的，因此在我们使用字符串的原生方法操作字符串的时候，字符串被看作为一个16位无符号不可变数组，解析字符串的时候也是按照16位为一组解析的。无符号数的范围从0x0000~0xFFFF，共65536个数字。

在这种情况下，使用String.fromCharCode() 和"string".charCodeAt(index) 两个API可以完成无符号整数和字符之间的转换。

```js
String.fromCharCode(97) // 'a'

'a'.charCodeAt(0) // 97
```

2.后来Unicode编码扩展到了5+16=21位，范围从0x000000~0x10FFFF。低16位的范围还是0x0000~0xFFFF，在其他位为0的情况下，表示的正是Unicode编码为16位时候的字符集。高五位值的范围从0-16，共17个数值，因此共1114112个数值。

为了兼容此次升级，JavaScript使用两个16位无符号整数表示一个超过UTF-16编码表示范围的字符。假设一个超过范围的无符号整数0x1F4A9，其在JavaScript中被保存为 "\uD83D\uDCA9"。在这种情况下，可以使用String.fromCodePoint() 和"string".'💩'.codePointAt(0) 这两个API 来完成数值和字符之间的转换。

```js
String.fromCodePoint(0x1F4A9) // '💩'

'💩'.codePointAt(0) // 128169
```

不过如果使用的是字符串的原生API，就不会触发正常的解析。

```js
'💩'.slice(0) // '💩'

'💩'.slice(1) // '\uDCA9'
```

3.下面说一下21位Unicode编码到两个16位Unicode编码的转换。

假设有一个数值为0x1F4A9，我们保留低16位，删去其他位，得到0x0F4A9，此数值的高十位为0x03D，低十位为0x0A9，将高十位与0xD800相加，将低十位与0xDC00，最终得到"\uD83D\uDCA9"。

4.21位Unicode编码中，并不是所有的数值都分配有对应的字符。

5.还可以通过以下方式在字符串字面量中编写代码点0x1F4A9

```js
"\uD83D\uDCA9" === "\u{1F4A9}" // true
```

##### 参考

[《JavaScript高级程序设计》(第4版)  - [美] 马特·弗利斯比](https://www.dedao.cn/ebook/detail?id=XOnaYG1qlM7amvGYerDZOy9JVnXL40BXxo3Bkp1NKxoRdb86P2Q5AzgEj9vE5rDo)

[《JavaScript悟道》- [美] 道格拉斯·克罗克福德](https://www.dedao.cn/ebook/detail?id=EJmMZXq1b8qOpBlD69XAdP7LEGaKJWEV1L3xRnme5vrVzo4QMZYgNyk2jNA5467K)

[JavaScript’s internal character encoding: UCS-2 or UTF-16?](https://mathiasbynens.be/notes/javascript-encoding)