## Introduction

On various online or offline reading platforms such as fanqienovel, Dedao, Biquge, Qidian, Kindle, etc., although the content they host differs, the reading modes primarily fall into two categories: **pagination mode** and **scroll mode**. This article introduces the implementation of these two modes on the web, with a focus on pagination mode.

## Implementing Pagination Using overflow+scroll

A simple implementation of pagination mode is shown below. For brevity, placeholder content has been removed. You can download the full content by clicking [here](https://github.com/hhk-png/lingo-reader/blob/main/docs/use%20scroll%20api%20to%20finish%20paginator.html).

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>use scroll api to implement paginator</title>
    <style>
      * {
        padding: 0;
        margin: 0;
      }

      .ebook {
        box-sizing: border-box;
        column-count: 2;
        column-gap: 20px;
        column-fill: auto;
        height: 100vh;
        overflow: hidden;
        overflow-wrap: break-word;
        padding-left: 20px;
        padding-right: 20px;
        padding-top: 20px;
      }
    </style>
  </head>

  <body>
    <button style="position: fixed; left: 0;" class="prevPage">prev</button>
    <button style="position: fixed; left: 50px;" class="nextPage">next</button>
    <div class="ebook">
      <div class="outer">
        <h1>E-book Title</h1>
        <p>
          Jin Daxin stopped speaking and just stared at Wan Miaomiao, as if she were talking about someone unrelated.
          While Wan Miaomiao was lost in her thoughts, he recovered from the earlier embarrassment of being questioned. He picked up the wine glass, brought it close to his nose, sniffed it, and then gently put it down. "Sorry, I said too much!" Wan Miaomiao stood up, picked up the remote control, and selected a song titled "The Shepherd of Cocoto Sea." The melancholic melody instantly filled the cabin. "The rain that night couldn't keep you / The valley's wind accompanied my tears..." Wan Miaomiao closed her eyes and swayed gently to the melody... Jin Daxin felt nothing for this song. He thought the singer was merely being melodramatic. With so many beautiful women in the world, was it necessary to be so dramatic?
        </p>

        <!-- Content removed for brevity -->
      </div>
      <!-- Placeholder to ensure scrolling logic works as expected -->
      <div style="width: 100%; height: 100%; background-color: aqua;"></div>
    </div>

    <script>
      const ebook = document.querySelector('.ebook')
      const nextPage = document.querySelector('.nextPage')
      const prevPage = document.querySelector('.prevPage')
      const ebookWidth = ebook.getBoundingClientRect().width

      // !!! width + gap - padding
      const delta = ebookWidth + 20 - 20 - 20
      const scrollWidth = ebook.scrollWidth

      let pageIndex = 0
      const pageCount = Math.floor(scrollWidth / delta)
      console.log(pageCount)

      nextPage.addEventListener('click', () => {
        if (pageIndex < pageCount - 1) {
          pageIndex++
          ebook.scrollTo({
            top: 0,
            left: pageIndex * delta,
          })
        }
      })

      prevPage.addEventListener('click', () => {
        if (pageIndex > 0) {
          pageIndex--
          ebook.scrollTo({
            top: 0,
            left: pageIndex * delta,
          })
        }
      })
    </script>
  </body>
</html>
```

The main container for the e-book content is `div.ebook`. Below `.ebook`, HTML text content is dynamically added. In the CSS, the three most important elements are `column-count: 2;`, `height: 100vh;`, and `overflow: hidden;`. Setting `column-count` changes the layout of the content area to a multi-column layout. Without a fixed height, the content would naturally extend downward. By setting a fixed height of `100vh`, the content extends horizontally, achieving the pagination effect. However, this would display all content, and `.ebook` would become a horizontally scrollable container. To display only the intended two columns, `overflow: hidden;` is used to clip the excess content, which also disables manual scrolling. The scroll API is then used to implement page-turning functionality.

Inside `.ebook`, there are two parts: the dynamically added book text wrapped in `.outer`, and a placeholder element that takes up 100% of the width and height. Without this placeholder, scrolling to the last page might not work correctly. Adding this placeholder ensures smooth scrolling without affecting the content display, as the browser handles the placeholder's area appropriately.

To implement page-turning, the distance to scroll left or right is calculated. Each page turn scrolls by the same absolute distance. After setting `column-gap`, each column (except the last) will have a gap on its right. Therefore, the scroll distance `delta` is calculated as `width + gap - padding`, where padding includes both left and right margins. Here, `delta` is calculated as the width of `.ebook` plus the `column-gap` value, minus the `padding-left` and `padding-right` values (both 20 pixels). `ebook.scrollWidth` is the total scrollable distance, and dividing it by `delta` gives the total number of pages in the current chapter.

In JavaScript, the precision of DOM element dimensions can be categorized into three levels. `Element.clientWidth/clientHeight` retrieves the element's width and height excluding the border, rounded down to the nearest integer, offering the lowest precision. `window.getComputedStyle` retrieves the width and height based on the `box-sizing` property, retaining up to two decimal places, offering better precision. `Element.getBoundingClientRect` offers the highest precision, sometimes retaining up to 10 decimal places.

When calculating the scroll distance, if `delta` lacks precision, continuous page-turning may cause the text's left boundary to shift left or right. This also affects the total page count calculation. To ensure accuracy, `getBoundingClientRect` is used to calculate the width of `.ebook`.

With this, the basic functionality of the pagination reading mode is complete. More complex features can be built on this foundation.

## Implementing Pagination Using overflow+translate

Another approach to implement pagination is using `translate`, which is also based on the `columns` property. Here's an example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <style>
      .wrapper {
        width: 400px;
        height: 400px;
        overflow: hidden;
      }

      .container {
        width: 400px;
        height: 400px;
        columns: 2;
        transform: translate(-400px);
      }
    </style>
  </head>

  <body>
    <div class="wrapper">
      <div class="container">
        <!-- content -->
      </div>
    </div>

    <script>
      document.querySelector('.container').innerHTML =
        '<div>This is a text1This is a text1This is a text1This is a text1This is a text1This is a text1</div>'.repeat(
          30
        )
    </script>
  </body>
</html>
```

In this implementation, the dynamically added book content is placed inside `.container`, which has `columns` and a fixed height set. Its parent element `.wrapper` has `overflow: hidden`, allowing page-turning by controlling `.container`'s `translate` property. Here, `translate` is set to a fixed value to scroll one page to the right. However, this approach has a significant unresolved bug: when selecting text, if the mouse moves to a blank area (e.g., the gap between columns), it may cause reverse selection of all text, severely impacting user experience. Adding a margin to the content's `div` elements exacerbates this issue, as shown below:

![translate](./images/translate.png)

This bug is similar to the one caused by using CSS `order`, which changes the display order of elements but not their static DOM order. Since the browser selects text based on the static DOM order, this issue arises. A related question on StackOverflow (https://stackoverflow.com/questions/76686208/text-selection-problem-when-using-flexbox-order-in-html-css) has remained unanswered for 7 months.

## The reader-html Reader in the lingo-reader Project

[lingo-reader](https://github.com/hhk-png/lingo-reader) is a project I created for parsing e-book files, currently supporting epub, azw3, and mobi formats. It abstracts a unified API on top of these parsers. The project is hosted at https://github.com/hhk-png/lingo-reader. reader-html is a web-based reader built on top of this project, which I will introduce below. The reader can be accessed at https://hhk-png.github.io/lingo-reader/.

### Introduction to the Unified API in the Store

The project uses Pinia for state management. Below is a set of APIs built on top of the parsers for this project, including common states like the number of chapters and the current chapter. I will briefly introduce the methods and variables returned.

Each parser exposes an initialization API named `init+FileType+File`. In a browser environment, a `File` object is required, while in a Node environment, a file path is needed. In the `initBook` method below, the file extension determines which book class to initialize. The `spine` represents the book's table of contents, determining the reading order of chapters or content files. The `spine` is an array, and while the elements returned by different parsers vary, they all include a chapter ID. Passing this ID to `getChapterHTMLFromId` allows retrieving the processed chapter object using `book.loadChapter(id)`. `chapterNums` is the number of chapters, and `fileInfo` mainly includes the file name, which can also be obtained directly via `File.name`.

The processed chapter object is as follows, where `html` is the HTML text with resource paths replaced, and `css` contains the blob URLs of CSS files, which can be fetched to obtain the CSS text.

```typescript
interface EpubProcessedChapter {
  css: EpubCssPart[]
  html: string
}
```

`chapterIndex` is the currently read chapter, and `progressInChapter` is the reading progress within the chapter, ranging from 0 to 1, representing a percentage.

```typescript
import type { EpubFile, EpubSpine } from '@lingo-reader/epub-parser'
import { initEpubFile } from '@lingo-reader/epub-parser'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import DOMPurify from 'dompurify'
import { initKf8File, initMobiFile } from '@lingo-reader/mobi-parser'
import type { Kf8, Kf8Spine, Mobi, MobiSpine } from '@lingo-reader/mobi-parser'
import type { FileInfo } from '@lingo-reader/shared'

const useBookStore = defineStore('ebook', () => {
  let book: EpubFile | Mobi | Kf8 | undefined
  let spine: EpubSpine | MobiSpine | Kf8Spine = []
  const chapterIndex = ref<number>(0)
  const chapterNums = ref<number>(0)
  const progressInChapter = ref<number>(0)
  let fileInfo: FileInfo = {
    fileName: '',
  }

  const initBook = async (file: File) => {
    if (file.name.endsWith('epub')) {
      book = await initEpubFile(file)
      spine = book.getSpine()
      chapterNums.value = spine.length
      fileInfo = book.getFileInfo()
    } else if (file.name.endsWith('mobi')) {
      book = await initMobiFile(file)
      spine = book.getSpine()
      chapterNums.value = spine.length
      fileInfo = book.getFileInfo()
    } else if (file.name.endsWith('kf8') || file.name.endsWith('azw3')) {
      book = await initKf8File(file)
      spine = book.getSpine()
      chapterNums.value = spine.length
      fileInfo = book.getFileInfo()
    }
  }

  const chapterCache = new Map<string, string>()
  const getChapterHTMLFromId = async (id: string): Promise<string> => {
    if (chapterCache.has(id)) {
      return chapterCache.get(id)!
    }

    const { html } = await book!.loadChapter(id)!
    // for security
    const purifiedDom = DOMPurify.sanitize(html, {
      ALLOWED_URI_REGEXP: /^(blob|https|Epub|filepos|kindle)/gi,
    })
    chapterCache.set(id, purifiedDom)
    return purifiedDom
  }

  const getChapterHTML = async () => {
    const id = spine[chapterIndex.value].id
    return await getChapterHTMLFromId(id)
  }

  const getChapterThroughId = async (id: string) => {
    chapterIndex.value = spine.findIndex((item) => item.id === id)
    return await getChapterHTMLFromId(id)
  }

  const getToc = () => {
    return book!.getToc()
  }

  const getFileName = () => {
    return fileInfo.fileName
  }

  const reset = () => {
    book!.destroy()
    book = undefined
    spine = []
    chapterIndex.value = 0
    chapterNums.value = 0
    progressInChapter.value = 0
    // clear chapter cache to avoid image conflict in different books
    chapterCache.clear()
  }

  const existBook = (): boolean => {
    return book !== undefined
  }

  const resolveHref = (href: string) => {
    return book!.resolveHref(href)
  }

  return {
    chapterIndex,
    chapterNums,
    progressInChapter,
    initBook,
    getChapterHTML,
    getChapterThroughId,
    getToc,
    getFileName,
    reset,
    existBook,
    resolveHref,
  }
})

export default useBookStore
```

`getToc` is the API for retrieving the table of contents (TOC), which is a tree structure. The `label` is the name of the TOC item, and `href` is the processed path to the chapter. In EPUB, the processed path is `Epub:path/to/ch.html`, with an `Epub` prefix to distinguish it from external URLs. MOBI files use the `filepos` prefix, and AZW3 files use `kindle`. DOMPurify removes all resource paths, so a corresponding regex is passed to exclude links that should not be removed: `ALLOWED_URI_REGEXP: /^(blob|https|Epub|filepos|kindle)/gi`.

```typescript
interface TocItem {
  label: string
  href: string
  id?: string // corresponding chapter id
  children?: TocItem[]
}
type Toc = TocItem[]
```

Passing this path to `resolveHref` retrieves the corresponding chapter ID and a DOM selector representing the offset. Passing this selector to `querySelector` retrieves the DOM within the chapter.

```typescript
interface EpubResolvedHref {
  id: string
  selector: string
}
```

### Introduction to the Reader

The project's structure is relatively simple, mainly consisting of a home route and a reader route. After selecting a file on the home page, the user is redirected to the reader interface, which also has a button to return to the home page.
The book's state is stored in Pinia. The reader supports different reading modes, which users can switch between manually, and the reading progress is synchronized across modes. Currently, three reading modes are supported: pagination, scroll, and a scroll mode with a notes area. Considering the need for note-taking, a rich text editor is planned for the notes area, but for now, only a `textarea` tag is included. Each reading mode is isolated into its own component to facilitate future expansion.
Different reading modes support different configurations. For example, the number of columns is only supported in scroll mode, while font type and size are supported across all modes. To handle this, the project uses sibling component communication to customize configurations for each reading mode.
For instance, in the component for the corresponding reading mode, a `ref` for the number of columns is defined:

```typescript
const columns = ref<number>(2)
```

An object like the following is then generated and passed up to the parent component, which selects the appropriate component based on the `type` and passes the `value` to the component that can adjust it. Binding `columns` to the template allows the parent component to adjust the number of columns, which is then reflected on the page. For easier management, the component that receives values from child components is encapsulated as a standalone component. For more details, refer to the project code: https://github.com/hhk-png/lingo-reader/tree/main/reader-html

```typescript
{
  type: 'adjuster',
  name, // columns
  max,
  min,
  delta,
  value: columns, // columns ref
}
```

Saving reading progress includes the chapter index and the progress within the chapter, stored as a percentage. In pagination mode, the percentage is calculated by dividing the current page by the total number of pages, in pages. In scroll mode, it is calculated by dividing the scrolled distance by the total scrollable distance, in pixels. Therefore, the same reading progress may result in significantly different percentages when switching between these modes, potentially causing the reading progress to decay to the first page. To mitigate this, when saving progress in pagination mode, the current page index is incremented by 0.5 before dividing by the total number of pages, which helps reduce progress decay.

## Other Notes

For note-taking functionality, libraries like [web-highlighter](https://github.com/alienzhou/web-highlighter) and [rangy](https://github.com/timdown/rangy) are available. Both record highlighted positions using the DOM, but [web-highlighter](https://github.com/alienzhou/web-highlighter) is no longer maintained.

When implementing e-book pagination, besides relying on the `columns` property in web environments, another approach is to develop a custom typesetting engine, as done by Kindle and Dedao, which uses SVG. I initially followed this approach, as seen [here](https://github.com/hhk-png/lingo-reader/tree/main/packages/svg-render), but later realized that native browser capabilities could achieve pagination, and typesetting is just a subset of HTML. CSS also offers many properties for typesetting. Implementing this in JavaScript would essentially replicate browser functionality and would likely be slower due to runtime constraints. From a text rendering perspective, HTML rendered in browsers does not distort when zoomed, similar to SVG. While both are limited by physical pixels, they perform similarly in this regard. The goal of a custom typesetting engine might be to ensure consistent font rendering across devices, but if all platforms use a browser engine, consistency can still be achieved.

## References

https://github.com/hhk-png/lingo-reader (Project Repository)

https://github.com/johnfactotum/foliate-js