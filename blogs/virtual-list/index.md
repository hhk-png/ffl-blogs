本篇文章是《组件是怎样写的》系列文章的第一篇，该系列文章主要说一下各组件实现的具体逻辑，组件种类取自 element-plus 和 antd 组件库。

每个组件都会有 vue 和 react 两种实现方式，可以点击 [https://hhk-png.github.io/components-show/](https://hhk-png.github.io/components-show/) 查看，项目的 github 地址为：[https://github.com/hhk-png/components-show](https://github.com/hhk-png/components-show)。

## 简介

本片文章讲解一下 **虚拟列表** 的实现，代码主要来源于[https://juejin.cn/post/7232856799170805820](https://juejin.cn/post/7232856799170805820)，然后在其基础上做了一些优化。

如果在浏览器中渲染有大量数据数据的列表，比如 100 万条，并且设置滚动，在打开这个页面的时候，浏览器所承担的渲染压力将会急速放大，浏览器将会崩溃。虚拟列表应对该种情况的处理方式是将列表渲染时的计算量从渲染进程中转换到了 js 中，从而降低浏览器的渲染压力，使这种数量的列表可以正常渲染。

在用户端，用户对序列表做的操作主要是使用鼠标的滚轮滑动列表，或者通过拖拽滚动条的方式，两者都会反映到元素的 scroll 事件上。因此，在实现虚拟列表时，主要是根据滑动距离挑选出特定的需要展示的列表项，每次滑动都执行该操作。

本文中，虚拟列表分为定高列表与不定高列表，仅考虑上下滑动的情况。在挑选需要展示的列表项时，要先获取到列表项的起始位置与结束位置，然后将这一部分的元素截取出来。列表项的数量是手动设定的，对于定高列表，由于元素高度固定，所以元素总的高度也是固定的，选择起始与结束位置时的时间复杂度和数组一样是 `O(1)`。对于不定高列表，因为元素高度不确定，所以会在内部维护一个元素高度的缓存，需要根据该缓存得到要展示元素的起始坐标，元素高度通过 `ResizeObserver` 监听元素获取。

## 固定高度的虚拟列表 React 实现

本小节讲一下 react 版本的定高虚拟列表的实现。虚拟列表和列表项的 props interface 如下：

```typescript
export interface FixedRow {
  index: number // id
  style: React.CSSProperties
}

export interface FixedSizeList {
  height: number // 虚拟列表所占用的高度
  width: number // 虚拟列表所占用的宽度
  itemSize: number // 列表项高度
  itemCount: number // 列表项数量
  children: React.ComponentType<FixedRow> // 被虚拟化的列表项
}
```

其中 `FixedSizeList` 为虚拟列表的 props interface，其中各变量的解释以注释的形式给出。`children` 为要虚拟的列表项，该值对应一个组件，其参数为 `FixedRow`。

组件的主要代码如下，省略了 `getCurrentChildren` 的内容。

```tsx
export const FixedSizeList: React.FC<FixedSizeList> = (props) => {
  const { height, width, itemCount, itemSize, children: Child } = props
  const [scrollOffset, setScrollOffset] = useState<number>(0)

  const cacheRef = useRef<Map<number, React.ReactNode>>(new Map())

  const containerStyle: CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'auto',
  }

  const contentStyle: CSSProperties = {
    height: itemSize * itemCount,
    width: '100%',
  }

  const getCurrentChildren = () => {
    /* ....省略 */
  }

  const scrollHandle = (event: React.UIEvent<HTMLDivElement>): void => {
    const { scrollTop } = event.currentTarget
    setScrollOffset(scrollTop)
  }

  return (
    <div style={containerStyle} onScroll={scrollHandle}>
      <div style={contentStyle}>{getCurrentChildren()}</div>
    </div>
  )
}
```

html 的结构主要分为三个部分，最外层的 container 用于设置虚拟列表的宽高，对应的 style 为`containerStyle`，其中的 width 和 height 是从 props 中取出，然后设置了`position: absolute` 和 `overflow:auto`，这两个属性是为了模拟滚动条，并且可以监听到 scroll 事件。第二部分是夹在中间的 content，目的是撑开外面的 container，使可以显示出滚动条。在 contentStyle 中，宽度设置为了 100%，高度为列表项的数量乘以列表项的高度。最后一部分是虚拟化的列表项，通过 getCurrentChildren 函数获得。

FixedSizeList 内部维护了一个 scrollOffset 状态，onScroll 事件绑定在了 container 元素上，用户触发滚动、触发 scroll 事件之后，会通过 setScrollOffset 重新指定 scrollOffset。状态更新后，react 会重新渲染该组件，也会重新执行 getCurrentChildren 函数，getCurrentChildren 的返回值由 scrollOffset 状态计算，所以在状态更新之后就能够看到预期的列表中的元素更新。getCurrentChildren 的实现如下：

```tsx
const getCurrentChildren = () => {
  const startIndex = Math.floor(scrollOffset / itemSize)
  const finalStartIndex = Math.max(0, startIndex - 2)
  const numVisible = Math.ceil(height / itemSize)
  const endIndex = Math.min(itemCount, startIndex + numVisible + 2)
  const items = []

  for (let i = finalStartIndex; i < endIndex; i++) {
    if (cacheRef.current.has(i)) {
      items.push(cacheRef.current.get(i))
    } else {
      const itemStyle: React.CSSProperties = {
        position: 'absolute',
        height: itemSize,
        width: '100%',
        top: itemSize * i,
      }
      const item = <Child key={i} index={i} style={itemStyle}></Child>
      cacheRef.current.set(i, item)
      items.push(item)
    }
  }
  return items
}
```

getCurrentChildren 的目的是为了获取在当前的 scrollOffset 下，后面需要展示的几个连续的列表项，在这之后的列表项与 scrollOffset 之前的不予展示。起始索引为 `Math.floor(scrollOffset / itemSize)`，中间要展示的列表项的个数为 `Math.ceil(height / itemSize)`，结束位置的索引为 `startIndex + numVisible`，在起始位置之上加上要展示的项数。此处为了方式滑动时造成的空白区域，又将截取区间向外扩展了 2。

上述代码中的 items 为要收集的列表项数组。每个列表项为一个组件，通过 `position:absolute` 的方式定位到展示区域，该子元素相对于前面讲的最外层的 container 进行定位，top 设置为 `itemSize * i` 。子元素的索引作为子元素的 id，通过 `cacheRef` 缓存。

FixedSizeList 的使用方式如下：

```tsx
const FixedRow: React.FC<FixedRow> = ({ index, style }) => {
  const backgroundColorClass = index % 2 === 0 ? 'bg-blue-100' : 'bg-white'

  return (
    <div
      className={`w-full ${backgroundColorClass} flex items-center justify-center`}
      style={{ ...style }}
    >
      Row {index}
    </div>
  )
}

// ...

;<FixedSizeList height={300} width={300} itemSize={50} itemCount={1000}>
  {FixedRow}
</FixedSizeList>
```

## 不固定高度的虚拟列表 React 实现

不定高的虚拟列表的实现逻辑与定高列表相似，但因为列表项的高度不固定，要做很多额外的处理。`DynamicSizeList` 的部分代码如下：

```tsx
interface MeasuredData {
  size: number
  offset: number
}

type MeasuredDataMap = Record<number, MeasuredData>

export interface DynamicRow {
  index: number
}

export interface DynamicSizeListProps {
  height: number
  width: number
  itemCount: number
  itemEstimatedSize?: number
  children: React.ComponentType<DynamicRow>
}

export const DynamicSizeList: React.FC<DynamicSizeListProps> = (props) => {
  const {
    height,
    width,
    itemCount,
    itemEstimatedSize = 50,
    children: Child,
  } = props
  const [scrollOffset, setScrollOffset] = useState(0)
  // 为了在接收到列表项高度发生变化时，触发组件强制更新
  const [, setState] = useState({})

  // 缓存
  const measuredDataMap = useRef<MeasuredDataMap>({})
  const lastMeasuredItemIndex = useRef<number>(-1)

  const containerStyle: CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'auto',
  }

  const contentStyle: CSSProperties = {
    height: estimateHeight(
      itemEstimatedSize,
      itemCount,
      lastMeasuredItemIndex,
      measuredDataMap
    ),
    width: '100%',
  }

  const sizeChangeHandle = (index: number, domNode: HTMLElement) => {
    /* ....省略 */
  }

  const getCurrentChildren = () => {
    /* ....省略 */
  }

  const scrollHandle = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget
    setScrollOffset(scrollTop)
  }

  return (
    <div style={containerStyle} onScroll={scrollHandle}>
      <div style={contentStyle}>{getCurrentChildren()}</div>
    </div>
  )
}
```

代码的整体结构与之前的定高列表几乎相同，在组件初始化时，组件并不知道列表项的高度，为了弥补这一缺陷，设定了一个默认的预测高度 itemEstimatedSize，在组件挂载后再将真实的列表项高度反映到缓存中。

上述代码中的 measuredDataMap 用于缓存列表项的数据，其键为列表项的索引，值为一个包含项偏移与高度的对象。lastMeasuredItemIndex 为最后一个测量到的元素的索引。这两个缓存项也可以直接放到组件外面，但如果这样做的话，如果页面上有多个 DynamicSizeList 组件实例，就会导致缓存污染。如果虚拟列表实例频繁挂载/卸载，就会导致缓存的项数只增不减，缓存也不会被释放，造成内存泄漏。因此将两者放到组件内部，并使用 useRef 包裹，这样可以确保每个实例使用的是不同的缓存，且缓存可以通过垃圾回收释放。

此处用于撑起 container 的 content 中间层的高度通过 estimateHeight 函数计算，在计算时，如果没有获取到某个元素的高度，就会使用默认高度来填补其空缺，其实现如下所示：

```tsx
const estimateHeight = (
  defaultItemSize: number = 50,
  itemCount: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
): number => {
  let measuredHeight: number = 0
  if (lastMeasuredItemIndex.current >= 0) {
    const lastMeasuredItem =
      measuredDataMap.current[lastMeasuredItemIndex.current]
    measuredHeight = lastMeasuredItem.offset + lastMeasuredItem.size
  }
  const unMeasutedItemsCount = itemCount - lastMeasuredItemIndex.current - 1
  return measuredHeight + unMeasutedItemsCount * defaultItemSize
}
```

lastMeasuredItemIndex 之前的元素的高度是已知的，截至到该元素，所有元素的累计高度为该元素的偏移 offset 加上其对应的 size。lastMeasuredItemIndex 后面的元素高度没有获得，数量为 `itemCount - lastMeasuredItemIndex.current - 1`，因此使用默认高度 defaultItemSize 计算。lastMeasuredItemIndex 的值小于 0，代表还没有初始化，因此会将所有元素的高度都看作为 defaultItemSize。此种方式计算的总高度是一个近似的大小，随着用户滑动列表，由该函数计算的总高度也会逐渐逼近真实的总高度。也因为这种处理方式，在用户拖动滚动条时，会出现鼠标与滚动条脱离的情况。

由于 lastMeasuredItemIndex 和 measuredDataMap 用 useRef 包裹，放在组件当中，所以在分离逻辑的时候要以参数的形式传递，才可以实现状态的共享。

下面介绍一下 getCurrentChildren 函数：

```tsx
const getCurrentChildren = () => {
  const [startIndex, endIndex] = getRangeToRender(
    props,
    scrollOffset,
    lastMeasuredItemIndex,
    measuredDataMap
  )
  const items: ReactNode[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    const item = getItemLayoutdata(
      props,
      i,
      lastMeasuredItemIndex,
      measuredDataMap
    )
    const itemStyle: CSSProperties = {
      position: 'absolute',
      height: item.size,
      width: '100%',
      top: item.offset,
    }
    items.push(
      <ListItem
        key={i}
        index={i}
        style={itemStyle}
        ChildComp={Child}
        onSizeChange={sizeChangeHandle}
      />
    )
  }
  return items
}
```

函数中，获取截取区间的逻辑被抽象为了 getRangeToRender 函数，并且由于获取列表项的几何属性时需要处理缓存问题，该操作也被抽象为了 getItemLayoutdata 函数，列表项 style 的处理与定高列表几乎相同。

不定高虚拟列表使用 ResizeObserver 来获取元素的真实高度，通过在要显示的列表项之外包一层 ListItem 组件来实现。ListItem 组件中，在列表项的组件挂载后，通过 sizeChangeHandle 回调来更新列表项几何属性的缓存，然后触发组件强制更新。ListItem 组件如下：

```tsx
interface ListItemProps {
  index: number
  style: React.CSSProperties
  ChildComp: React.ComponentType<{ index: number }>
  onSizeChange: (index: number, domNode: HTMLElement) => void
}

const ListItem: React.FC<ListItemProps> = React.memo(
  ({ index, style, ChildComp, onSizeChange }) => {
    const domRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (!domRef.current) return
      const domNode = domRef.current.firstChild as HTMLElement
      const resizeObserver = new ResizeObserver(() => {
        onSizeChange(index, domNode)
      })
      resizeObserver.observe(domNode)

      return () => {
        resizeObserver.unobserve(domNode)
      }
    }, [index, onSizeChange])

    return (
      <div style={style} ref={domRef}>
        <ChildComp key={index} index={index} />
      </div>
    )
  },
  (prevProps, nextProps) =>
    prevProps.index === nextProps.index &&
    prevProps.style.top === nextProps.style.top &&
    prevProps.style.height === nextProps.style.height
)

const sizeChangeHandle = (index: number, domNode: HTMLElement) => {
  const height = domNode.offsetHeight
  if (measuredDataMap.current[index]?.size !== height) {
    measuredDataMap.current[index].size = height

    let offset = measuredDataMap.current[index].offset + height
    for (let i = index + 1; i <= lastMeasuredItemIndex.current; i++) {
      const layoutData = measuredDataMap.current[i]
      layoutData.offset = offset
      offset += layoutData.size
    }
    setState({})
  }
}
```

ListItem 外面添加了一层 React.memo 缓存，设置为在 props 的 index 等属性改变后进行缓存的更新。在 ResizeObserver 检测到组件长宽发生变化后，就会调用 onSizeChange 回调更新元素高度。

在 sizeChangeHandle 函数中，在接收到更新后的元素高度后，会首先更新对应缓存中元素的高度，然后依次更新该位置之后元素的 offset，因为 index 位置元素高度的变化只会影响到该元素之后所有元素的 offset。更新完成之后通过更新之前定义的一个空状态触发组件的强制更新，即 `setState({})`。

getItemLayoutdata 函数用于获取元素的几何属性，首先通过与 lastMeasuredItemIndex 判断，查看 index 位置的元素是否已经获取到，如果是，则直接返回结果。在 index 位置的元素的几何属性没有被初始化时，则从 lastMeasuredItemIndex 开始更新这之间元素的几何属性缓存，元素的 size，也就是高度，被初始化为默认的值 itemEstimatedSize。之后将 lastMeasuredItemIndex 调整为 index，返回结果。直到元素挂载后，通过 sizeChangeHandle 才能获取到真实值，更新到视图上。

```tsx
const getItemLayoutdata = (
  props: DynamicSizeListProps,
  index: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
): MeasuredData => {
  const { itemEstimatedSize = 50 } = props
  if (index > lastMeasuredItemIndex.current) {
    let offset = 0
    if (lastMeasuredItemIndex.current >= 0) {
      const lastItem = measuredDataMap.current[lastMeasuredItemIndex.current]
      offset += lastItem.offset + lastItem.size
    }

    for (let i = lastMeasuredItemIndex.current + 1; i <= index; i++) {
      measuredDataMap.current[i] = { size: itemEstimatedSize, offset }
      offset += itemEstimatedSize
    }

    lastMeasuredItemIndex.current = index
  }
  return measuredDataMap.current[index]
}
```

获取当前 scrollOffset 下所需要展示的列表项的 getRangeToRender 函数如下所示，其中又分为 getStartIndex 和 getEndIndex，在其中如果要获取元素的 offset 和 size，都需要经过 getItemLayoutdata。

getStartIndex 是为了获取 scrollOffset 对应位置元素的索引，如果最后一个测量的元素的 offset 大于 scrollOffset，则直接启动二分查找，如果不是，则使用指数查找，该算法在后面介绍。

getEndIndex 依赖于 getStartIndex，其 startIndex 参数为 getStartIndex 的返回值，在函数中 startIndex 对应 startItem。该函数的目的是获取到 `startItemoffset + height` 位置对应的元素索引。

```tsx
const getStartIndex = (
  props: DynamicSizeListProps,
  scrollOffset: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
) => {
  if (scrollOffset === 0) {
    return 0
  }

  if (
    measuredDataMap.current[lastMeasuredItemIndex.current].offset >=
    scrollOffset
  ) {
    return binarySearch(
      props,
      0,
      lastMeasuredItemIndex.current,
      scrollOffset,
      lastMeasuredItemIndex,
      measuredDataMap
    )
  }
  return expSearch(
    props,
    Math.max(0, lastMeasuredItemIndex.current),
    scrollOffset,
    lastMeasuredItemIndex,
    measuredDataMap
  )
}

const getEndIndex = (
  props: DynamicSizeListProps,
  startIndex: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
): number => {
  const { height, itemCount } = props
  const startItem = getItemLayoutdata(
    props,
    startIndex,
    lastMeasuredItemIndex,
    measuredDataMap
  )
  const maxOffset = startItem.offset + height
  let offset = startItem.offset + startItem.size
  let endIndex = startIndex

  while (offset <= maxOffset && endIndex < itemCount - 1) {
    endIndex++
    const currentItemLayout = getItemLayoutdata(
      props,
      endIndex,
      lastMeasuredItemIndex,
      measuredDataMap
    )
    offset += currentItemLayout.size
  }

  return endIndex
}

const getRangeToRender = (
  props: DynamicSizeListProps,
  scrollOffset: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
): [number, number] => {
  const { itemCount } = props
  const startIndex = getStartIndex(
    props,
    scrollOffset,
    lastMeasuredItemIndex,
    measuredDataMap
  )
  const endIndex = getEndIndex(
    props,
    startIndex,
    lastMeasuredItemIndex,
    measuredDataMap
  )
  return [Math.max(0, startIndex - 2), Math.min(itemCount - 1, endIndex + 2)]
}
```

getStartIndex 函数中，expSearch 是二分查找的一个变体，但也只能用于有序列表。其首先指数级的扩大查找范围，然后确定了元素在某个范围之后，再在这个范围中进行二分查找。在前面的实现中，expSearch 的第二个参数 index 并不为 0，这可以理解为在进行查找之前设定了一个偏移，如果没设置就会从 0 位置开始查找，如果设置，就会从 index 位置开始查找。

```tsx
const expSearch = (
  props: DynamicSizeListProps,
  index: number,
  target: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
) => {
  const { itemCount } = props
  let exp = 1

  while (
    index < itemCount &&
    getItemLayoutdata(props, index, lastMeasuredItemIndex, measuredDataMap)
      .offset < target
  ) {
    index += exp
    exp *= 2
  }

  return binarySearch(
    props,
    Math.floor(index / 2),
    Math.min(index, itemCount - 1),
    target,
    lastMeasuredItemIndex,
    measuredDataMap
  )
}

const binarySearch = (
  props: DynamicSizeListProps,
  low: number,
  high: number,
  target: number,
  lastMeasuredItemIndex: React.RefObject<number>,
  measuredDataMap: React.RefObject<MeasuredDataMap>
) => {
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2)
    const currentOffset = getItemLayoutdata(
      props,
      mid,
      lastMeasuredItemIndex,
      measuredDataMap
    ).offset

    if (currentOffset === target) {
      return mid
    } else if (currentOffset < target) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return Math.max(low - 1)
}
```

## Vue 版本的虚拟列表实现

vue 版本的虚拟列表使用 SFC 实现，与 tsx 所不相同的是一个文件只能放置一个组件，因此需要将 tsx 中的组件拆到单个文件中。然后 vue 中嵌套组件需要通过 slot 的方式来实现。

vue 版本的具体实现逻辑与之前讲的几乎相同，因为写代码的时间距离写博客相差较远，所以基本上忘了两者的异同，可以点击[https://hhk-png.github.io/components-show/](https://hhk-png.github.io/components-show/)或者[https://github.com/hhk-png/components-show/tree/main/vue-components/src/components-show/VirtualList](https://github.com/hhk-png/components-show/tree/main/vue-components/src/components-show/VirtualList)以查看具体实现，在此不作讲述。

## 参考资料

[https://juejin.cn/post/7232856799170805820](https://juejin.cn/post/7232856799170805820)
