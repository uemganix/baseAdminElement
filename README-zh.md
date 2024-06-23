# Base Admin Element
> 基于 Element UI 2 的表格以及表单生成器

- 自动生成表单
- 自动生成表格查询项
- 自动生成表格字段项
- 自动生成表格操作项
- 自动触发接口查询
- 可配置自定义slot

> 示例

```js
<base-admin-element 
  :filters="[
    { label: "标题", name: "title", element: "el-input" }
  ]"
  :columns="[
    { label: "序号", type: "index" },
    { label: "内容", prop: "content", element: "el-input" },
    { label: "标题", prop: "title", element: "el-input" },
    { label: "时间", prop: "newsTime", element: "el-date-picker" }
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
![Table generated with form!](https://raw.githubusercontent.com/uemganix/baseAdminElement/main/assets/ss_zh.PNG "Table generated with form")