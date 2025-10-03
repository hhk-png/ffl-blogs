### python中的并发和并行

在单CPU情境下，并发是在同一时间可以同时处理多个任务，但同一时间只有一个任务处于运行状态，通过调度程序来实现任务的调度，在一定的时间段内执行多个任务；并行是指在同一时间可以执行和处理多个任务，因为单个CPU在同一时间只能运行一个任务，所以并行在单个CPU的环境下不可能实现，至少要有两个CPU。

有多个CPU的情况下，并发也可以称为并行，因为此时CPU可以在同一时间运行多个并发任务。

python语言支持并发和并行，并发使用`thread`和`asyncio`，并行使用`process`。

python可以同时运行多个线程，但因为GIL的限制，cpython中只能有一个线程处于运行状态，所以实际上python是一个单进程语言，这一点和js一样，并且两者都是解释性语言。

### I/O密集型任务和CPU密集型任务

xx密集型任务指的是因为程序中存在xx的因素导致不能运行更快的任务。所以I/O密集型任务说明程序中存在大量的IO操作，使程序长时间处于等待状态，CPU闲置，导致程序运行的时间长比如读写文件、进行网络请求、读写数据库等操作。CPU密集型任务是说程序中存在大量的计算操作，CPU在程序运行期间处于忙碌状态，因为计算量太大导致程序运行的时间过长，此时提升CPU的性能可以缩短程序的运行时间。

对于IO密集型任务，使用并发机制可以缩短程序的运行时间，因为在程序等待IO完成的时候可以运行调度程序将CPU分配给其他不需要等待资源的进程。对于CPU密集型任务，使用并行机制来缩短程序的运行时间，程序的运算量可以看作是固定的，程序同时使用的CPU越多，总的运算量减少的就会越快，进而程序的运行时间就会缩短。

### thread、asyncio、process

python中使用thread和async来支持并发，因为GIL的限制，python在使用这两个功能时也还是单线程执行的，主要是通过减少总的IO等待时间来缩短程序的总运行时间。使用`thread`发起网络请求时，网络请求在GIL外发起，不受GIL的控制，使用`asyncio`时，受GIL的控制。

使用`process`来支持并行，在不同的CPU上建立起不同的运行时来实现多个进程的同时运行，每个运行时都有GIL的限制。因为要创建另一个运行时，这种方法的开销比较大，有可能会出现使用这个功能所造成的额外开销大于节省的时间，使得程序的运行时间加长。

### IO例子

#### 正常情况下发起网络请求

```python
import requests
import time


def download_site(url, session):
    with session.get(url) as response:
        print(f"Read {len(response.content)} from {url}")


def download_all_sites(sites):
    with requests.Session() as session:
        for url in sites:
            download_site(url, session)


if __name__ == "__main__":
    sites = [
        "https://www.baidu.com",
        "https://weibo.com",
    ] * 80
    start_time = time.time()
    download_all_sites(sites)
    duration = time.time() - start_time
    print(f"Downloaded {len(sites)} in {duration} seconds")
```

> Downloaded 160 in **15.134373903274536** seconds
>
> [Done] exited with code=0 in **18.308** seconds

#### 使用线程

```python
import concurrent.futures
import requests
import threading
import time


thread_local = threading.local()


def get_session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session


def download_site(url):
    session = get_session()
    with session.get(url) as response:
        print(f"Read {len(response.content)} from {url}")


def download_all_sites(sites):
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(download_site, sites)


if __name__ == "__main__":
    sites = [
        "https://www.baidu.com",
        "https://weibo.com",
    ] * 80
    start_time = time.time()
    download_all_sites(sites)
    duration = time.time() - start_time
    print(f"Downloaded {len(sites)} in {duration} seconds")
```

> Downloaded 160 in **3.289073944091797** seconds
>
> [Done] exited with code=0 in **3.7** seconds

#### asyncio

```python
import asyncio
import time
import aiohttp


async def download_site(session, url):
    async with session.get(url) as response:
        print("Read {0} from {1}".format(response.content_length, url))


async def download_all_sites(sites):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for url in sites:
            task = asyncio.ensure_future(download_site(session, url))
            tasks.append(task)
        await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    sites = [
        "https://www.baidu.com",
        "https://weibo.com",
    ] * 80
    start_time = time.time()
    asyncio.get_event_loop().run_until_complete(download_all_sites(sites))
    duration = time.time() - start_time
    print(f"Downloaded {len(sites)} sites in {duration} seconds")
```

> IP被封了，没法测
>
> 时间要少于thread，因为少了创建线程的开销

#### 使用multiprocessing

