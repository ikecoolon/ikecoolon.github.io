# url模式

## hash | history 区别？

>hash model

    https://www.x.com/index.html/#/home/list
 
>history mode

    https://www.x.com/index.html/home/list 

## history模式的影响

在hash模式下，前端路由修改的是#后的信息，
浏览器请求时不会带上#后面的内容，所以F5刷新没有问题。
>hash模式

    https://www.x.com/index.html/#/a
    https://www.x.com/index.html/#/a?sdd=33
    https://www.x.com/index.html/#/a/list
>服务器收到始终是
>
    https://www.x.com/index.html


在history模式下，虽然丢掉了丑陋的#，但不能F5刷新浏览器，
刷新时，如果服务器没有相应的<br>`响应或者资源`，就会出现404。<br>
>history模式

    https://www.x.com/index.html             200 ==>  https://www.x.com/index.html
    https://www.x.com/index.html/a           404
    https://www.x.com/index.html/a?sdd=33    404
    https://www.x.com/index.html/a/list      404

        
所以需要后端配合修改Nginx或别的http服务的转发规则




