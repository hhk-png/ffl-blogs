### 1.Optional\<T\>

Optional 是使用class 对 `value `扩展了额外的undefined 类型，以及是否被赋值的布尔标志。

```typescript
class Optional<T> {
  private value: T | undefined;
  private assigned: boolean;

  constructor(value?: T) {
    if (value) {
      this.value = value;
      this.assigned = true;
    } else {
      this.value = undefined;
      this.assigned = false;
    }
  }
  hasValue(): boolean {
    return this.assigned;
  }
  getValue(): T {
    if (!this.assigned) {
      throw Error();
    }
    return <T>this.value;
  }
}
```

### 2.Result\<T\>

Result 使用class 对 `value` 扩展了value 的状态变量，下面使用 error 表示。

```typescript
enum InputError {
  OK,
  NoInput,
  Invalid
}

class Result<T> {
  error: InputError;
  value: T;

  constructor(error: InputError, value: T) {
    this.error = error;
    this.value = value;
  }
}
```

### 3.Either\<TLeft, TRight\>

使用一个 left 变量来控制正在选择哪一个值。

```typescript
class Either<TLeft, TRight> {
  private readonly value: TLeft | TRight;
  private readonly left: boolean;

  private constructor(value: TLeft | TRight, left: boolean) {
    this.value = value;
    this.left = left;
  }

  isLeft(): boolean {
    return this.left;
  }

  getLeft(): TLeft {
    if (!this.isLeft()) {
      throw new Error();
    }
    return <TLeft>this.value;
  }

  isRight(): boolean {
    return !this.left;
  }

  getRight(): TRight {
    if (!this.isRight()) {
      throw new Error();
    }
    return <TRight>this.value;
  }

  static makeLeft<TLeft, TRight>(value: TLeft) {
    return new Either<TLeft, TRight>(value, true);
  }

  static makeRight<TLeft, TRight>(value: TRight) {
    return new Either<TLeft, TRight>(value, false);
  }
}
```

### 参考资料

[编程与类型系统](https://www.dedao.cn/ebook/detail?id=YxRj1dbLGNgA2oaD6VBevmQZ7rnbYWm1mVWkyOKRMzJpX9lP5dxqE41j8De2pmOP)



