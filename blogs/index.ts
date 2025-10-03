import { DefaultTheme } from "vitepress";

/**
 * blogs sidebar
 */
export default [
  {
    text: '博客',
    items: [
      { text: 'c++调用python实现图片ocr', link: '/blogs/call-python-ocr' },
      { text: 'ecmascript和nodejs中的Buffer', link: '/blogs/ecmascript-and-nodejs-buffer' },
      { text: 'esm模块的加载顺序', link: '/blogs/esm-load-order' },
      { text: 'husky基本使用与原理剖析', link: '/blogs/husky' },
      { text: 'JSON的解析过程及其在ai流式传输中的应用', link: '/blogs/json-parse' },
      { text: 'MFC树形组件显示文件树形目录结构', link: '/blogs/mfc-tree-view' },
      { text: 'monorepo实践', link: '/blogs/monorepo' },
      { text: 'npm生态的第三方包管理策略', link: '/blogs/third-party-package-npm-ecosystem' },
      { text: 'python中的并发', link: '/blogs/python-concurrency' },
      { text: 'rust中的Optional、Result、Either原理(typescript实现)', link: '/blogs/rust-optional-result-either' },
      { text: 'shadow dom简介', link: '/blogs/shadow-dom' },
      { text: 'ssh connect to host github.com port 22 Connection timed out', link: '/blogs/ssh-connect-timeout' },
      { text: '电子书阅读器：epub电子书文件的解析', link: '/blogs/epub' },
      { text: 'E-book Reader: EPUB File Parsing', link: '/blogs/epub-english' },
      { text: '翻译：MCP schema（Model Context Protocol specification）', link: '/blogs/mcp-schema' },
      { text: '翻译：tc39装饰器提案（Stage 3）', link: '/blogs/tc39-decorators-proposal' },
      { text: '记录：Scavenge：v8引擎的垃圾回收算法', link: '/blogs/v8-scavenge' },
      { text: '记录：v8中数组的sort方法采用的排序策略', link: '/blogs/v8-array-sort' },
      { text: '记录：word公式如何添加标号', link: '/blogs/word-add-number' },
      { text: '记录：如何在markdown中输入星号', link: '/blogs/markdown-star' },
      { text: 'BFC', link: '/blogs/bfc' },
      { text: '前端处理大量连续请求', link: '/blogs/continuous-requests' },
      { text: '网页端电子书阅读器的设计与实现', link: '/blogs/ebook-reader' },
      { text: 'Design and implementation of web-based e-book reader', link: '/blogs/ebook-reader-english' },
      { text: '组件是怎样写的(1)：虚拟列表-VirtualList', link: '/blogs/virtual-list' },
    ]
  }
] as DefaultTheme.Sidebar