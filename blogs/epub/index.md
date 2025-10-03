**项目地址**：[https://github.com/hhk-png/lingo-reader](https://github.com/hhk-png/lingo-reader)

**网页端电子书阅读器**：[https://hhk-png.github.io/lingo-reader/#/](https://hhk-png.github.io/lingo-reader/#/)

## 简介

目前市面上的电子书文件格式有多种，包括**EPUB、FB2、MOBI**、SNB、LRF、AZW3。其中，前三种为共有的电子书格式，后三种为私有的电子书格式，是各阅读器厂商为了满足自己私人的要求而创建的，因此无法直接从网络上获取这些电子书的具体格式，并且解析这一类电子书格式时可能还涉及到版权问题。

前三种电子书文件，只有 **EPUB** 还在继续更新，具体可查看 [https://github.com/w3c/epub-specs](https://github.com/w3c/epub-specs)，目前最新的进展是 [EPUB 3.4](https://www.w3.org/TR/epub-34/#abstract)，FB2 和 MOBI 都已经停止维护。不过 MOBI 的停止维护是以被 **Amazon(亚马逊)** 收购收尾的，亚马逊在其基础上构建了 AZW3 电子书格式。

鉴于只有 **EPUB** 格式还在持续更新，因此写一篇博客来介绍一下本人前段时间做的关于 EPUB 电子书文件解析的工作，包括解析流程以及设计思路，便于后来者在做类似的工作时借鉴。

以博客的篇幅，无法介绍到所有的解析细节，因此你可以直接查看代码仓库 [https://github.com/hhk-png/lingo-reader](https://github.com/hhk-png/lingo-reader) 来了解这一部分，以及其他三个电子书格式解析的细节。如有一些**问题**或者**建议**，也可以在 issue 中直接提问：[https://github.com/hhk-png/lingo-reader/issues](https://github.com/hhk-png/lingo-reader/issues)，或者直接评论留言。

## 第三方库的选择思路

解析中用到了几个第三方库，分别是 **jszip**、**xml2js**、**path-browserify**、**fflate**。

1. 使用 **jszip** 是因为 epub 文件本质上是一个 zip 文件，解析需要从 zip 文件中读取文件。
2. 选择 **xml2js** 是因为 epub 中的资源信息、元信息等都存储在 xml 文件中，需要解析 xml 文件。xml2js 的 parser 和 builder 是在一起的，使用的是 commonjs 的导出规范，所在在项目中如果只是用了 parser，也还是会将 builder 也一起打包到项目文件中，builder 无法被 treeshaking。为了解决这个问题，`@lingo-reader/epub-parser` 的做法是将 xml2js 的 parser inline 掉，将原本的`coffeescript` 转换为 `typescript`，这样就变成了本项目直接依赖 saxjs 来做 xml 的解析。代码地址为 [https://github.com/hhk-png/lingo-reader/blob/main/packages/shared/src/xml2js-parser.ts](https://github.com/hhk-png/lingo-reader/blob/main/packages/shared/src/xml2js-parser.ts)。你也可以直接`pnpm install @lingo-reader/shared`，来使用这个 parser，虽然没有没有为 shared 这个包书写文档。
3. 因为 `@lingo-reader/epub-parser` 需要同时支持在浏览器端与 node 端运行，所以使用 **path-browserify** 是为了兼容在浏览器端的文件路径的处理，解析资源路径时需要使用。在 node 端，直接使用 node 的 path 模块，打包时通过静态变量来避免特定环境下引入不应该引入的包。
4. `epub-parser` 的解密模块需要用到 **fflate** 的 inflateSync 解压缩函数。

解析 zip 文件的另一个同等功能的库还有 [zip.js](https://github.com/gildas-lormeau/zip.js) 。解析与构建 xml 的另一个同功能的库有 [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)，[fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) 的文档中表示其性能较好，但由于当时做的急，而其上层的功能较少，需要自己写一些东西来满足自己的需求，因此并没有使用此库，而是使用的 xml2js。

为了在浏览器中兼容 node 端的 fs 模块，使用了一个简单的 js 对象来满足了这个需求。

## 解析流程以及设计思路

epub 中的文件分为三类，首先是存放信息的 `.opf`、`META-INF/container.xml`、`META-INF/encryption.xml`等 xml 文件，第二类是存放章节文本的`xhtml`文件，在其中包含了对资源文件的引用。第三种则是资源文件，包括视频，音频，字体以及最常用的图片等资源文件。

为了便于解析与构建，epub 中的一些文件的地址是固定的，有 `mimetype`、`META-INF/container.xml`、`META-INF/encryption.xml`、 `META-INF/manifest.xml`、 `META-INF/metadata.xml`、 `META-INF/rights.xml`、 `META-INF/signatures.xml`。

其中 `mimetype` 存放在根目录，内容必须为 `application/epub+zip`，否则应该报错。其余的固定文件则是放在 `META-INF` 文件夹下，`manifest.xml` 和 `metadata.xml` 需要描述的内容，一般放在 `.opf` 文件下，而不是单独放一个文件。

epub 的解析流程是一个线性过程，整个过程并不复杂。下面按照解析过程来讲解一下各文件的解析。

### 初始化

解析过程放在了 EpubFile 下面，最开始做的事情除了处理传入的参数以外，首先做的是初始化 zip 文件，具体做法是基于 `jszip` 封装了一个 `ZipFile` 类，向外暴漏了读取文本和读取二进制文件的接口，并增加了针对加密文件的处理，以应对加了密的 epub 文件。zip 内部文件的读取应使用绝对路径，所以在读取之间要对资源的路径进行处理。具体代码如下：

```typescript
export async function createZipFile(filePath: InputFile): Promise<ZipFile> {
  const zip = new ZipFile(filePath)
  await zip.loadZip()
  return zip
}

// wrap epub file into a class, epub file is a zip file
//  expose file operation(readFile, readImage..) to process the file in .zip
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
          ' file was not exit in ' +
          this.filePath +
          ', return an empty uint8 array'
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

在最初读取 epub 文件时，浏览器端使用的是 `FileReader` API，通过`<input type="file"/>`加载，node 端则会通过文件路径，使用`readFileSync`获取文件，两者的结果都会传入 JSZip 中，在两者之外包装了一层 Promise。

### mimetype 与 META-INF/container.xml

初始化之后，得到了 zip 的文件对象，之后就是解析各文件的流程。首先读取 mimetype 文件，判定其内容必须为 `application/epub+zip`，否则会报错，这一点在前面已经说过。

接下里来是 `META-INF/container.xml` 文件，其中的标签主要包括两部分，一个是 rootfiles 下的 rootfile 标签，指向最核心的 `.opf` 文件。另一部分是与 rootfiles 同级的 links 下的 link 标签，指向外部的与本书相关的资源链接。container.xml 文件一般如下，其中的 `full-path` 为绝对路径，相对于 zip 的根目录。具体的解析流程可以参考项目中 `packages/epub-parser/src/parseFiles.ts` 中的`parseContainer` 函数以及 `epub.ts` 中的相关部分。

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

### META-INF/encryption.xml

为了保证文件的安全性，epub 通过该文件记录了被加密的文件的信息，该文件是可选的，如果没有该文件，则代表 epub 文件没有被加密。epub 的规范规定像 encryption.xml 这样的文件不能被自身加密，所以可以直接被 xml2js-parser 解析，不会报错。加密的 xml 文件传入 xml2js-parser 后会直接报错，无法解析。

epub 规范并没有指定加密方式，因此 `epub-parser` 只处理了两种加密方式。第一种是使用非对称加密算法 RSA 加密对称加密算法 AES 的对称密钥，使用 AES 算法加密文件内容，解密时首先通过 RSA 的私钥获取到 AES 的对称密钥，然后解密由 AES 加密的文件内容。这时需要在 EpubFileOptions 中传入 pkcs8 格式的 `rsaPrivateKey` 私钥，此种方式支持在`encryption.xml` 中存入多个对称密钥信息。第二种是仅使用 AES 直接加密文件内容，不使用 RSA 加密密钥信息，因此需要传入 `aesSymmetricKey` 参数。具体的解密策略可以查看 `packages/epub-parser/src/parseFiles.ts` 中的`parseEncryption` 方法。

解密流程没有依赖额外的第三方库，而是基于浏览器的 web crypto api 与 node crypto 实现，可以同时支持在浏览器端与 node 端运行。浏览器支持的加解密算法少于 node crypto，而浏览器支持的算法在 node 中都有支持，因此所支持的算法与浏览器相同，是 node crypto 的子集。

支持的非对称加密算法有 `rsa-oaep`，`rsa-oaep-mgf1p`。

支持的对称加密算法有 `aes-256-cbc`，`aes-256-ctr`，`aes-256-gcm`，`aes-128-cbc`，`aes-128-ctr`，`aes-128-gcm`。192 位的 Aes 算法在浏览器中不支持，解析该算法加密的文件时会报错，但是在 node 中可以正常解析。加密所使用的 IV 应该放在加密后文件的头部。

256 位、192 位、128 位加密算法的密钥长度分别为 32B、24B、16B。

下面是其中一种可以解析的 `encryption.xml` 的文件内容，采用的是非对称加密和对称加密相结合的加密方法：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"
  xmlns:enc="http://www.w3.org/2001/04/xmlenc#"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <!-- encrypted-aeskey-rsa-sha256 -->
  <enc:EncryptedKey Id="EK">
    <enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#rsa-oaep">
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    </enc:EncryptionMethod>
    <ds:KeyInfo>
      <ds:KeyName>
        ExampleKeyName2
      </ds:KeyName>
    </ds:KeyInfo>
    <enc:CipherData>
      <enc:CipherValue> <!-- 密钥 -->
        iH4GFXJu9XuS6dlBGOM.....
      </enc:CipherValue>
    </enc:CipherData>
  </enc:EncryptedKey>

  <!-- aes192-cbc + Compression + IV 16 byte -->
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

  .........
  .........
</encryption>
```

`enc:EncryptedKey` 存储的是经过 rsa 非对称加密算法加密的对称密钥信息，`enc:EncryptedData` 存储的是被被加密的文件的加密信息，包括文件路径与所使用的加密算法。其中 `enc:EncryptionProperties` 下的 `ns:Compression` 表示的是压缩信息，`Method` 为 `"8"` 代表文件在加密之前进行了 `inflate` 压缩，在文件解密时应该先解密，再解压缩。`Method` 为 `"0"` 表示文件只进行了加密，没有被压缩。

parseEncryption 会将该文件解析成 PathToProcessors 类型的输出，PathToProcessors 的键为文件路径，值为对应的处理函数数组。将该输出通过 ZipFile 的 useDeprocessors 传入后，就能够在读取文件的时候检测是否有对应的解密流程，然后选择是否执行。如果没有加密文件，则不会走解析的流程，不会得到 PathToProcessors 以及使用 useDeprocessors，但读取文件时还是会多一次判断。

```typescript
export type FileProcessor = (
  file: Uint8Array
) => Promise<Uint8Array> | Uint8Array
export type PathToProcessors = Record<string, FileProcessor[]>
```

### META-INF/rights.xml 与 META-INF/ signatures .xml

保证文件安全性的主要手段还是 `encryption.xml` 文件，如果没有 `encryption.xml` 文件的支持，`rights.xml` 与 `signatures.xml` 都无法正常运行，因此也显得有些多余。而且规范里也提到：

> "Adding a digital signature is not a guarantee that a malicious actor cannot tamper with an [EPUB publication](https://www.w3.org/TR/epub-34/#dfn-epub-publication) as [reading systems](https://www.w3.org/TR/epub-34/#dfn-epub-reading-system) do not have to check signatures."
>
> From [https://www.w3.org/TR/epub-34/#sec-container-metainf-signatures.xml](https://www.w3.org/TR/epub-34/#sec-container-metainf-signatures.xml)

### .opf 文件

在从 `container.xml` 里获取到 `.opf` 文件的路径后，就要开始对其的解析。`.opf` 里有 5 个主要的标签需要解析，分别是 metadata、manifest、spine、guide、collection。`.opf` 还会再 spine 标签的属性中通过 `toc` 属性指向了了 toc 文件，其中主要存放的是电子书的目录。

#### metadata

parseMetadata 函数位置：`packages/epub-parser/src/parseFiles.ts`

metadata 标签下存放的是书籍的元信息，包括书名、作者等。大部分都以标签名的方式直接表示，如下所示：

```xml
<?xml version="1.0" encoding="utf-8" standalone="no"?>
<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" version="3.0" xml:lang="en" unique-identifier="pub-identifier">
  <metadata>
    <dc:identifier id="pub-identifier">_simple_book</dc:identifier>
    <meta id="meta-identifier" property="dcterms:identifier">_simple_book</meta>
    <dc:title id="pub-title">The Joyful Delaneys</dc:title>
    <meta property="dcterms:title" id="meta-title">The Joyful Delaneys</meta>
    <dc:language id="pub-language">en</dc:language>
    <meta property="dcterms:language" id="meta-language">en</meta>
    <meta property="dcterms:modified">2014-11-26T12:45:31Z</meta>
    <!--The preceding date value is actually local time (not UTC) in UTC format because there is no function in XSLT 1.0 to generate a correct UTC time-->
    <meta content="cover-image" name="cover"/>
    <meta id="meta-creator2" property="dcterms:creator">Hugh Walpole</meta>
    <dc:creator id="pub-creator2">Hugh Walpole</dc:creator>
    <meta property="dcterms:date">2014-11-26</meta>
    <dc:date>2014-11-26</dc:date>
    <meta property="dcterms:publisher">epubBooks Classics</meta>
    <dc:publisher>epubBooks Classics</dc:publisher>
    <meta property="dcterms:rights">Copyright © 2014 epubBooks</meta>
    <dc:rights>Copyright © 2014 epubBooks</dc:rights>
    <meta property="dcterms:rightsHolder">epubBooks</meta>
    <meta property="dcterms:subject">Fiction</meta>
    <dc:subject>Fiction</dc:subject>
  </metadata>

  ........
</package>

```

上面的各标签最终会被解释为如下的对象：

```typescript
interface EpubMetadata {
  // 书名
  title: string
  // 书的语言
  language: string
  // 书的描述
  description?: string
  // epub文件的发布者
  publisher?: string
  // 通用的书籍类型名称，比如小说、传记等
  type?: string
  // epub文件的mimetype
  format?: string
  // 书籍原始内容来源
  source?: string
  // 关联的外部资源
  relation?: string
  // 出版物内容的范围
  coverage?: string
  // 版权声明
  rights?: string
  // 包括书籍的创建时间，发布时间，更新时间等，
  // 具体的字段需要查看其opf:event,比如 modification、
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

这些值的具体的含义可以查看规范以及 epub-parser 的代码，在此不做详细描述。

一个比较特殊的标签是 `<meta>` 标签，它的一个作用是表述一个键值对，通过 name 和 content 属性。另一个作用是其可以为其他的资源或者字段增加描述属性，通过 refines 属性就能找到对应的属性，refines 的值为对应元素的 id，键值对分别为 property 属性和标签下的文本。

refines 可以增强 opf 文件内任一标签，但是 `epub-parser` 只处理了其增强 metadata 下标签的情况。

```xml
<meta content="item32" name="cover" />
<meta refines="#creator" property="file-as">Murakami, Haruki</meta>
```

#### manifest

manifest 描述 epub 中章节的文档和资源文件，其中 href 为资源的相对地址，media-type 为资源类型，在保存文件或者将其转换为 Blob Url 时需要根据 media-type 来判断文件的后缀名，media-overlay 为章节的 smil 文件，用于实现语音跟读功能，稍后会讲，该文件以及对应的 audio 音频文件同样描述在 manifest 下。fallback 对应用于资源回滚，以应对资源损坏的情况，其值为 manifest item 的 `id`，并且支持嵌套多层 fallback，但是不支持循环引用。

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

下面是解析后的每个 item 的 interface，parseManifest 最终的返回值是 ManifestItem 的数组，同样，parseManifest 也在 parseFiles 文件中：

```typescript
interface ManifestItem {
  // 资源的唯一标识
  id: string
  // 资源在 epub(zip) 文件中的路径
  href: string
  // 资源类型，mimetype
  mediaType: string
  // 资源所起的作用，值可以为cover-image
  properties?: string
  // 音视频资源的封面
  mediaOverlay?: string
  // 用于回滚的资源id列表，当前资源无法加载时，可以使用fallback中相应的资源来替代。
  fallback?: string[]
}
```

在解析完成之后，就直接将所有的资源都保存了下来，代码如下：

```typescript
this.manifest = parseManifest(rootFile[key][0], this.opfDir)
// save element if it is a resource, such as image, css
// which was determined by media-type
for (const key in this.manifest) {
  const manifestItem = this.manifest[key]

  this.hrefToIdMap[manifestItem.href] = manifestItem.id

  // css and image|font|audio|video
  if (
    savedResourceMediaTypePrefixes.has(manifestItem.mediaType) ||
    // exclude html and xhtml...
    manifestItem.mediaType.startsWith('text/css')
  ) {
    const fileName: string = manifestItem.href.replace(/\//g, '_')
    const filePath = path.resolve(this.resourceSaveDir, fileName)
    this.savedResourcePath.push(filePath)
    writeFileSync(filePath, await this.zip.readResource(manifestItem.href))
  }
}
```

因为资源都是在文档中引用，因此更好的资源的保存方式是在加载章节时按需加载，因为在做的时候没有考虑到这方面，所以是一次性保存了所有的资源文件。以后大概率会重构这一部分。

虽然 epub-parser 没有实现按需加载，但是 `@lingo-reader` 的其他 parser 实现了，即 mobi-parser、fb2-parser。

在保存资源时会将资源路径通过 `this.savedResourcePath` 记录下来，并向上暴露一个清除这些文件的接口，以便用户清除多余的文件。

#### spine

spine 的含义为 epub 的默认的阅读顺序，阅读顺序也就是 itemref 标签的排列顺序，标签的 idref 属性为章节 xhtml 文件的 id，资源的描述也就是对应的 manifest item。linear 属性为“yes”则表示该文档或资源应该在放在正常的阅读顺序里面，为"no"则相反。如果不存在该元素，则默认视为"yes"。

```xml
<spine toc="ncx">
    <itemref idref="intro"/>
    <itemref idref="c1" linear="yes"/>
    <itemref idref="c1-answerkey" linear="no"/>
</spine>
```

最终处理的结果为 EpubSpine，如下所示，相比于 ManifestItem 额外增加了一个 linear 属性：

```typescript
export type SpineItem = ManifestItem & { linear?: string }
export type EpubSpine = SpineItem[]
```

spine 标签的 toc 属性为.ncx 目录文件的 id，里面存放着电子书的目录，在解析完.opf 文件之后解析。

#### guide

guide 为书籍的预览章节，或者预览图片。如下：

```xml
<guide>
	<reference href="www.gutenberg.org@files@19033@19033-h@images@cover_th.jpg" type="cover" title="Cover Image" />
</guide>
```

href 为文件的相对路径，type 定义在 [https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm#Section2.6](https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm#Section2.6) 中，title 为该 reference 的标题。type 为 cover 表示该图像是书籍的封面图片。

epub-parser 在 `v0.4.0` 版本并没有对此处理，以后大概率会支持，并向外暴露一个 getCoverImage API。

最终的处理结果如下面的 EpubGuide。

```typescript
export interface GuideReference {
  title: string
  type: string
  href: string
}
export type EpubGuide = GuideReference[]
```

#### collection

collection 用于整合资源，对资源的类型做一个区分。package 下的 collection 可以有多个，如下：

```xml
<collection role="index">
    <link href="subjectIndex01.xhtml"/>
    <link href="subjectIndex02.xhtml"/>
    <link href="subjectIndex03.xhtml"/>
</collection>
```

最终会被处理成 EpubCollection，最终处理成的 link 为资源在 epub 中的绝对路径：

```typescript
export interface CollectionItem {
  role: string
  links: string[]
}
export type EpubCollection = CollectionItem[]
```

### .ncx 文件

该文件下的标签主要有三个，分别为 navMap、pageList、navList。navMap 为书籍的目录描述结构，如下

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
    <navPoint class="h1" id="ncx-2">
        <navLabel>
            <text>Chapter 2</text>
        </navLabel>
        <content src="content.html#ch_2"/>
    </navPoint>
    <navPoint class="h1" id="ncx-3">
        <navLabel>
            <!-- has no <text> -->
        </navLabel>
        <content src="%2ccontent2.html#ch_3"/>
    </navPoint>
</navMap>
```

navPoint 为目录结点，支持嵌套。其下面的 navLabel>text 为目录项的名称，content 的 src 属性为文档的相对路径。在解析该 src 时，需要注意 `decodeURIComponent` 来解码路径，因为其中的 `#` 或者 `,` 等符号可能会被编码。

最终解码出的数据结构如下：

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

pageList 提供的是印刷版页面对应的导航信息，navList 用来提供基于术语或其他索引的导航，相当于“索引表”，在此不做描述，可以查看 epub-parser 的源码或者规范。

### 加载章节

#### 资源路径替换

每一个章节是一个 xhtml(or html, htm)文档，文档中的资源路径全部都是在 epub 文件中的相对路径，为此，需要将这些路径全部替换为可以使用的真实路径，以便转化后的 html 可以直接放在页面上展示。在浏览器环境下，转换后的路径为 blob url，node 环境下，转换后的路径为在操作系统上的真实文件路径。

epub-parser 将页面分为两部分，第一部分是 head 下的 CSS，第二部分是页面中的资源加载路径，包括图片、音视频等。在提取原始的相对路径时，采取的是正则表达式的方式，比如匹配 css 路径时，先匹配到 head 标签，然后匹配 head 标签下 link 标签，在获取所有的 css 路径，这种不断缩小匹配范围的做法相比于最开始直接在整个范围中匹配能够有效的提升效率。针对 css 的路径替换规则如下所示，除了针对 css 文件路径的替换，还考虑了 css 文件中存在的 `url()` 方式加载资源的情况，但是只考虑了一层。

```typescript
// head
const head = html.match(/<head[^>]*>([\s\S]*)<\/head>/i)
const css: EpubCssPart[] = []
if (head) {
  const links = head[1].match(/<link[^>]*>/g)!
  if (links) {
    for (const link of links) {
      const linkHref = link.match(/href="([^"]*)"/)![1]
      if (linkHref.endsWith('.css')) {
        // css file path
        const cssFilePath = path.joinPosix(htmlDir, linkHref)
        const cssName = cssFilePath.replace(/\//g, '_')
        let realPath = path.resolve(resourceSaveDir, cssName)

        // replace url() in css and save css file
        let fileContent = new TextDecoder().decode(readFileSync(realPath))
        fileContent = fileContent.replace(
          /url\(([^)]*)\)/g,
          (_, url: string) => {
            // remove ' or "
            url = url.replace(/['"]/g, '')
            const realUrl = getResourceUrl(
              url.trim(),
              path.dirname(cssFilePath),
              resourceSaveDir
            )
            return `url(${realUrl})`
          }
        )
        writeFileSync(realPath, new TextEncoder().encode(fileContent))

        // get blob url in browser
        if (__BROWSER__) {
          realPath =
            browserUrlCache.get(cssName) ||
            URL.createObjectURL(new Blob([fileContent], { type: 'text/css' }))
        }
        css.push({
          id: cssName,
          href: realPath,
        })
      }
    }
  }
}
```

body 下的 html 在替换了资源路径后就是最终要返回的 html 的内容，`@lingo-reader/epub-parser` 处理了多种资源引用方式，包括 img、video、audio、source 通过 src 属性引用，svg 的 image 标签通过 href 或者 xlink:href 引入，部分替换逻辑如下。

```typescript
str = str.replace(/<(img|video|audio|source)[^>]*>/g, (imgTag) => {
  // src
  const src = imgTag.match(/src="([^"]*)"/)?.[1]
  if (src) {
    const imageSrc = getResourceUrl(src, htmlDir, resourceSaveDir)
    imgTag = imgTag.replace(src, imageSrc)
  }

  // poster
  const poster = imgTag.match(/poster="([^"]*)"/)?.[1]
  if (poster) {
    const posterSrc = getResourceUrl(poster, htmlDir, resourceSaveDir)
    imgTag = imgTag.replace(poster, posterSrc)
  }
  return imgTag
})
```

还有一个特殊的点是 a 标签的 href 超链接，原有的 href 指向的是 epub 内部的其他文档，使用的还是相对地址。如果不做处理，在展示到页面上点击时，就会跳到不正确的页面。该路径也不同于资源的加载，因为需要涉及到跳转逻辑。为此，`epub-parser` 将这个路径处理成了 `epub:[在epub中的绝对路径]#id` 的形式，将原有路径替换为了绝对路径，并在前面增加了一个 `epub:` 前缀，代码如下所示：

```typescript
// a tag href
str = str.replace(/<a[^>]*>/g, (aTag: string) => {
  const href = aTag.match(/href="([^"]*)"/)?.[1]
  if (href && !/^https?|mailto/.test(href)) {
    const transformedHref = path.joinPosix(htmlDir, href)
    aTag = aTag.replace(href, HREF_PREFIX + decodeURIComponent(transformedHref))
  }
  return aTag
})
```

EpubFile 里还有一个 resolveHref 方法，将替换后的 href 的路径传入该函数，就能得到对应章节的 id 与元素 id。这样在上层的应用上就可以处理跳转逻辑。navMap 等的 href 也被替换为了上面说的处理后的路径。

还需要**注意**的是，原有的 xhtml 文件的资源标签可能通过 http/https 等协议引用外部资源，这就有可能导致用户受到 xss 等恶意的网络攻击，`epub-parser` 并没有对加载外部资源的链接做任何处理，因为本人发现由用户在上层做这一件事是一个更好的选择。在基于 `lingo-reader` 开发的上层应用中，选择了 `DOMPurify` 来处理这一件事情。

上层应用的地址为：[https://hhk-png.github.io/lingo-reader/#/](https://hhk-png.github.io/lingo-reader/#/)。

代码地址为：[https://github.com/hhk-png/lingo-reader/tree/main/reader-html](https://github.com/hhk-png/lingo-reader/tree/main/reader-html)。

#### media-overlay

钱买你提到过 manifest item 里有 media-overlay 这个属性，media-overlay 指向的是 smil 文件的资源 id，epub 通过此种方式支持语音朗读功能。smil 的内容示例如下所示：

```xml
<smil
    xmlns="http://www.w3.org/ns/SMIL"
    version="3.0">
   <body>
      <par id="par1">
         <text
             src="chapter1.xhtml#sentence1"/>
         <audio
             src="chapter1_audio.mp3"
             clipBegin="0s"
             clipEnd="10s"/>
      </par>
      <!-- a table with two nested rows -->
       <seq
            id="id3"
            epub:textref="c01.xhtml#tr1"
            epub:type="table-row">

           <par
                id="id4"
                epub:type="table-cell">
               <text
                     src="c01.xhtml#td1"/>
               <audio
                      src="chapter1_audio.mp3"
                      clipBegin="0:24:15.000"
                      clipEnd="0:24:18.123"/>
           </par>

           <par
                id="id5"
                epub:type="table-cell">
               <text
                     src="c01.xhtml#td2"/>
               <audio
                      src="chapter1_audio.mp3"
                      clipBegin="0:24:18.123"
                      clipEnd="0:25:28.530"/>
           </par>

           <par
                id="id6"
                epub:type="table-cell">
               <text
                     src="c01.xhtml#td3"/>
               <audio
                      src="chapter1_audio.mp3"
                      clipBegin="0:25:28.530"
                      clipEnd="0:25:45.515"/>
           </par>
       </seq>
      <par id="par3">
         <text
             src="chapter1.xhtml#sentence3"/>
         <audio
             src="chapter1_audio.mp3"
             clipBegin="20s"
             clipEnd="30s"/>
      </par>
   </body>
</smil>
```

smil 中存储信息的基本单位是 par 标签，其下面的 text 标签中存放着文档地址以及具体元素 id 的地址，audio 的 src 属性为对应音频的地址，clipBegin 和 clipEnd 为是时间段标记。epub-parser 可以处理的 clipBegin 和 clipEnd 的值有三种，第一种是纯数值、第二种是秒数，第三种是 smil 的特殊时间表达方式。时间的处理方式如下，最终的返回结果是表示秒数的 numer 类型变量：

```typescript
export function smilTimeToSeconds(timeStr: string): number {
  // support "h:mm:ss.sss" , "mm:ss.sss" or  "12.5s"
  if (timeStr.endsWith('s')) {
    return Number.parseFloat(timeStr) // "12.5s" case
  }

  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  } else if (parts.length === 2) {
    const [m, s] = parts
    return m * 60 + s
  } else {
    return Number(timeStr)
  }
}
```

smil 文件的解析过程如下，解析过程只针对 par 标签做了处理。考虑到一个文档可以对应多个音频的情况，最终返回的结果类型是 SmilAudios。

```typescript
// type
export interface Par {
  // element id
  textDOMId: string
  // unit: s
  clipBegin: number
  clipEnd: number
}

export interface SmilAudio {
  audioSrc: string
  pars: Par[]
}

export type SmilAudios = SmilAudio[]

// function
function traversePar(
  pars: any,
  smilDir: string,
  resourceSaveDir: string,
  parsedAudios: Record<string, SmilAudio>
) {
  for (const par of pars) {
    if (par['#name'] === 'par') {
      const textDOMId = par.text[0].$.src.split('#')[1]
      const audioAttrs = par.audio[0].$
      const audioSrc = getResourceUrl(audioAttrs.src, smilDir, resourceSaveDir)
      const clipBegin = cachedSmilTimeToSeconds(audioAttrs.clipBegin)
      const clipEnd = cachedSmilTimeToSeconds(audioAttrs.clipEnd)

      if (!parsedAudios[audioSrc]) {
        parsedAudios[audioSrc] = {
          audioSrc,
          pars: [],
        }
      }
      parsedAudios[audioSrc].pars.push({ textDOMId, clipBegin, clipEnd })
    } else {
      traversePar(par.children, smilDir, resourceSaveDir, parsedAudios)
    }
  }
}
```

## 总结

本文介绍了本人做的 `@lingo-reader/epub-parser` 这个库，包括使用的第三方库的选型以及解析方案的设定。

**项目地址**：[https://github.com/hhk-png/lingo-reader](https://github.com/hhk-png/lingo-reader)

**网页端电子书阅读器**：[https://hhk-png.github.io/lingo-reader/#/](https://hhk-png.github.io/lingo-reader/#/)

之前写的介绍阅读器的博客：[https://mp.weixin.qq.com/s/YX5eqCDFvx1ThyKzMBd0ag](https://mp.weixin.qq.com/s/YX5eqCDFvx1ThyKzMBd0ag)

## 参考资料

1. EPUB 3.4规范：[https://www.w3.org/TR/epub-34/#abstract](https://www.w3.org/TR/epub-34/#abstract)
2. EPUB 3.3规范：[https://www.w3.org/TR/epub-33/#sec-pkg-metadata](https://www.w3.org/TR/epub-33/#sec-pkg-metadata)
3. OPF 2.0.1规范：[https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm](https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm)
4. DOMPurify：[https://github.com/cure53/DOMPurify](https://github.com/cure53/DOMPurify)
5. foliate-js：[https://github.com/johnfactotum/foliate-js](https://github.com/johnfactotum/foliate-js)
6. bing每日高清壁纸：[https://bing.ee123.net/](https://bing.ee123.net/)

