**问题**：能访问github，但是无法向github推送或拉取代码，出现如下错误信息

```
ssh: connect to host github.com port 22: Connection timed out
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.
```

**解决方案**：

向 `.ssg` 下添加或修改文件名为 `config` 的文件，内容为

```
Host github.com
 Hostname ssh.github.com
 Port 443
```

windows `.ssh` 文件夹地址为 `C:/Users/Administrator/.ssh`

linux 下为 `~/.ssh`



**参考资料**

[ssh: connect to host github.com port 22: Connection timed out](https://stackoverflow.com/questions/15589682/ssh-connect-to-host-github-com-port-22-connection-timed-out)