```python
import requests
import multiprocessing
import time

session = None


def set_global_session():
    global session
    if not session:
        session = requests.Session()


def download_site(url):
    with session.get(url) as response:
        name = multiprocessing.current_process().name
        print(f"{name}:Read {len(response.content)} from {url}")


def download_all_sites(sites):
    with multiprocessing.Pool(initializer=set_global_session) as pool:
        pool.map(download_site, sites)


if __name__ == "__main__":
    sites = [
        "https://www.baidu.com",
        "https://weibo.com",
    ] * 80
    start_time = time.time()
    download_all_sites(sites)
    duration = time.time() - start_time
    print(f"Downloaded {len(sites)} in {duration} seconds")
```

> IP被封

### CPU集型任务

#### 正常情况

```python
import time


def cpu_bound(number):
    return sum(i * i for i in range(number))


def find_sums(numbers):
    for number in numbers:
        cpu_bound(number)


if __name__ == "__main__":
    numbers = [5_000_000 + x for x in range(20)]

    start_time = time.time()
    find_sums(numbers)
    duration = time.time() - start_time
    print(f"Duration {duration} seconds")
```

> Duration 9.062441110610962 seconds

#### 使用multiprocessing

```python
import multiprocessing
import time


def cpu_bound(number):
    return sum(i * i for i in range(number))


def find_sums(numbers):
    with multiprocessing.Pool() as pool:
        pool.map(cpu_bound, numbers)


if __name__ == "__main__":
    numbers = [5_000_000 + x for x in range(20)]

    start_time = time.time()
    find_sums(numbers)
    duration = time.time() - start_time
    print(f"Duration {duration} seconds")
```

> Duration 3.028397560119629 seconds
>
> [Done] exited with code=0 in 3.261 seconds

#### 执行CPU密集型任务时，thread和普通情况没有区别

```python
# fib
import time
 
def print_fib(number: int) -> None:
    def fib(n: int) -> int:
        if n == 1:
            return 0
        elif n == 2:
            return 1
        else:
            return fib(n - 1) + fib(n - 2)
 
    print(f'fib({number}) is {fib(number)}')
 
 
def fibs_no_threading():
    print_fib(40)
    print_fib(41)
 
 
start = time.time()
 
fibs_no_threading()
 
end = time.time()
 
print(f'Completed in {end - start} seconds.')
```

> Completed in 64.5352897644043 seconds.
>
> [Done] exited with code=0 in 67.259 seconds

```python
# fib with thread
import threading
import time

def print_fib(number: int) -> None:
    def fib(n: int) -> int:
        if n == 1:
            return 0
        elif n == 2:
            return 1
        else:
            return fib(n - 1) + fib(n - 2)
 
    print(f'fib({number}) is {fib(number)}')
 
def fibs_with_threads():
    fortieth_thread = threading.Thread(target=print_fib, args=(40,))
    forty_first_thread = threading.Thread(target=print_fib, args=(41,))
 
    fortieth_thread.start()
    forty_first_thread.start()
 
    fortieth_thread.join()
    forty_first_thread.join()
 
 
start_threads = time.time()
 
fibs_with_threads()
 
end_threads = time.time()
 
print(f'Threads took {end_threads - start_threads} seconds.')
```

> Threads took 63.99735713005066 seconds.
>
> [Done] exited with code=0 in 66.651 seconds

### 参考资料

-  https://realpython.com/python-concurrency/ 
-  https://livebook.manning.com/book/concurrency-in-python-with-asyncio/chapter-1/v-8/12 
-  https://www.toptal.com/python/beginners-guide-to-concurrency-and-parallelism-in-python 
-  https://www.infoworld.com/article/3632284/python-concurrency-and-parallelism-explained.amp.html
-  https://www.tutorialspoint.com/concurrency_in_python/concurrency_in_python_quick_guide.htm# 
-  https://towardsdatascience.com/concurrency-and-parallelism-in-python-bbd7af8c6625 
-  https://testdriven.io/blog/python-concurrency-parallelism/ 
-  https://superfastpython.com/python-concurrency-choose-api/ 
-  https://medium.com/fintechexplained/advanced-python-concurrency-and-parallelism-82e378f26ced 
-  https://towardsdatascience.com/introduction-to-concurrency-in-python-a3ad6aa8b2d1 
-  https://stackabuse.com/concurrency-in-python/ 
-  https://www.oreilly.com/live-events/concurrency-in-python/0636920253716/0636920334804/ 
-  https://consultadd.com/technology/concurrency-and-parallelism-in-python/ 
-  https://zetcode.com/python/multiprocessing/ 
-  https://blog.devgenius.io/parallel-processing-concurrency-in-python-part-i-d98b21a39112 





























