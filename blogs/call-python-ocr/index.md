### 一、简介

本文来使用c++调用python实现图像的ocr。

所谓c++调用python，实际上就是在c++中把整个python当作一个第三方库引入，然后使用特定的接口来调用python的函数或者直接执行python脚本。

文章中使用的操作系统是windows10，visual stdio 2022 c++编译环境是Release x64。

### 二、具体实现

#### 1.python 部分的 ocr 代码

我们首先要保证 python 代码能够正常运行，因此要先安装 python 的第三方库。

```shell
pip install paddlepaddle-gpu paddleocr opencv-python
```

如果文件目录中有中文，比如出现用户名为中文的情况，paddleocr 就无法运行。

```python
from paddleocr import PaddleOCR
import cv2

ocr = PaddleOCR(use_angle_cls=True, lang="en")

def ocrImage():
    image = cv2.imread('./images/images.jpg')
    text = ocr.ocr(image, cls=True)[0]
    res = ""
    for t in text:
        // t[0] 中记录了识别目标在图片中的位置
        // t[1][0] 记录的是识别目标的文本
        res = res + t[1][0] + " "
    return res
```

我们先引入 paddleocr 和 opencv，然后初始化ocr，再定义一个 ocrImage 函数来实现我们 python 部分的主体逻辑。因为只是作为一个例子，所以逻辑并没有那么复杂。在 ocrImage 函数内，我们使用 opencv 将图片读入内存，然后传递给 ocr.ocr 函数，获取识别后的所有文本。接着将文本中间间隔空格拼接，之后返回，这么写主要是供 cpp 调用，便于演示。

我们本次所识别的图片是下面这张：

![images](.\images\images.jpg)

图片来源于：[https://kidsnclicks.com/wp-content/uploads/2022/05/Good-comments-for-Instagram-pictures.jpg](https://kidsnclicks.com/wp-content/uploads/2022/05/Good-comments-for-Instagram-pictures.jpg)

paddleocr 是按行识别文字的，打印每个识别结果(`t[1][0]`)的结果是：

![result](.\images\result.png)

如果所要识别的文本是英文和数字，那么推荐在初始化 PaddleOCR 的时候使用 en(英文)，这样准确率几乎可以达到100%。虽然语言选择 ch(中文)也可以识别英文和数字，但是在识别英文和数字准确率会大幅下降，会出现把 6 识别成 9 的情况，因为 6 倒过来看是9。

#### 2.在c++中引入Python.h

首先初始化一个 c++ 空项目，将调试属性改变为Release x64。接着在 visual stdio 中点击项目->项目名称+属性。点击 VC++ 目录，在包含目录中添加：

```
C:\Users\xxx\AppData\Local\Programs\Python\Python39\include
```

在库目录中添加：

```
C:\Users\xxx\AppData\Local\Programs\Python\Python39\libs
```

也就是找到 python 的安装位置，分别引入python下的 include 和 libs 文件夹。我所使用的 python 版本是 3.9。

![cpp](.\images\cpp.png)

接着点击展开链接器->输入。在附加依赖项中添加 python39.lib，如果是 debug 环境，需要添加python39_d.lib。

![cpp2](.\images\cpp2.png)

如果更改了调试属性，则需要重新引入之前没有添加的第三方库。

#### 3.c++ 中调用 python

创建一个 main.cpp 文件，写入以下代码

```c++
#include<iostream>
#include<Python.h>
#include<string>

using namespace std;

int main() {
	Py_SetPythonHome(L"C:\\Users\\xxx\\AppData\\Local\\Programs\\Python\\Python39");
	Py_Initialize();
	PyRun_SimpleString("import sys");
	PyRun_SimpleString("sys.path.append('./')");

	PyObject* pName = PyUnicode_FromString("ocr");
	PyObject* pyModule = PyImport_Import(pName);

	if (!pyModule) {
		cout << "Cannot found pyModule!" << endl;
		return 0;
	}
	PyObject* ocrFunc = PyObject_GetAttrString(pyModule, "ocrImage");
	PyObject* pyReturnValue = PyObject_CallObject(ocrFunc, NULL);
	char* res = NULL;
	PyArg_Parse(pyReturnValue, "s", &res);
	string tag(res);
	cout << tag << endl;
	
	return 0;
};
```

我们先引入了iostream、Python.h、string，使用了命名空间std。在 main 函数中，我们首先使用 Py_SetPythonHome 设置了 python 包的目录，然后使用 Py_Initialize 初始化了 python 的解释器。

接下来在 c++ 里运行了两行 python 脚本设置了 python 的工作目录，如果在上面 ocr 的 python 代码中读入图片使用的是相对地址，那么相对的就是此处设置的工作目录，即 `项目根目录/项目名称` 文件夹下。

再往后使用 PyImport_Import 引入 名称为 ocr 的 py 脚本，获取 ocr 中名为 ocrImage 的函数，使用 PyObject_CallObject 调用该函数，获取返回值，打印输出。

最终结果如下：

![final-result](.\images\final-result.png)

### 参考资料

[C++调用python文件（包含第三方库）](https://zhuanlan.zhihu.com/p/271219435)

[【C++/Python】C++调用python文件](https://developer.aliyun.com/article/1260046)

[C++调用Python Py_Initializez中断](https://blog.csdn.net/weixin_38105245/article/details/78524000)

[PaddleOCR使用指南 ](https://cloud.tencent.com/developer/article/2111669)







































