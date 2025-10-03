1：js和node中缓冲池有：`ArrayBuffer`，`Buffer`，`SharedArrayBuffer`。`ArrayBuffer`和`SharedArrayBuffer` 是 `ECMAScript` 的标准，其中 `Buffer` 仅在 `nodejs` 中可用。它们存储的都是原始二进制数据，也提供了一些操作二进制数据的api。

2：为了扩展操作缓冲池中数据的能力，可以创建一个视图层。创建视图的api有 `DataView` 和`TypedArray`，其中`TypedArray`包括`Float32Array`、`Int8Array`、`Uint8Array`等将二进制数据解析为各种数字类型的视图层，如下：

```typescript
type TypedArray =
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | BigUint64Array
    | BigInt64Array
    | Float32Array
    | Float64Array;
```

`TypedArray` 是一个类型，无法被实例化，是上面所描述视图层的联合类型。`DataView` 只能操作 `ArrayBuffer` 和 `SharedArrayBuffer`，`TypedArray` 能操作所有缓冲池。

`ArrayBufferView` 是 `TypedArray` 和 `DataView` 两个视图的联合类型，也只是一个类型，无法被实例化。

```typescript
type ArrayBufferView = TypedArray | DataView;
```

3：如果遇到下面这个错误，可以使用 `toString()` 将 `Buffer` 转换为 `string`

> Typescript error TS2345 Error: TS2345:Argument of type 'Buffer' is not assignable to parameter of type 'string'

在使用 `writeFileSync` 时，可能会遇到下面的错误，可以使用`new Uint8Array(resBuffer)` 将 `Buffer` 转换为这种 `TypedArray`，在 `ts` 的类型转换上就不会报错，该错误在处理图像读写时会出现。

> Typescript error TS2345 Error: TS2345:Argument of type 'Buffer' is not assignable to parameter of type ' string | NodeJS.ArrayBufferView '