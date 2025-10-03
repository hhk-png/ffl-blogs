BFC是web页面中盒模型布局的CSS渲染模式，它的定位体系属于常规文档流(普通流)
    一个BFC是一个HTML盒子，并且至少满足下列条件中的任何一个(触发BFC)
        1.float的值不为none
        2.position的值不为static或relative
        3.display的值为table-cell， table-caption， inline-block， flex， inline-flex，
        4.overflow的值不为visible
    使用BFC效果：
        1.防止外边距折叠
        2.包含浮动
        3.防止文字环绕
        4.在多列布局中使用BFC
详见：http://www.w3cplus.com/css/understanding-block-formatting-contexts-in-css.html



解决了两个问题

一个是无法包含浮动的问题，如果div内的元素设置了浮动，他就脱离了文档流，div的高度就不会包含设置了浮动的元素。将div设置为BFC，就可以包含浮动。

另一个是外边距折叠的问题

```html
<style>
    .box {
        height: 10em;
        width: 10em;
        margin: 10em;
        background-color: blue;
    }
</style>
<body>
    <div class="box"></div>
    <div class="box"></div>   
</body>
```

这种情况下，两个box之间的距离只是10em，发生了外边距折叠。将两个box或者其中1个box设置为BFC之后，两个box间的距离就变成了20em，是我们所期待的情况。相当于将box的box-sizing css属性设置为了margin-box，margin-box这个css value不存在。



