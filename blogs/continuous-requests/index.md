前端在发送请求之后，在等待请求返回的时候处于空闲状态，仅对这个请求来讲，不需要处理任何事情。将处理请求结果的函数放到微任务队列里面，等请求返回之后再进行处理，就可以将这段时间释放，去做其他事情。使用这种方式发送多个请求，就可以实现并发的效果。

如果一个页面内的请求数量过多，请求的规模变大，就需要建立一个管理请求的队列，统一管理请求的发送和处理。目前主流的处理方案类似下面的代码：

```typescript
function fetchQueue(urls: Promise<any>[], maxNum: number) {
  return new Promise((resolve, reject) => {
    if (urls.length === 0) {
      resolve([])
      return
    }

    const result = new Array(urls.length)
    let index = 0
    const request = async () => {
      const i = index
      const url = urls[index]
      index++
      try {
        const data = await url
        result[i] = data
      } catch (e) {
        result[i] = e
      } finally {
        if (index < urls.length) {
          request()
        } else {
          console.log(result)
          resolve(result)
        }
      }
    }

    for (let i = 0; i < Math.min(maxNum, urls.length); i++) {
      request()
    }
  })
}
```

上面的代码传入一个 Promise 数组 urls，在 request 函数中通过索引 index 取出队列里的 promise，然后自增 index，以 await 的方式等待取出的 promise 执行完成，最后在 finally 内部再次调用 request 函数，进行链式调用，不断的从队列中取出 promise，然后执行。

通过在 promise 的 finally 里面调用函数自身也可以达到这种效果，这里将其称为一个请求流程，该请求流程同步执行。fetchQueue 中通过 for 循环开启了多个这样的请求流程，可以达到并发的效果，并且控制最大请求数，避免过高的内存和性能占用。

如果队列里的请求没有得到补充，在将队列里的请求消耗完成之后，通过 for 循环开启的这些流程就会停止执行，不会再次开启。这时候可以为每一个流程分配一个状态，通过轮询这些流程的状态，在流程结束之后再次开启，这样就能应对需要发送大量连续请求的场景。伪代码如下：

```typescript
const concurrency = 6
const state = new Array(concurrency).fill(false)
const urls = []
const request = (i: number) => {
    if (urls.length > 0) {
        state[i] = true
        ...
        finally(() => {
			request(i)
        })
        ...
    } else {
        state[i] = false
    }
}

setInterval(() => {
    for (let i = 0; i < concurrency; i++) {
        if (!state[i]) {
        	request(i)
        }
    }
}, 500)
```

上面的代码使用 state 存储各流程的状态，初始为 false，表示流程没有开启。通过定时器每 500 毫秒检查一次各流程的状态，检测到流程关闭或者未开启之后尝试开启此流程，再然后通过队列里是否存在元素设置 state 的状态。

为了找到最合适的并发数，可以结合平均请求时间、每秒钟入队的请求数来计算，通过平均请求时间来计算出每秒钟可以完成请求的平均数量，将每秒入队的请求数除以每秒能完成请求的平均数量，就可以得到最合适大小的并发数。

**mlfetch** 是本人针对需要发送大量连续请求的场景开发的请求队列管理库，包括了上面介绍的所有功能点，项目还在完善阶段，欢迎在 `github` 上开个 `issue`，提出建议。

项目地址：[https://github.com/hhk-png/mlfetch](https://github.com/hhk-png/mlfetch)

npm：[https://www.npmjs.com/package/mlfetch](https://www.npmjs.com/package/mlfetch)
