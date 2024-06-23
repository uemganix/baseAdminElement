# Base Admin Element

> Table and Form Generator based on Element UI 2 ([中文](/README-zh.md).)

- Automatically generate form
- Automatically generate table query items
- Automatically generate table field items
- Automatically generate table action items
- Automatically trigger interface queries
- Configurable custom slots

> Example

```js
<base-admin-element 
  :filters="[
    { label: "Title", name: "title", element: "el-input" },
    { label: "Summary", name: "summary", element: "el-input" }
  ]"
  :columns="[
    { label: "Index", type: "index" },
    { label: "Title", prop: "title", element: "el-input" },
    { label: "Summary", prop: "summary", element: "el-input" },
    { label: "Publish Date", prop: "pushlishDate", element: "el-date-picker" }
  ]"
  :requests="{
    r: {
        request: "http://47.100.114.6:8081/api/web/ch/news?tabType=all&pageNum=1&pageSize=10", resolve: (res) => ({
            list: res.data.records,
            total: res.data.total
        })
    },
    c: { request: "news" },
    u: { request: "news" },
    d: { request: "news", urlParams: ['id'] },
  }"
   />
```

> Result
![Table generated with form!](https://raw.githubusercontent.com/uemganix/baseAdminElement/main/assets/ss.PNG "Table generated with form")