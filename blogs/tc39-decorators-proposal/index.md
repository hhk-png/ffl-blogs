**原文（README.md）**：[https://github.com/tc39/proposal-decorators?tab=readme-ov-file#1-evaluating-decorators](https://github.com/tc39/proposal-decorators?tab=readme-ov-file#1-evaluating-decorators)

**Extension.md**：[https://github.com/tc39/proposal-decorators/blob/master/EXTENSIONS.md](https://github.com/tc39/proposal-decorators/blob/master/EXTENSIONS.md) 

文中的 **Extension.md** 的地址已被替换为翻译后的文章地址。

# Decorators

**Stage**: 3 

装饰器是一项用于扩展 JavaScript 类的提案，其在编译环境中被开发者广泛采用，并引起了对其标准化的广泛关注。TC39 在过去五年里对装饰器提案进行了多次迭代。本文档描述了一项基于过去所有提案的新的装饰器提案。

本 README 介绍了当前的装饰器提案，该提案仍在开发中。有关该提案的先前版本，请参阅此代码库的提交历史记录。

## 简介

装饰器是在定义期间，在类、类元素或其他 JavaScript 语法形式上调用的函数。

```javascript
@defineElement("my-class")
class C extends HTMLElement {
  @reactive accessor clicked = false;
}
```

装饰器具有三大主要功能：

1. 可以用具有相同语义的值替换被装饰的值。（例如，装饰器可以用一个方法替换另一个方法，用一个字段替换另一个字段，用一个类替换另一个类，等等）。
2. 可以通过 ` accessor ` 函数获取被装饰的值，并选择是否共享这些访问器。
3. 可以对被装饰的值进行初始化，在值完全定义后运行额外的初始化代码。如果值是类的成员，装饰器的初始化过程会针对每个实例运行一次。

简单来说，装饰器可以用来进行元编程，为值添加功能，而不会改变它的外部行为。

本提案与之前的版本有所不同，之前的装饰器可以用不同类型的值替换被装饰的值。而本提案要求装饰器只能用具有与原始值相同语义的值进行替换，这满足了两个主要设计目标：

- **简单易用**：装饰器的使用和编写应该简单明了。之前的版本（例如静态装饰器提案）对开发者和实现者来说都非常复杂。而在本提案中，装饰器只是普通函数，简单易写且容易上手。

- **明确作用**：装饰器应仅影响它所装饰的对象，避免引发混淆或非局部效应。之前的版本中，装饰器可能以不可预测的方式改变被装饰的值，甚至添加完全无关的新值。这对运行时分析和开发者体验都带来了问题——运行时无法对装饰后的值进行静态分析，而开发者也可能难以理解为什么一个被装饰的值会变成完全不同的类型。

在本提案中，装饰器可以应用于以下现有的类型：

- **类（Classes）**
- **类字段（Class fields）**（包括公有字段、私有字段和静态字段）
- **类方法（Class methods）**（包括公有方法、私有方法和静态方法）
- **类访问器（Class accessors）**（包括公有访问器、私有访问器和静态访问器）

此外，该提案引入了一种可以被装饰的新类型的类元素：

- **类自动访问器（Class auto accessors）**，通过在类字段上使用 `accessor` 关键字定义。这些自动访问器具有 getter 和 setter，与字段不同，字段默认通过私有存储槽（等价于私有类字段）来获取和设置值，而自动访问器则提供了一个显式的 getter 和 setter 方法。

  ```javascript
  class Example {
    @reactive accessor myBool = false;
  }
  ```

这种新元素类型可以独立使用，并具有与装饰器分离的自身语义。将其纳入本提案的主要原因在于：有许多装饰器的使用场景需要这种语义支持，因为装饰器只能用具有相同语义的对应元素替换被装饰的元素。这些使用场景在现有的装饰器生态系统中非常常见，充分说明了它所提供功能的必要性。 

## 动机

你可能会想：“我们为什么需要装饰器？” 装饰器是一种强大的元编程特性，可以显著简化代码，但也可能让人觉得“过于神奇”，因为它隐藏了实现细节，使得底层的运行逻辑变得不那么容易理解。像所有抽象一样，在某些情况下，装饰器可能会变得得不偿失。

然而，装饰器之所以在今天仍然被积极推进，尤其是类装饰器作为一种重要的语言特性，主要原因是它填补了 JavaScript 元编程能力中的一个空白。

请考虑以下函数：

```javascript
function logResult(fn) {
  return function(...args) {
    let result;
    try {
      result = fn.call(this, ...args);
      console.log(result);
    } catch (e) {
      console.error(e);
      throw e;
    }
    return result;
  }
}

const plusOne = logResult((x) => x + 1);

plusOne(1); // 2
```

上面是 JavaScript 中常见模式，也是支持闭包的语言中的一种基本特性。这是一个在纯 JavaScript 中实现装饰器模式的示例。你可以使用 `logResult` 函数轻松地为任何函数定义添加日志功能，而且你可以通过任意数量的“装饰器”函数来实现这一点： 

```javascript
const foo = bar(baz(qux(() => /* do something cool */)))
```

在其他语言中，比如 Python，装饰器是这种模式的语法糖——它们是可以通过 `@` 符号应用于其他函数，或者直接调用它们来添加额外行为。

因此，按照目前的情况，在 JavaScript 中，使用装饰器模式来处理函数是可能的，只不过没有方便的 `@` 语法。这种模式也是声明式的，这一点非常重要——在函数定义和装饰之间没有任何步骤。这意味着别人不可能使用未被装饰的函数版本，这样的错误可能会导致严重的 bug，并且非常难以调试！

然而，有一个地方我们完全无法使用这种模式——对象和类。请考虑以下类：

```javascript
class MyClass {
  x = 0;
}
```

我们如何为 `x` 添加日志功能，以便每次访问或设置它时都记录日志呢？你可以手动实现： 

```javascript
class MyClass {
  #x = 0;

  get x() {
    console.log('getting x');
    return this.#x;
  }

  set x(v) {
    console.log('setting x');
    this.#x = v;
  }
}
```

但是如果我们需要做很多次这样操作，到处添加这些 getter 和 setter 会很麻烦。我们可以在定义类后，创建一个辅助函数来为我们处理这个问题： 

```javascript
function logResult(Class, property) {
  Object.defineProperty(Class.prototype, property, {
    get() {
      console.log(`getting ${property}`);
      return this[`_${property}`];
    },

    set(v) {
      console.log(`setting ${property}`);
      this[`_${property}`] = v;
    }
  })
}

class MyClass {
  constructor() {
    this.x = 0;
  }
}

logResult(MyClass, 'x');
```

这样是可行的，但如果我们使用类字段，它会覆盖我们在原 class 上定义的 getter/setter，因此我们必须将赋值移到构造函数中，这也通过多个语句完成。所以定义本身是逐步进行的，而不是声明式的。试想一下调试一个在多个文件中“定义”的类，在应用启动时每个文件都为这个类添加了不同的装饰。这可能看起来像是一个非常糟糕的设计，但在 class 引入之前，这种做法并不罕见！除此之外，我们无法对私有字段或方法执行这种操作，因为我们不能直接替换定义。

类方法装饰器的实现稍微好一点，我们可以做类似这样的操作：

```javascript
function logResult(fn) {
  return function(...args) {
    const result = fn.call(this, ...args);
    console.log(result);
    return result;
  }
}

class MyClass {
  x = 0;
  plusOne = logResult(() => this.x + 1);
}
```

虽然这种方式是声明式的，但它也为每个类实例创建了一个新的闭包，在规模较大时这种做法会带来额外的开销。

通过将类装饰器作为语言特性，我们填补了这个空白，使得装饰器模式可以应用于类的方法、字段、访问器以及类本身。这使得开发者能够轻松编写常见任务的抽象，例如调试日志、响应式编程、动态类型检查等。

## Detailed Design

装饰器执行的三个步骤：

1. 装饰器表达式（@ 后面的东西）与计算属性名称穿插在一起执行。
2. 装饰器在类定义期间调用（作为函数），在方法被执行后，在构造函数和原型被连接之前。
3. 在所有的装饰器被调用之后，一次性应用它们（改变构造函数和原型）。

> 这里的语义通常遵循 2016 年 5 月 TC39 在慕尼黑会议上的共识。

### 1. 执行装饰器

装饰器作为表达式进行求值，并与计算属性名一起排序。这个过程是从左到右、从上到下进行的。装饰器的结果会存储在相当于局部变量的地方，稍后会在类定义初次执行完成后被调用。 

### 2. 调用装饰器

当装饰器被调用时，它们会接收两个参数：

1. 被装饰的值，在类字段这种特殊情况下值为 `undefined`。
2. 一个包含有关被装饰值信息的上下文对象。

为了简洁和清晰，使用 TypeScript 接口来表示，这就是该 API 的一般结构：

```typescript
type Decorator = (value: Input, context: {
  kind: string;
  name: string | symbol;
  access: {
    get?(): unknown;
    set?(value: unknown): void;
  };
  private?: boolean;
  static?: boolean;
  addInitializer(initializer: () => void): void;
}) => Output | void;
```

这里的 `Input` 和 `Output` 表示传递给装饰器的值以及从装饰器返回的值。每种类型的装饰器有不同的输入和输出，下面将更详细地介绍这些内容。所有装饰器都可以选择不返回任何内容，这样会默认使用原始的、未装饰的值。

`context` 的内容也会根据被装饰的值而有所不同。以下是对其属性的详细解析：

- **kind**: 被装饰值的类型。可以用来确认装饰器是否正确使用，或者根据不同类型的值执行不同的行为。它的值可以是以下之一：
  - "class"
  - "method"
  - "getter"
  - "setter"
  - "field"
  - "accessor"
- **name**: 值的名称，在私有元素的情况下是其描述（例如可读名称）。
- **access**: 包含访问该值的方法的对象。这些方法获取的是实例中元素的最终值，而不是传递给装饰器的当前值。对于大多数涉及访问的用例（如类型验证器或序列化器），这一点非常重要。有关更多细节，请参阅下文的“访问”部分。
- **static**: 表示该值是否为静态类元素。仅适用于类元素。
- **private**: 表示该值是否为私有类元素。仅适用于类元素。
- **addInitializer**: 允许用户为该元素或类添加额外的初始化逻辑。

请参阅下文的“装饰器 API”部分，以获得每种装饰器类型的详细解析以及如何应用它们。

### 3. 应用装饰器

装饰器在所有装饰器执行完成之后应用。装饰器应用算法的中间步骤不可观察——直到所有方法和非静态字段的装饰器应用完毕，新的类才会被提供。

类装饰器只有在所有方法装饰器和字段装饰器被调用并应用后才会被调用。

最后，静态字段会被执行并应用。

### 语法

这个装饰器提案使用了之前阶段 2 装饰器提案的语法。这意味着：

- 装饰器表达式仅限于变量的链式访问、使用 `.` 进行的属性访问，但不包括 `[]`，以及函数调用 `()`。要使用任意表达式作为装饰器，可以使用 `@(expression)` 作为逃逸机制。
- 类表达式可以被装饰，而不仅仅是类声明。
- 类装饰器可以独占的位于 `export` 或 `export default` 之前或之后。

没有用于定义装饰器的特殊语法；任何函数都可以作为装饰器应用。

### 装饰器api

#### 类方法装饰器

```typescript
type ClassMethodDecorator = (value: Function, context: {
  kind: "method";
  name: string | symbol;
  access: { get(): unknown };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

类方法装饰器的第一个参数是被装饰的方法，并可以选择性地返回一个新方法来替代它。如果返回了一个新方法，它将替代原始方法（如果是静态方法，则替代类本身上的方法）。如果返回任何其他类型的值，将抛出错误。

一个方法装饰器的例子是 `@logged` 装饰器。该装饰器接收原始函数，并返回一个新函数，该新函数包裹原始函数，在调用之前和之后进行日志记录。

```javascript
function logged(value, { kind, name }) {
  if (kind === "method") {
    return function (...args) {
      console.log(`starting ${name} with arguments ${args.join(", ")}`);
      const ret = value.call(this, ...args);
      console.log(`ending ${name}`);
      return ret;
    };
  }
}

class C {
  @logged
  m(arg) {}
}

new C().m(1);
// starting m with arguments 1
// ending m
```

这个例子的 polyfill 如下（可以被转译成下面的代码）：

```javascript
class C {
  m(arg) {}
}

C.prototype.m = logged(C.prototype.m, {
  kind: "method",
  name: "m",
  static: false,
  private: false,
}) ?? C.prototype.m;
```

#### 类setter/getter装饰器

```typescript
type ClassGetterDecorator = (value: Function, context: {
  kind: "getter";
  name: string | symbol;
  access: { get(): unknown };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => Function | void;

type ClassSetterDecorator = (value: Function, context: {
  kind: "setter";
  name: string | symbol;
  access: { set(value: unknown): void };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

访问器装饰器将原始的 getter/setter 函数作为第一个参数，并可以选择性地返回一个新的 getter/setter 函数来替代它。与方法装饰器类似，这个新函数会替代原始函数并被放置在原型上（对于静态访问器，则放置在类上），如果返回其他类型的值，将抛出错误。

访问器装饰器分别应用于 getter 和 setter。在以下示例中，`@foo` 仅应用于 `get x()`，而 `set x()` 没有被装饰：

```javascript
class C {
  @foo
  get x() {
    // ...
  }

  set x(val) {
    // ...
  }
}
```

我们可以扩展之前为方法定义的 `@logged` 装饰器，使其也能处理访问器。代码基本相同，我们只需要处理额外的类型。 

```javascript
function logged(value, { kind, name }) {
  if (kind === "method" || kind === "getter" || kind === "setter") {
    return function (...args) {
      console.log(`starting ${name} with arguments ${args.join(", ")}`);
      const ret = value.call(this, ...args);
      console.log(`ending ${name}`);
      return ret;
    };
  }
}

class C {
  @logged
  set x(arg) {}
}

new C().x = 1
// starting x with arguments 1
// ending x
```

这个例子的polyfill如下

```javascript
class C {
  set x(arg) {}
}

let { set } = Object.getOwnPropertyDescriptor(C.prototype, "x");
set = logged(set, {
  kind: "setter",
  name: "x",
  static: false,
  private: false,
}) ?? set;

Object.defineProperty(C.prototype, "x", { set });
```

#### 类字段装饰器

```typescript
type ClassFieldDecorator = (value: undefined, context: {
  kind: "field";
  name: string | symbol;
  access: { get(): unknown, set(value: unknown): void };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => (initialValue: unknown) => unknown | void;
```

与方法和访问器装饰器不同，类字段在被装饰时没有直接的输入值。相反，用户可以选择性地返回一个初始化函数，该函数在字段被赋值时运行，接收字段的初始值并返回一个新的初始值。如果返回任何其他类型的值（除了函数），将抛出错误。

我们可以扩展我们的 `@logged` 装饰器，使其能够处理类字段，在字段赋值时记录日志以及记录赋的值。

这个例子的polyfill如下：

```javascript
let initializeX = logged(undefined, {
  kind: "field",
  name: "x",
  static: false,
  private: false,
}) ?? (initialValue) => initialValue;

class C {
  x = initializeX.call(this, 1);
}
```

初始化函数在类的实例作为 `this` 时被调用，因此字段装饰器也可以用于引导注册关系。例如，您可以在父类上注册子类： 

```javascript
const CHILDREN = new WeakMap();

function registerChild(parent, child) {
  let children = CHILDREN.get(parent);

  if (children === undefined) {
    children = [];
    CHILDREN.set(parent, children);
  }

  children.push(child);
}

function getChildren(parent) {
  return CHILDREN.get(parent);
}

function register() {
  return function(value) {
    registerChild(this, value);

    return value;
  }
}

class Child {}
class OtherChild {}

class Parent {
  @register child1 = new Child();
  @register child2 = new OtherChild();
}

let parent = new Parent();
getChildren(parent); // [Child, OtherChild]
```

#### 类装饰器

```typescript
type ClassDecorator = (value: Function, context: {
  kind: "class";
  name: string | undefined;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

类装饰器将被装饰的类作为第一个参数，并可以选择性地返回一个新的可调用对象（类、函数或 Proxy）来替代它。如果返回一个非可调用的值，则会抛出错误。

我们可以进一步扩展我们的 `@logged` 装饰器，使其在每次创建类的实例时记录日志：

```javascript
function logged(value, { kind, name }) {
  if (kind === "class") {
    return class extends value {
      constructor(...args) {
        super(...args);
        console.log(`constructing an instance of ${name} with arguments ${args.join(", ")}`);
      }
    }
  }

  // ...
}

@logged
class C {}

new C(1);
// constructing an instance of C with arguments 1
```

这个例子的polyfill如下：

```javascript
class C {}

C = logged(C, {
  kind: "class",
  name: "C",
}) ?? C;

new C(1);
```

 如果被装饰的类是匿名类，则上下文对象的 `name` 属性为 `undefined`。 

### 新的类元素

#### 类自动访问器

类自动访问器是一个新构造，通过在类字段前添加 `accessor` 关键字来定义： 

```javascript
class C {
  accessor x = 1;
}
```

自动访问器与常规字段不同，它们在类原型上定义了 getter 和 setter。这些 getter 和 setter 默认获取和设置私有槽中的值。上述代码去糖化(desugar)大致为： 

```javascript
class C {
  #x = 1;

  get x() {
    return this.#x;
  }

  set x(val) {
    this.#x = val;
  }
}
```

静态和私有自动访问器可以如下定义：

```javascript
class C {
  static accessor x = 1;
  accessor #y = 2;
}
```

自动访问器可以被装饰，自动访问器装饰器具有以下签名： 

```typescript
type ClassAutoAccessorDecorator = (
  value: {
    get: () => unknown;
    set(value: unknown) => void;
  },
  context: {
    kind: "accessor";
    name: string | symbol;
    access: { get(): unknown, set(value: unknown): void };
    static: boolean;
    private: boolean;
    addInitializer(initializer: () => void): void;
  }
) => {
  get?: () => unknown;
  set?: (value: unknown) => void;
  init?: (initialValue: unknown) => unknown;
} | void;
```

与字段装饰器不同，自动访问器装饰器接收一个值，该值是一个包含在类原型上定义的 `get` 和 `set` 访问器的对象（对于静态自动访问器，则是类本身）。装饰器可以包装这些访问器，并返回一个新的 `get` 和 `set`，从而允许通过装饰器拦截对该属性的访问。这是字段装饰器无法实现的功能，但在自动访问器中是可能的。此外，自动访问器还可以返回一个初始化函数，用于更改私有槽中原有值的初始值，类似于字段装饰器。如果返回的是一个对象，但某些值被省略，则省略值的默认行为是使用原始行为。如果返回的是除了包含这些属性的对象之外的其他类型的值，将抛出错误。

进一步扩展 `@logged` 装饰器，我们可以使其也处理自动访问器，记录自动访问器的初始化和每次访问时的日志：

```javascript
function logged(value, { kind, name }) {
  if (kind === "accessor") {
    let { get, set } = value;

    return {
      get() {
        console.log(`getting ${name}`);

        return get.call(this);
      },

      set(val) {
        console.log(`setting ${name} to ${val}`);

        return set.call(this, val);
      },

      init(initialValue) {
        console.log(`initializing ${name} with value ${initialValue}`);
        return initialValue;
      }
    };
  }

  // ...
}

class C {
  @logged accessor x = 1;
}

let c = new C();
// initializing x with value 1
c.x;
// getting x
c.x = 123;
// setting x to 123
```

这个例子的polyfill如下：

```javascript
class C {
  #x = initializeX.call(this, 1);

  get x() {
    return this.#x;
  }

  set x(val) {
    this.#x = val;
  }
}

let { get: oldGet, set: oldSet } = Object.getOwnPropertyDescriptor(C.prototype, "x");

let {
  get: newGet = oldGet,
  set: newSet = oldSet,
  init: initializeX = (initialValue) => initialValue
} = logged(
  { get: oldGet, set: oldSet },
  {
    kind: "accessor",
    name: "x",
    static: false,
    private: false,
  }
) ?? {};

Object.defineProperty(C.prototype, "x", { get: newGet, set: newSet });
```

### 使用 `addInitializer` 添加初始化逻辑 

`addInitializer` 方法在提供给装饰器的 `context` 上可用，适用于任何类型的值。调用此方法可以将一个初始化函数与类或类元素关联，该函数可以在值定义后运行任意代码，以完成对该值的设置。初始化器的执行时机取决于装饰器的类型：

- **类装饰器**：在类完全定义之后，以及类的静态字段赋值之后。
- **类静态元素**
  - **方法和 Getter/Setter 装饰器**：在类定义过程中，在静态类方法赋值之后，任何静态类字段初始化之前。
  - **字段和访问器装饰器**：在类定义过程中，紧接着它们所应用的字段或访问器初始化之后。
- **类非静态元素**
  - **方法和 Getter/Setter 装饰器**：在类构造过程中，任何类字段初始化之前。
  - **字段和访问器装饰器**：在类构造过程中，紧接着它们所应用的字段或访问器初始化之后。

#### **示例：`@customElement`**

我们可以在类装饰器中使用 `addInitializer`，以创建一个注册 Web 组件到浏览器的装饰器。

```javascript
function customElement(name) {
  return (value, { addInitializer }) => {
    addInitializer(function() {
      customElements.define(name, this);
    });
  }
}

@customElement('my-element')
class MyElement extends HTMLElement {
  static get observedAttributes() {
    return ['some', 'attrs'];
  }
}
```

polyfill:

```javascript
class MyElement {
  static get observedAttributes() {
    return ['some', 'attrs'];
  }
}

let initializersForMyElement = [];

MyElement = customElement('my-element')(MyElement, {
  kind: "class",
  name: "MyElement",
  addInitializer(fn) {
    initializersForMyElement.push(fn);
  },
}) ?? MyElement;

for (let initializer of initializersForMyElement) {
  initializer.call(MyElement);
}
```

#### 示例: `@bound`

我们也可以在方法装饰器中使用 `addInitializer`，创建一个 `@bound` 装饰器，将方法绑定到类的实例： 

```javascript
function bound(value, { name, addInitializer }) {
  addInitializer(function () {
    this[name] = this[name].bind(this);
  });
}

class C {
  message = "hello!";

  @bound
  m() {
    console.log(this.message);
  }
}

let { m } = new C();

m(); // hello!
```

polyfill：

```javascript
class C {
  constructor() {
    for (let initializer of initializersForM) {
      initializer.call(this);
    }

    this.message = "hello!";
  }

  m() {}
}

let initializersForM = []

C.prototype.m = bound(
  C.prototype.m,
  {
    kind: "method",
    name: "m",
    static: false,
    private: false,
    addInitializer(fn) {
      initializersForM.push(fn);
    },
  }
) ?? C.prototype.m;
```

### 访问与元数据侧通道

到目前为止，我们已经看到了装饰器如何用于替换值，但还未了解装饰器的访问对象是如何使用的。以下是一个依赖注入装饰器的示例，它通过元数据侧通道使用该对象，在实例上注入值。 

```javascript
const INJECTIONS = new WeakMap();

function createInjections() {
  const injections = [];

  function injectable(Class) {
    INJECTIONS.set(Class, injections);
  }

  function inject(injectionKey) {
    return function applyInjection(v, context) {
      injections.push({ injectionKey, set: context.access.set });
    };
  }

  return { injectable, inject };
}

class Container {
  registry = new Map();

  register(injectionKey, value) {
    this.registry.set(injectionKey, value);
  }

  lookup(injectionKey) {
    this.registry.get(injectionKey);
  }

  create(Class) {
    let instance = new Class();

    for (const { injectionKey, set } of INJECTIONS.get(Class) || []) {
      set.call(instance, this.lookup(injectionKey));
    }

    return instance;
  }
}

class Store {}

const { injectable, inject } = createInjections();

@injectable
class C {
  @inject('store') store;
}

let container = new Container();
let store = new Store();

container.register('store', store);

let c = container.create(C);

c.store === store; // true
```

访问通常基于值是否用于读取或写入来提供。字段和自动访问器既可以读取也可以写入。访问器在 `getter` 的情况下可以读取，在 `setter` 的情况下可以写入。方法只能读取。 

## 可能的扩展

关于其他结构上的装饰器，请参阅 **[EXTENSIONS.md](https://juejin.cn/post/7450704988652503067). ** 进行研究。 

## 标准化计划 

- **围绕提案中的未解问题进行迭代**
  将这些问题提交给 TC39，并在双周一次的装饰器讨论中进一步探讨，以在未来的会议中得出结论。
  - **状态**：未解问题已解决，装饰器工作组已就设计达成总体共识。

- **编写规范文本**
  - **状态**：已完成，可在 [此处](https://arai-a.github.io/ecma262-compare/?pr=2417) 查看。

- **在实验性转译器中实现**
  - **状态**：已创建实验性实现，并可供一般使用。Babel 的实现正在进行中，并收集更多反馈。
    - 独立实现：https://javascriptdecorators.org/
    - Babel 插件实现（文档）

- **收集测试转译器实现的 JavaScript 开发者的反馈**

- **提议进入阶段 3**

## FAQ

### 目前我应该如何在转译器中使用装饰器？

由于装饰器已经进入了第 3 阶段并接近完成，现在建议新项目使用最新的第 3 阶段装饰器转换。这些转换功能可以在 Babel、TypeScript 和其他流行的构建工具中使用。

对于现有项目，应开始制定其生态系统的升级计划。在大多数情况下，通过匹配传递给装饰器的参数，可以同时支持旧版和第 3 阶段版本的装饰器。但在少数情况下，由于两者功能上的差异，这可能无法实现。如果遇到这种情况，请在此代码库中提交问题以进行讨论！

### 这个提案与其他版本的装饰器有何不同？

#### 与 Babel “旧版”装饰器的比较

Babel 旧版模式的装饰器基于 2014 年 JavaScript 装饰器提案的状态。除了上述语法更改之外，Babel 旧版装饰器的调用约定与本提案存在以下差异：

- 旧版装饰器以“target”（正在构建的类或原型）作为参数调用，而本提案中正在构建的类不会提供给装饰器。
- 旧版装饰器以完整的属性描述符作为参数调用，而本提案仅提供“被装饰的内容”和上下文对象。这意味着，例如，不可能更改属性属性，并且 `getter` 和 `setter` 不会“合并”，而是分别装饰。

尽管存在这些差异，通常可以使用本提案中的装饰器实现与 Babel 旧版装饰器相同的功能。如果您发现本提案中缺少重要功能，请提交问题。

#### 与 TypeScript “实验性”装饰器的比较

TypeScript 的实验性装饰器与 Babel 旧版装饰器大致相似，因此上述比较中的评论也适用。此外：

- 本提案不包括参数装饰器，但未来可能通过内置装饰器提供，请参阅 **[EXTENSIONS.md](https://juejin.cn/post/7450704988652503067) **。
- TypeScript 装饰器在所有静态装饰器之前运行所有实例装饰器，而本提案中的评估顺序基于程序中的顺序，无论它们是静态还是实例装饰器。

尽管存在这些差异，通常可以使用本提案中的装饰器实现与 TypeScript 实验性装饰器相同的功能。如果您发现本提案中缺少重要功能，请提交问题。

### 与之前第 2 阶段装饰器提案的比较

之前的第 2 阶段装饰器提案比当前提案功能更丰富，包括以下特性：

- 所有装饰器都可以添加任意的“额外”类元素，而不仅仅是包装或更改被装饰的元素。
- 能够声明新的私有字段，包括在多个类中重复使用一个私有名称。
- 类装饰器可以操作类中的所有字段和方法。
- 更灵活地处理初始化器，将其视为一个“惰性计算函数”（thunk）。

之前的第 2 阶段装饰器提案基于一种描述符（descriptor）的概念，这些描述符表示各种类元素。然而，这些描述符在当前提案中不存在。尽管如此，这些描述符为类的形状提供了过多的灵活性/动态性，从而难以进行高效优化。

当前的装饰器提案有意省略了这些功能，以使装饰器的含义更加“范围明确”和直观，同时简化了在转译器和原生引擎中的实现。

### 与“静态装饰器”提案的比较

静态装饰器的提案旨在引入一组内置装饰器，并支持从中派生的用户定义装饰器。静态装饰器位于单独的命名空间中，以支持静态可分析性。

静态装饰器提案存在两个主要问题：过于复杂和缺乏可优化性。本提案通过回归装饰器作为普通函数的通用模型，避免了这些复杂性。

有关静态装饰器提案缺乏可优化性的更多信息，请参阅 [V8](https://docs.google.com/document/d/1GMp938qlmJlGkBZp6AerL-ewL1MWUDU8QzHBiNvs3MM/edit)  对装饰器可优化性的分析。本提案旨在解决这些问题。

### 如果之前的 TC39 装饰器提案没有成功，为什么不回头标准化 TS/Babel 的遗留装饰器？

**可优化性**：本装饰器提案与遗留装饰器的共同点是两者都将装饰器视为函数。然而，相比遗留装饰器，本提案的调用约定通过以下改变使得装饰器更易于被引擎优化：

- **未完成的类不会暴露给装饰器**：这样在类定义的执行期间不需要显式地改变类的结构。
- **仅允许修改正在装饰的构造**：属性描述符的“形状”不可更改。

**与 `[[Define]]` 字段语义的不兼容性**：当遗留装饰器应用于字段声明时，其深度依赖于字段初始化器调用 setter 的语义。然而，TC39 决定字段声明应表现得像 `Object.defineProperty`。这一决定导致许多遗留装饰器模式无法正常工作。尽管 Babel 提供了一种通过 thunk 暴露初始化器的方式解决这一问题，但此语义已被实现者拒绝，因为它增加了运行时成本。

### 为什么优先实现遗留装饰器的功能，而不是装饰器可以提供的其他功能？

“遗留”装饰器在 JavaScript 生态系统中获得了巨大普及。这表明它们确实解决了开发者面临的实际问题。本提案基于这些经验，直接在 JavaScript 语言中内置支持。同时，该提案保留了未来扩展语法的可能性，以支持其他种类的扩展（参见 **[EXTENSIONS.md](https://juejin.cn/post/7450704988652503067) **）。

### 是否可以支持装饰对象、参数、块、函数等？

可以！在验证这一核心方法后，本提案的作者计划进一步提出支持更多类型装饰器的提案。例如，考虑到 TypeScript 参数装饰器的广泛流行，初步版本可能包括参数装饰器的支持。有关详细信息，请参见 **[EXTENSIONS.md](https://juejin.cn/post/7450704988652503067) **。

### 装饰器能否访问私有字段和方法？

可以！私有字段和方法可以像普通字段和方法一样被装饰。唯一的区别是上下文对象中的 `name` 键仅是元素的描述，而不是可以直接访问该字段的工具。取而代之的是，提供了包含 `get` 和 `set` 函数的访问对象（参见“访问”部分的示例）。

### 这一新提案在转译器中实现后，应如何使用？

本装饰器提案需要与先前的遗留/实验性装饰器语义分开实现。在构建时可以通过选项（例如命令行标志或配置文件中的条目）来切换语义。需要注意的是，在进入第 3 阶段之前，本提案可能会经历重大变化，因此在稳定性方面暂时不可依赖。

输出装饰器的模块可以通过检查其第二个参数是否为对象来轻松判断是以遗留/实验方式调用，还是以本提案描述的方式调用（在本提案中始终为对象；在先前版本中始终不是）。因此，维护兼容两种方式的装饰器库是可能的。

### 为什么这个装饰器提案比之前的提案更容易进行静态分析？尽管这个提案基于运行时值，但它是否仍然可静态分析？

在这个装饰器提案中，每个装饰器位置对“去糖”后生成的代码的结构有一致的影响。系统不会调用 `Object.defineProperty` 来动态设置属性描述符的属性，用户定义的装饰器也无法这样做，因为装饰器并不会直接接收到“目标”对象，只有实际的函数内容。

### 静态分析性如何帮助转译器和其他工具？

静态分析装饰器帮助工具生成更快速、更小的 JavaScript 代码，从而使装饰器能够在构建工具中被转译掉，而不会在运行时创建和操作额外的数据结构。这使得工具能够更轻松地理解发生了什么，从而有助于进行tree shaking、类型系统等操作。

LinkedIn 尝试使用之前的 Stage 2 装饰器提案时，发现它导致了显著的性能开销。Polymer 和 TypeScript 团队的成员也注意到这些装饰器导致了生成的代码体积大幅增加。

相比之下，这个装饰器提案应该能够被编译为简单的函数调用，在特定位置进行类元素的替换。我们正在通过在 Babel 中实现该提案来验证这一好处，以便在提案进入 Stage 3 之前，能进行有根据的比较。

静态分析的另一个例子是 ES 模块的命名导出。命名导入和导出的固定性质有助于树摇、类型导入导出，并为组合装饰器提供了可预测的基础。尽管生态系统仍在从完全动态的对象导出过渡，但 ES 模块已在工具中扎根，并且证明它们因其更静态的性质而有用，而非相反。

### 静态分析性如何帮助原生 JavaScript 引擎？

尽管 [JIT](https://en.wikipedia.org/wiki/Just-in-time_compilation) （即时编译）可以优化几乎所有内容，但它只能在程序“ warms up ”之后进行优化。也就是说，当典型的 JavaScript 引擎启动时，它并未使用 JIT，而是将 JavaScript 编译成字节码并直接执行。稍后，如果代码多次执行，JIT 会介入并优化程序。

对流行 Web 应用程序执行痕迹的研究表明，启动页面的时间大部分花费在解析和字节码执行上，通常运行 JIT 优化代码的时间占比较小。这意味着，如果我们希望 Web 更快，就不能依赖复杂的 JIT 优化。

装饰器，特别是之前的 Stage 2 提案，增加了类定义和使用过程中的各种开销，如果没有被 JIT 优化掉，会导致启动速度变慢。相比之下，组合装饰器总是以固定的方式降解为内置装饰器，这些装饰器可以直接通过字节码生成来处理。

### “合并” getter/setter 对发生了什么？

这个装饰器提案基于一种常见的模型，每个装饰器只影响一个语法元素——字段、方法、getter、setter 或类。被装饰的内容是立即可见的。

之前的“Stage 2”装饰器提案有一个“合并” getter/setter 对的步骤，这与遗留装饰器在属性描述符上操作的方式有些相似。然而，由于访问器的计算属性名的动态性，这种合并非常复杂，无论是在规范中还是在实现中。合并是“Stage 2”装饰器的 polyfill 实现中代码体积的一个重要来源。

目前还不清楚哪些使用场景能从 getter/setter 合并中受益。移除 getter/setter 合并大大简化了规范，我们也预计它会简化实现。

如果你有更多想法，请参与问题跟踪器中的讨论：[#256](https://github.com/tc39/proposal-decorators/issues/256) 。

### 为什么装饰器提案花了这么长时间？

对于延迟我们深感抱歉。我们理解这在 JavaScript 生态系统中造成了实际的问题，我们正在尽快推动解决方案。

我们花了很长时间才让所有人对跨框架、工具和原生实现的需求达成共识。只有在推动多种具体方向后，我们才完全理解了本提案所旨在解决的需求。

我们正在努力改进 TC39 内部以及与更广泛 JavaScript 社区的沟通，以便将来能够更早纠正类似的问题。