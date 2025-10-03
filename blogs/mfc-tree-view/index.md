**Note:** 本文的代码已经 push 到 https://github.com/hhk-png/MFC-file-tree

### 简介

MFC虽然是微软十多年前就已经不维护的老东西了，但现在国内还是有一些公司或者项目组在使用。本篇文章来介绍一下如何在MFC中实现文件目录树形结构的展示。

MFC提供的树形组件 Tree Control 是一个半成品，附带文件夹展开、点击文件名等基础操作，需要做一些额外的操作才能显示文件目录结构。但好在现在的 c++ 生态有 filesystem，使得实现文件树形结构的难度不是很大。

下面来开一个 MFC 项目来实现文件目录的展示。

### 实现步骤

#### 1.控件布局及变量初始化

首先初始化一个MFC项目，清空界面，拖动 Tree Control 和 List Box 形成如下布局。

![control-layout](.\images\control-layout.png)

并分别为 Tree Control 和 List  Box 点击右键添加变量 m_tree 和 m_list。再额外添加一个 m_hRoot 变量，用来保存树形控件的根节点。xxxDlg.h 文件的改变如下：

```c++
public:
	// 树形控件
	CTreeCtrl m_tree;
	// 列表
	CListBox m_list;
	// 树型控件的根节点
	HTREEITEM m_hRoot;
```

另外，MFC 点击右键添加变量的过程实际上是在 xxxDlg.h 文件中的 class 下添加了对应的变量，树形控件对应的是 m_tree，List Box 控件对应的是 m_list。

#### 2.引入filesystem

接着在项目中引入filesystem，添加的代码如下：

```c++
#define _SILENCE_EXPERIMENTAL_FILESYSTEM_DEPRECATION_WARNING
#include<experimental/filesystem>
```

filesystem 的引入需要根据具体情况进行修改，在此不深究。

#### 3.文件目录展示

在 OnInitDialog 函数中添加如下代码，：

```c++
// 设置 Tree Control 的样式
m_tree.ModifyStyle(NULL, TVS_HASBUTTONS | TVS_HASLINES | TVS_LINESATROOT | TVS_EDITLABELS);
// 此处要进行修改
string rootPath = "C:/Users/xxx/Desktop/";
// 向 Tree Control 中添加根节点
HTREEITEM RootHandle = m_tree.InsertItem(CA2T(rootPath.c_str()));
m_hRoot = RootHandle;
DfsTree(CString(rootPath.c_str()), RootHandle);
```

上面 DfsTree 函数的代码如下，添加方法的时候要在 xxxDlg.h 中添加方法声明：

```c++
// 递归遍历各个文件夹
void CMFCFileTreeDlg::DfsTree(CString filePath, HTREEITEM handle) {
	path p = string((CStringA)filePath);
	for (auto& item : directory_iterator(p)) {
		path childPath = item.path();
		string filename = childPath.filename().string();
		HTREEITEM childHandle = m_tree.InsertItem(CA2T(filename.c_str()), handle, TVI_SORT);
		if (is_directory(childPath)) {
			DfsTree(CString(childPath.string().c_str()), childHandle);
		}
	}
}
```

首先向 m_tree 中添加所要展示文件目录的根节点，然后再递归遍历各个文件夹，每一层文件夹都有其对应的 HTREEITEM，这样就可以将该文件夹下的文件夹或文件添加到 HTREEITEM 中。每个 item 的名称都是文件夹或文件的名字，以树形结构展现，这样在点击文件名的时候可以不断向上层访问，通过字符串拼接的方式获取文件的绝对路径。

#### 4.点击文件名，获取其绝对路径

双击 Tree Control 控件，添加 OnTvnSelchangedTree1 方法。

```c++
void CMFCFileTreeDlg::OnTvnSelchangedTree1(NMHDR* pNMHDR, LRESULT* pResult)
{
	LPNMTREEVIEW pNMTreeView = reinterpret_cast<LPNMTREEVIEW>(pNMHDR);
	// TODO: 在此添加控件通知处理程序代码
	TVITEM item = pNMTreeView->itemNew;
	if (item.hItem == m_hRoot)
		return;
	CString str = GetFullPath(item.hItem);
    // 此处 str 为该 HTREEITEM 的绝对路径，我们现在将其插入到 m_list 中
	m_list.AddString(str);
	*pResult = 0;
}
```

首先获取点击的 HTREEITEM，如果是根节点，则不做任何操作。接下来调用 GetFullPath 方法获取点击的 HTREEITEM 的绝对路径，将其添加到 m_list 中。

对应的 GetFullPath 方法：

```c++
CString CMFCFileTreeDlg::GetFullPath(HTREEITEM hCurrent)
{
	CString strTemp;
	CString strReturn;
	while (hCurrent != m_hRoot)
	{
		strTemp = m_tree.GetItemText(hCurrent);    //检索列表中项目文字
		if (strTemp.Right(1) != "/")
			strTemp += "/";
		strReturn = strTemp + strReturn;
		hCurrent = m_tree.GetParentItem(hCurrent); //返回父项目句柄
	}
	strReturn = m_tree.GetItemText(hCurrent) + "/" + strReturn;
	return strReturn.Left(strReturn.GetLength() - 1);
}
```

GetFullPath 方法的参数为点击的 HTREEITEM，从传入的 HTREEITEM 开始，不断向上访问并拼接字符串，获取绝对路径。

#### 5.最终的效果如下

![final](.\images\final.png)

#### 6.进一步封装

可以将 OnInitDialog 中的代码拿出来进一步封装:

```c++
void CMFCFileTreeDlg::loadTree(string rootPath) {
    m_tree.ModifyStyle(NULL, TVS_HASBUTTONS | TVS_HASLINES | TVS_LINESATROOT | TVS_EDITLABELS);
	HTREEITEM RootHandle = m_tree.InsertItem(CA2T(rootPath.c_str()));
	m_hRoot = RootHandle;
	DfsTree(CString(rootPath.c_str()), RootHandle);
}
```

### 参考资料

[MFC 树形控件CTreeCtrl显示文件路径及文件](https://blog.csdn.net/eastmount/article/details/19120567)

[LPCTSTR乱码问题](https://blog.csdn.net/qq_37644877/article/details/118293325)