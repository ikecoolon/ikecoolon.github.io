# 代码分支管理

## Master（生产）
只能从其他分支合并，不能在这个分支直接修改

## Develop（开发）
主开发分支，主要用于提前测试feature分支，或帮助开发人员测试协同任务

## Feature（新功能）
Feature分支源于Master分支，主要是用来开发一个新的功能，若分支需提前测试或与其他开发人员存在协同需求，可提交至Develop分支</br>
::: warning Feature分支命名约定:
```shell script

feature/task-developer-(Date)** 

feature/                ==>   命名固定
task-developer-(Date)** ==>   自行组织
```
:::
::: details 例子
```shell script

feature/fixBug-ZhangS 
feature/newPayment-YL-2021-3-4 
feature/refactorPriceCal-SunHao-version1
```

:::

## Release（提测）
当你需要发布一个新Release的时候，我们挑选当前要发版的Feature分支创建一个Release分支，完成Release后（测试通过），我们将该Release分支合并到Master
::: warning 注意:
- 完成Release后，此次并入Release分支的Feature分支将被删除
- 若测试过程中出现bug，则直接在Release分支进行修复
:::
## Hotfix（紧急bug修复）
当我们在Master(生产)发现新的Bug时候，我们需要创建一个Hotfix, 完成Hotfix后，我们合并回Master分支，所以Hotfix的改动会进入下一个Release

## Git应用指南
### 我是开发者
**1.** 基于master分支创建新的feature任务分支并将之提交到远程服务器</br>
``` shell script
    git clone -b master git地址
    git checkout -b (feature/task)
    git push orgin (feature/task)
```
**2.** 在feature分支上进行任务开发</br>
``` shell script
    git checkout (feature/task)
    /**
    * coding 
    */
    git commit -m message
    git push orgin (feature/task)
```
**3.** feature分支任务开发完成后,若有提前测试或协同需求，可合并至develop分支</br>
``` shell script
    git checkout develop
    git merge feature/task
    git commit -m message
    git push orgin develop
```
**4.** 若测试过程中出现bug,则直接在Release分支上进行修改和提交操作</br>
``` shell script
    git clone -b release git地址

    /**
    * 修复代码bug
    */

    git commit -m message
    git push orgin release
```
### 我是维护者
**1.** 在固定时间段维护者有挑选feature合并至release，release合并至master的权限</br>
``` shell script
    git clone -b release git地址
    git merge feature
    git commit -m message
    git push orgin release
```
### 我是组长
**1.** 组长有挑选feature合并至release的权限</br>
**2.** 组长有将release合并至master的权限</br>
**3.** 一次发版完成后，将Release合并到Master</br>


---

# FAQ
## 1.若测试人员希望早于约定提测日，开始测试提前完成的部分功能，如何解决?
    答: 开发与运维协调，将jenkins对应ci任务，切换到develop分支进行部分功能的提前测试
## 2.分配任务后，是一个人一个分支（feature），还是一个任务一个分支（feature）？
    答: 1.一个任务若需要多人协作，则一个任务一个分支多人开发
        2.反之一人一个任务一个分支（feature）
## 3.个人独立开发的feature分支需要提交到远程服务器吗?
    答: 个人独立开发分支必须提交至远程服务器


