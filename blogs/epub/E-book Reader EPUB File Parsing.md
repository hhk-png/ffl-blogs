**Project Repository**: [https://github.com/hhk-png/lingo-reader](https://github.com/hhk-png/lingo-reader)

**Web-based eBook Reader**: [https://hhk-png.github.io/lingo-reader/#/](https://hhk-png.github.io/lingo-reader/#/)

## Introduction

There are multiple eBook file formats in the market today, including **EPUB, FB2, MOBI**, SNB, LRF, and AZW3. The first three are open formats, while the latter three are proprietary formats created by specific eReader vendors to meet their own requirements. As a result, these proprietary formats are not openly available, and parsing them may involve copyright concerns.

Among the three open formats, only **EPUB** is still actively maintained. You can check the progress at [https://github.com/w3c/epub-specs](https://github.com/w3c/epub-specs). The latest version at the time of writing is [EPUB 3.4](https://www.w3.org/TR/epub-34/#abstract). Both FB2 and MOBI are no longer maintained—MOBI, in fact, ended its lifecycle after being acquired by **Amazon**, which then developed the AZW3 format based on it.

Since **EPUB** is the only format still under active development, I decided to write this post to document some of my recent work on parsing EPUB files. I’ll go over the parsing process and the design decisions I made, so that others tackling similar problems might find it useful.

Of course, a blog post can’t cover every detail. If you’d like to dive deeper into the code or explore parsing for other formats, you can check out the repository here: [https://github.com/hhk-png/lingo-reader](https://github.com/hhk-png/lingo-reader). If you have any **questions** or **suggestions**, feel free to open an issue [https://github.com/hhk-png/lingo-reader/issues](https://github.com/hhk-png/lingo-reader/issues) or leave a comment.

## Choosing Third-Party Libraries

Several third-party libraries were used in the parsing process: **jszip**, **xml2js**, **path-browserify**, and **fflate**.

1. **jszip**: Since an EPUB file is essentially a ZIP archive, this library is used to read files directly from the ZIP container.
2. **xml2js**: EPUB metadata and resource information are stored in XML files, which need to be parsed. However, `xml2js` comes with both a parser and a builder bundled together under CommonJS exports. Even if only the parser is used, the builder still gets bundled in, and it cannot be tree-shaken. To address this, `@lingo-reader/epub-parser` inlines the `xml2js` parser, converts its original CoffeeScript code into TypeScript, and relies directly on `saxjs` for XML parsing. You can see the code here: [xml2js-parser.ts](https://github.com/hhk-png/lingo-reader/blob/main/packages/shared/src/xml2js-parser.ts). If you’d like, you can also install it via `pnpm install @lingo-reader/shared`, though note that the package is undocumented.
3. **path-browserify**: Since `@lingo-reader/epub-parser` is designed to work in both browser and Node.js environments, this library ensures compatibility when handling file paths in the browser. On Node.js, the native `path` module is used, with environment-specific bundling to prevent unnecessary imports.
4. **fflate**: The decryption module in `epub-parser` uses `inflateSync` from **fflate** for decompression.

Other options include [zip.js](https://github.com/gildas-lormeau/zip.js) for ZIP handling, and [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) for XML parsing. Although `fast-xml-parser` claims better performance, at the time of development I needed quicker results and its higher-level features were limited, so I opted for `xml2js`.

To emulate Node.js’s `fs` module in the browser, I used a simple JavaScript object as a lightweight substitute.

## Parsing Workflow and Design Decisions

Files inside an EPUB archive fall into three categories:

1. **Metadata files** (e.g., `.opf`, `META-INF/container.xml`, `META-INF/encryption.xml`)
2. **Content files** (chapter texts in `.xhtml`, which reference other resources)
3. **Resource files** (images, audio, video, fonts, and other media)

Certain files have fixed locations in EPUB: `mimetype`, `META-INF/container.xml`, `META-INF/encryption.xml`, `META-INF/manifest.xml`, `META-INF/metadata.xml`, `META-INF/rights.xml`, and `META-INF/signatures.xml`.

The `mimetype` file must be located in the root directory and contain exactly `application/epub+zip`; otherwise, the EPUB should be considered invalid. The rest of the fixed files reside in the `META-INF` folder. In practice, `manifest.xml` and `metadata.xml` are often consolidated into the `.opf` file instead of being separate.

Parsing EPUB is largely a linear process and conceptually straightforward. In the following sections, I’ll walk through how each file type is parsed step by step.

### Initialization

The parsing process is encapsulated under the `EpubFile` class. At the very beginning—aside from handling input parameters—the first step is initializing the ZIP file. To achieve this, I wrapped **JSZip** inside a `ZipFile` class, which exposes APIs for reading text and binary files. It also adds support for handling encrypted files, making it possible to parse DRM-protected EPUBs. Since internal files must be read using absolute paths, resource paths need to be normalized before reading.

Here’s the core implementation:

```typescript
export async function createZipFile(filePath: InputFile): Promise<ZipFile> {
  const zip = new ZipFile(filePath)
  await zip.loadZip()
  return zip
}

// Wrap epub file into a class; an epub is essentially a zip file
// Expose file operations (readFile, readImage, etc.) to process files inside the .zip
export class ZipFile {
  private jsZip!: JSZip
  private names!: Map<string, string>
  public getNames() {
    return [...this.names.values()]
  }

  private pathToProcessors: PathToProcessors = {}
  public useDeprocessors(processors: PathToProcessors) {
    this.pathToProcessors = {
      ...this.pathToProcessors,
      ...processors,
    }
  }

  constructor(private filePath: InputFile) {}

  public async loadZip() {
    this.jsZip = await this.readZip(this.filePath)
    this.names = new Map(
      Object.keys(this.jsZip.files).map((name) => {
        return [name.toLowerCase(), name]
      })
    )
  }

  private async readZip(file: InputFile): Promise<JSZip> {
    return new Promise((resolve, reject) => {
      if (__BROWSER__) {
        const reader = new FileReader()
        reader.onload = () => {
          new JSZip().loadAsync(reader.result!).then((zipFile) => {
            resolve(zipFile)
          })
        }
        reader.readAsArrayBuffer(file as File)
        reader.onerror = reject
      } else {
        const fileToLoad: Uint8Array =
          typeof file === 'string'
            ? new Uint8Array(fs.readFileSync(file))
            : (file as Uint8Array)
        new JSZip().loadAsync(fileToLoad).then((zipFile) => {
          resolve(zipFile)
        })
      }
    })
  }

  public async readFile(name: string): Promise<string> {
    const file = await this.readResource(name)
    return new TextDecoder().decode(file)
  }

  public async readResource(name: string): Promise<Uint8Array> {
    if (!this.hasFile(name)) {
      console.warn(
        name +
          ' file was not found in ' +
          this.filePath +
          ', returning an empty Uint8Array'
      )
      return new Uint8Array()
    }
    const fileName = this.getFileName(name)!
    let file = await this.jsZip.file(fileName)!.async('uint8array')
    if (this.pathToProcessors[fileName]) {
      for (const processor of this.pathToProcessors[fileName]) {
        file = await processor(file)
      }
    }
    return file
  }

  public hasFile(name: string): boolean {
    return this.names.has(name.toLowerCase())
  }

  private getFileName(name: string): string | undefined {
    return this.names.get(name.toLowerCase())
  }
}
```

When loading an EPUB file:

- In the **browser**, it uses the `FileReader` API with an ` <input type="file" /> ` element.
- In **Node.js**, it loads the file via `readFileSync`.

Both results are passed into JSZip, wrapped in a `Promise`.

### mimetype and META-INF/container.xml

After initialization, we have a ZIP file object and can start parsing individual files.

The first step is reading the **`mimetype`** file. Its content **must** be exactly `application/epub+zip`; otherwise, the EPUB should be rejected.

Next, we parse **`META-INF/container.xml`**, which contains two important elements:

- ` <rootfiles> ` → contains , pointing to the main `.opf` file (the core package manifest).
- ` <links> ` → provides external resource references related to the book.

A typical `container.xml` looks like this (note that `full-path` is an absolute path relative to the ZIP root):

```xml
<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
   <rootfiles>
      <rootfile
          full-path="EPUB/My_Crazy_Life.opf"
          media-type="application/oebps-package+xml" />
   </rootfiles>
</container>
```

For details, check the `parseContainer` function in `packages/epub-parser/src/parseFiles.ts` and related logic in `epub.ts`.

### META-INF/encryption.xml

To ensure content security, EPUB may include an optional **`encryption.xml`** file describing which resources are encrypted. If the file doesn’t exist, the EPUB is unencrypted.

The EPUB spec requires that `encryption.xml` itself cannot be encrypted, so it can always be parsed using `xml2js-parser`. Encrypted XML files would otherwise fail to parse.

Since the EPUB standard does not mandate a specific encryption method, `epub-parser` implements two approaches:

1. **Hybrid RSA + AES encryption**
   - RSA encrypts the AES key.
   - AES encrypts the file content.
   - To decrypt, provide an RSA private key (`rsaPrivateKey` in PKCS8 format).
   - `encryption.xml` may contain multiple AES keys.
2. **Pure AES encryption**
   - No RSA involved.
   - Requires passing an `aesSymmetricKey` parameter.

The decryption strategy is implemented in `parseEncryption` (`packages/epub-parser/src/parseFiles.ts`) and works both in the browser (via Web Crypto API) and Node.js (via `crypto`).

- **Asymmetric algorithms supported**: `rsa-oaep`, `rsa-oaep-mgf1p`
- **Symmetric algorithms supported**: `aes-256-cbc`, `aes-256-ctr`, `aes-256-gcm`, `aes-128-cbc`, `aes-128-ctr`, `aes-128-gcm`
  - 192-bit AES is **not supported in browsers**, though Node.js supports it.
- IVs (initialization vectors) are stored in the header of the encrypted file.

Example of an `encryption.xml` combining RSA and AES:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"
  xmlns:enc="http://www.w3.org/2001/04/xmlenc#"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <!-- Encrypted AES key (RSA + SHA-256) -->
  <enc:EncryptedKey Id="EK">
    <enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#rsa-oaep">
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    </enc:EncryptionMethod>
    <ds:KeyInfo>
      <ds:KeyName>ExampleKeyName2</ds:KeyName>
    </ds:KeyInfo>
    <enc:CipherData>
      <enc:CipherValue>
        iH4GFXJu9XuS6dlBGOM.....
      </enc:CipherValue>
    </enc:CipherData>
  </enc:EncryptedKey>

  <!-- AES-192-CBC + Compression + IV (16 bytes) -->
  <enc:EncryptedData>
    <enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes192-cbc" />
    <ds:KeyInfo>
      <ds:RetrievalMethod URI="#EK" Type="http://www.w3.org/2001/04/xmlenc#EncryptedKey" />
    </ds:KeyInfo>
    <enc:CipherData>
      <enc:CipherReference URI="EPUB/xhtml/cover.xhtml" />
    </enc:CipherData>
    <enc:EncryptionProperties>
      <enc:EncryptionProperty xmlns:ns="http://www.idpf.org/2016/encryption#compression">
        <ns:Compression Method="8" OriginalLength="365" />
      </enc:EncryptionProperty>
    </enc:EncryptionProperties>
  </enc:EncryptedData>
</encryption>
```

- `enc:EncryptedKey`: RSA-encrypted AES key
- `enc:EncryptedData`: references the encrypted file and algorithm
- `ns:Compression`: compression info (`Method="8"` → deflate compression before encryption; `"0"` → no compression)

The parser converts this into a `PathToProcessors` object mapping file paths to processor functions. Passing it into `ZipFile.useDeprocessors` ensures that when files are read, the correct decryption process is applied. If no encrypted files exist, this step is skipped (though file reads still perform an extra check).

```
export type FileProcessor = (
  file: Uint8Array
) => Promise<Uint8Array> | Uint8Array
export type PathToProcessors = Record<string, FileProcessor[]>
```

### META-INF/rights.xml and META-INF/signatures.xml

In practice, **`encryption.xml`** is the main security mechanism. Without it, both `rights.xml` and `signatures.xml` are ineffective. The EPUB spec even notes:

> “Adding a digital signature is not a guarantee that a malicious actor cannot tamper with an [EPUB publication](https://www.w3.org/TR/epub-34/#dfn-epub-publication) as [reading systems](https://www.w3.org/TR/epub-34/#dfn-epub-reading-system) do not have to check signatures.”
>  — [EPUB 3.4 Specification](https://www.w3.org/TR/epub-34/#sec-container-metainf-signatures.xml)

### The `.opf` File

After locating the `.opf` file from `container.xml`, we parse it. This file contains five key sections:

- **metadata**
- **manifest**
- **spine**
- **guide**
- **collection**

Additionally, the `spine` element may include a `toc` attribute pointing to the table of contents (TOC) file.

#### metadata

The `metadata` element stores book-level information such as title and author. The parsing function (`parseMetadata`) is located in `packages/epub-parser/src/parseFiles.ts`.

Example:

```xml
<metadata>
  <dc:identifier id="pub-identifier">_simple_book</dc:identifier>
  <dc:title>The Joyful Delaneys</dc:title>
  <dc:language>en</dc:language>
  <dc:creator>Hugh Walpole</dc:creator>
  <dc:date>2014-11-26</dc:date>
  <dc:publisher>epubBooks Classics</dc:publisher>
  <dc:rights>Copyright © 2014 epubBooks</dc:rights>
  <dc:subject>Fiction</dc:subject>
</metadata>
```

Parsed into TypeScript:

```typescript
interface EpubMetadata {
  title: string
  language: string
  description?: string
  publisher?: string
  type?: string
  format?: string
  source?: string
  relation?: string
  coverage?: string
  rights?: string
  date?: Record<string, string>
  identifier: Identifier
  packageIdentifier: Identifier
  creator?: Contributor[]
  contributor?: Contributor[]
  subject?: Subject[]
  metas?: Record<string, string>
  links?: Link[]
}
```

One special element is `<meta>`. It can:

- Define key-value pairs (via `name` and `content`).
- Enhance existing metadata using `refines`, which references another element’s `id`.

For example, `refines="#pub-title"` could add extra properties to the ` <dc:title> `.

Currently, `epub-parser` only supports refining elements under `metadata`, but in theory refinements can apply to any tag in the `.opf`.

```xml
<meta content="item32" name="cover" />
<meta refines="#creator" property="file-as">Murakami, Haruki</meta>
```

#### manifest

The manifest describes the documents and resource files for each chapter in an EPUB.

- `href` is the relative path to the resource.
- `media-type` specifies the MIME type of the resource. When saving files or converting them into Blob URLs, the file extension must be inferred from `media-type`.
- `media-overlay` refers to a chapter’s SMIL file, which enables text-to-speech read-aloud functionality (covered later). This file, along with its corresponding audio file, is also defined under the manifest.
- `fallback` is used for resource fallback, in case a resource is corrupted. Its value must be the `id` of another manifest item. Nested fallback chains are supported, but circular references are not.

```xml
<manifest>
    <item properties="scripted mathml" id="c2" href="c2.xhtml" media-type="application/xhtml+xml" />
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"
          media-overlay="ch1_audio" />
    <item href="www.gutenberg.org@files@19033@19033-h@images@i010_th.jpg" id="item14"
          media-type="image/jpeg" />
    <item href="pgepub.css" id="item29" media-type="text/css" />
    <item href="www.gutenberg.org@files@19033@19033-h@19033-h-0.htm" id="item32"
          media-type="application/xhtml+xml" />
    <item href="toc.ncx" id="ncx" media-type="application/x-dtbncx+xml" />
    <item id='img03' href="images/info3.jpg" media-type="image/jpeg" fallback="img01" />
    <item id='img04' href="images/info4.jpg" media-type="image/jpeg" fallback="img03" />
</manifest>
```

The parsed manifest items are represented by the following interface. The `parseManifest` function returns an array of `ManifestItem`s and is defined in the `parseFiles` module:

```typescript
interface ManifestItem {
  // Unique identifier for the resource
  id: string
  // Path of the resource inside the epub (zip) file
  href: string
  // MIME type of the resource
  mediaType: string
  // Special role, e.g. cover-image
  properties?: string
  // Reference to audio overlay
  mediaOverlay?: string
  // Fallback resource id(s) in case this resource cannot be loaded
  fallback?: string[]
}
```

After parsing, all resources are saved immediately:

```typescript
this.manifest = parseManifest(rootFile[key][0], this.opfDir)
// save element if it is a resource, such as image, css
for (const key in this.manifest) {
  const manifestItem = this.manifest[key]

  this.hrefToIdMap[manifestItem.href] = manifestItem.id

  // css and image|font|audio|video
  if (
    savedResourceMediaTypePrefixes.has(manifestItem.mediaType) ||
    manifestItem.mediaType.startsWith('text/css')
  ) {
    const fileName: string = manifestItem.href.replace(/\//g, '_')
    const filePath = path.resolve(this.resourceSaveDir, fileName)
    this.savedResourcePath.push(filePath)
    writeFileSync(filePath, await this.zip.readResource(manifestItem.href))
  }
}
```

Since all resources are referenced inside chapters, a better approach would be **lazy loading** on demand when chapters are opened. However, at the time of writing, all resources are saved at once. This will likely be refactored later.

Unlike `epub-parser`, other parsers in `@lingo-reader` such as `mobi-parser` and `fb2-parser` do support lazy loading.

When saving resources, their paths are recorded in `this.savedResourcePath`, and a cleanup API is exposed so that users can remove unnecessary files.

#### spine

The **spine** defines the default reading order of the EPUB. Each ` <itemref> ` element corresponds to a manifest item by referencing its `id`.

- `linear="yes"` means the resource is part of the normal reading flow.
- `linear="no"` means it is excluded.
- If omitted, the default is `"yes"`.

```xml
<spine toc="ncx">
    <itemref idref="intro"/>
    <itemref idref="c1" linear="yes"/>
    <itemref idref="c1-answerkey" linear="no"/>
</spine>
```

The parsed spine items are represented as:

```typescript
export type SpineItem = ManifestItem & { linear?: string }
export type EpubSpine = SpineItem[]
```

The `toc` attribute of ` <spine> ` points to the `.ncx` table of contents file, which is parsed after the `.opf` file.

#### guide

The **guide** section points to preview chapters or images, e.g. the book cover:

```xml
<guide>
	<reference href="www.gutenberg.org@files@19033@19033-h@images@cover_th.jpg" type="cover" title="Cover Image" />
</guide>
```

- `href` is the relative path.
- `type` is defined in the [OPF 2.0.1 draft spec](https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm#Section2.6).
- `title` is a human-readable label.
- A `type` of `cover` indicates that the resource is the book’s cover image.

As of `@lingo-reader/epub-parser@0.4.0`, this is not implemented yet, but will likely be supported later with a `getCoverImage` API.

```typescript
export interface GuideReference {
  title: string
  type: string
  href: string
}
export type EpubGuide = GuideReference[]
```

#### collection

The **collection** element groups resources by role/type. Multiple collections may exist under ` <package> `.

```xml
<collection role="index">
    <link href="subjectIndex01.xhtml"/>
    <link href="subjectIndex02.xhtml"/>
    <link href="subjectIndex03.xhtml"/>
</collection>
```

The parsed result is:

```typescript
export interface CollectionItem {
  role: string
  links: string[]
}
export type EpubCollection = CollectionItem[]
```

### .ncx file

The `.ncx` file mainly contains three elements:

- `navMap` – the table of contents
- `pageList` – page navigation mapping to the print edition
- `navList` – index-like navigation

Example `navMap`:

```xml
<navMap>
    <navPoint class="h1" id="ch1" playOrder="1">
        <navLabel>
            <text>Chapter 1</text>
        </navLabel>
        <content src="content.html#ch_1"/>
        <navPoint class="h2" id="ch_1_1">
            <navLabel>
                <text>Chapter 1.1</text>
            </navLabel>
            <content src="content.html#ch_1_1"/>
        </navPoint>
    </navPoint>
    ...
</navMap>
```

Each `navPoint` represents a TOC node and supports nesting.

- `navLabel>text` → display name
- `content@src` → relative path to document

When parsing `src`, you must apply `decodeURIComponent` to handle encoded characters (`#`, `,`, etc.).

Resulting data structure:

```typescript
export interface NavPoint {
  label: string
  href: string
  id: string
  playOrder: string
  children?: NavPoint[]
}
export type EpubToc = NavPoint[]
```

`pageList` maps page numbers, and `navList` provides term-based indexes.

### Loading chapters

Each chapter is an XHTML (or HTML/HTM) document. Resource paths inside must be rewritten to valid URLs so that converted HTML can be displayed directly in the browser:

- In browser → Blob URLs
- In Node.js → local file paths

`epub-parser` separates processing into two parts:

1. CSS in `<head>`
2. Embedded resources in `<body>` (images, audio, video, etc.)

Regex-based extraction is used to improve performance. For example, when replacing CSS paths, not only `<link>` hrefs are updated, but also `url()` references inside CSS files (only one level deep is handled).

[The TS code sample you provided remains unchanged here, already self-explanatory.]

Similarly, `<img>`, `<video>`, `<audio>`, `source`, and `<svg> -> <image>` references are updated.

**Special case: `<a>` links**
 Since hyperlinks point to other EPUB documents (relative paths), they must be transformed into a custom scheme to support navigation. `epub-parser` rewrites them to:

```
epub:[absolute-path-inside-epub]#id
```

An API `resolveHref` is provided to resolve these links back into chapter IDs and element IDs, enabling higher-level navigation logic.

⚠️ **Security note**: Original XHTML may contain external resource references (`http/https`). These may expose users to XSS or malicious attacks. `epub-parser` does not sanitize them; instead, it delegates this responsibility to the application layer. For example, `lingo-reader` uses **DOMPurify** for sanitization.

- Reader app: [https://hhk-png.github.io/lingo-reader/#/](https://hhk-png.github.io/lingo-reader/#/)
- Code: [https://github.com/hhk-png/lingo-reader/tree/main/reader-html](https://github.com/hhk-png/lingo-reader/tree/main/reader-html)

#### media-overlay

As mentioned earlier, a manifest item may include a `media-overlay` attribute pointing to a SMIL file. This enables synchronized text-to-speech playback.

Example SMIL file:

```xml
<smil xmlns="http://www.w3.org/ns/SMIL" version="3.0">
   <body>
      <par id="par1">
         <text src="chapter1.xhtml#sentence1"/>
         <audio src="chapter1_audio.mp3" clipBegin="0s" clipEnd="10s"/>
      </par>
      ...
   </body>
</smil>
```

- `par` → smallest unit, linking text and audio
- `text@src` → document path + element ID
- `audio@src` → audio file path
- `clipBegin` / `clipEnd` → time segments

`epub-parser` supports:

- Plain numbers
- Seconds with “s” suffix
- SMIL-style time strings (`h:mm:ss.sss`, `mm:ss.sss`)

It parses them into seconds (`number`).

Resulting structures:

```typescript
export interface Par {
  textDOMId: string
  clipBegin: number
  clipEnd: number
}

export interface SmilAudio {
  audioSrc: string
  pars: Par[]
}

export type SmilAudios = SmilAudio[]
```

## Conclusion

This article introduced the design and implementation of `@lingo-reader/epub-parser`, including third-party libraries used, parsing strategy, and resource handling.

- **Project repo**: [https://github.com/hhk-png/lingo-reader](https://github.com/hhk-png/lingo-reader)
- **Web reader**: [https://hhk-png.github.io/lingo-reader/#/](https://hhk-png.github.io/lingo-reader/#/)

## References

1. EPUB 3.4 Specification: [https://www.w3.org/TR/epub-34/#abstract](https://www.w3.org/TR/epub-34/#abstract)
2. EPUB 3.3 Specification: [https://www.w3.org/TR/epub-33/#sec-pkg-metadata](https://www.w3.org/TR/epub-33/#sec-pkg-metadata)
3. OPF 2.0.1 Specification: [https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm](https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm)
4. DOMPurify: [https://github.com/cure53/DOMPurify](https://github.com/cure53/DOMPurify)
5. foliate-js: [https://github.com/johnfactotum/foliate-js](https://github.com/johnfactotum/foliate-js)
6. Bing Daily HD Wallpapers: [https://bing.ee123.net/](https://bing.ee123.net/)