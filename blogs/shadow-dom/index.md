#### 简介

在过去，不论是以 link 标签引入 CSS，或者在 style 标签下直接书写，所有的样式都会在全局生效，样式作用域该页面上的每个 HTML 元素。JS 也是如此，通过script 引入或者书写的代码都会共享同一个全局作用域。这就导致在这种整个运行环境都共享同一个状态空间的情况下，一个页面能放的东西有一个明确的上限，复杂度也会随着单个页面业务的增加而大幅上涨，只有通过模块化的方式才能降低页面的复杂度，使得一个页面所能承载更多的业务。因为浏览器的原始特性不支持模块化的构建方式，所以后来衍生出各种打包工具人为的将html页面划分成多个独立的模块，实现前端的模块化。

shadow dom 是为前端模块化所设计的一个工具，使得能够不通过打包工具就可以在原生 dom 层面实现 dom 元素之间的隔离。

#### shadow dom 的基本使用

shadow dom 需要通过 js 开启，如下代码：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div id="temp"></div>
  <script>
    const div = document.getElementById('temp')
    div.attachShadow({mode: 'open'});
    div.shadowRoot.innerHTML = `
      <style>
        p {
          color: red;
        }
      </style>
      <p>Shadow DOM</p>
    `
  </script>
</body>
</html>
```

我们首先写入了一个 div 标签，在 script 里面，我们首先通过 document.getElementById 方法获取到了 div 的 dom 对象。然后调用了 attachShadow，使得该 div 下的 dom 为 shadow dom，再向其中添加了 html 代码。

现在，div 内部的 dom 元素叫做 shadow dom。那么其他的 dom 叫做 light dom。这里我们将  shadow dom 和 light dom 分别翻译为影子dom 和 普通dom。

另外，可以将影子节点依附到的 html 元素有：

- article
- aside
- blockquote
- body
- div
- footer
- h1
- h2
- h3
- h4
- h5
- h6
- header
- main
- nav
- p
- section
- span

即这些 dom 元素可以调用 attachShadow。

#### shadow dom 与 webcomponent

shadow dom 应该与 webcomponent 一起使用。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    .innerDiv {
      color: red;
    }
  </style>
</head>
<body>
  <fancy-tabs>
    <div>First</div>
    <div>Second</div>
    <div>Third</div>
  </fancy-tabs>
  <script>
    customElements.define('fancy-tabs', class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: block;
              border: solid 1px #000;
            }
            ::slotted(*) {
              font-size: 30px;
            }
          </style>
          <div class="innerDiv">234</div>
          <slot></slot>
        `;
      }
    });
  </script>
</body>
</html>
```

这里我们定义了一个 \<fancy-tabs> 组件，组件内部写了一些样式，还有一个 class 为 innerDiv 的 div 元素和slot。渲染结果如下：

![1](.\images\1.png)

一个值得注意的地方是，我们在外部 style 标签中定义了 innerDiv class 样式，文字的颜色为红色。但是在 \<fancy-tabs> 内部对应的 div 元素并没有受到外部 class 的影响。如果不开启 attachShadow 则该 div 下的文字会变成红色。这说明 shadow dom 隔绝了外界的 css 样式。

#### mode 为 open 和 closed

attachShadow 函数可以传递一个配置对象，其中 mode 为必选项，还有两个 delegatesFocus 和 slotAssignment 为可选项。这里只说mode。

mode 限制的主要是外部 js 对 shadow dom 的访问，当 mode 为 open 时，外部 js 可以访问内部的 shadow dom 元素。mode 为 closed 时，外部 js 不可以访问 shadow dom，此时原来的 `this.shadowRoot === null` 这时上面的 \<fancy-tabs> 组件需要通过如下方式书写才能正常运行：

```js
customElements.define('fancy-tabs', class extends HTMLElement {
    constructor() {
        super();
        this._shadowRoot = this.attachShadow({mode: 'closed'})
        this._shadowRoot.innerHTML = `
            <style>
            :host {
            display: block;
            border: solid 1px #000;
            }
            ::slotted(*) {
            font-size: 30px;
            }
            </style>
            <div class="innerDiv">234</div>
            <slot></slot>
        `
    }
});
```

这里通过 attachShadow 的返回对象来实现对 innerHTML 的控制。

不管 open 还是 closed，都不会影响 component 内部的 js 访问外部的变量。

#### 组件内部的 css 选择器

组件内部有一些特殊的 css 选择器可以使用：

1. :host(selector) {} 可以作用到 shadow dom 的宿主身上，父级的 host 优先级更高。
2. ::slotted(selector) {} 作用到插槽里面，web component 里的 slot 与 vue、react 里的 slot 几乎一样。

#### 参考资料

[文章封面](https://bing.ioliu.cn/)

[Shadow DOM concepts]( https://polymer-library.polymer-project.org/2.0/docs/devguide/shadow-dom)

[Shadow DOM v1 - Self-Contained Web Components](https://web.dev/shadowdom-v1/)

[影子 DOM（Shadow DOM）](https://zh.javascript.info/shadow-dom)

[Virtual DOM vs. Shadow DOM: What Every Developer Should Know]( https://www.syncfusion.com/blogs/post/virtual-dom-vs-shadow-dom-what-every-developer-should-know.aspx/amp )

[https://blog.openreplay.com/shadow-dom--the-ultimate-guide/]( https://blog.openreplay.com/shadow-dom--the-ultimate-guide/ )

[Shadow DOM: A Quick and Simple Introduction]( https://blog.bitsrc.io/shadow-dom-a-quick-and-simple-introduction-f7abf75d64b7 )

[Chapter 5. Working with the Shadow DOM]( https://www.oreilly.com/library/view/modern-javascript/9781491971420/ch05.html )

[Shadow DOM Styling of Components](https://vaadin.com/docs/latest/styling/advanced/shadow-dom-styling)

[Understanding Shadow DOM in Web Components](https://ultimatecourses.com/blog/understanding-shadow-dom-in-web-components)

[Using Shadow DOM In Your Browser Tests](https://docs.datadoghq.com/synthetics/guide/browser-tests-using-shadow-dom/)

[Web Components API: Shadow DOM and Light DOM](https://javascript.works-hub.com/learn/web-components-api-shadow-dom-and-light-dom-e18b6)

[What We Do in the Shadow DOM](https://www.searchenginejournal.com/shadow-dom/353644/)