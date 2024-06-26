import axios from 'axios';

const ComponentEnum = {
    SELECT: {
        NAME: 'el-select',
        OPTION: 'el-option'
    },
    DATE_PICKER: {
        NAME: 'el-date-picker'
    },
    RADIO: {
        NAME: 'el-radio-group',
        OPTION: 'el-radio'
    }
};

const request = axios.create({
    baseURL: '', // url = base url + request url
    // withCredentials: true, // send cookies when cross-domain requests
    timeout: 5000 // request timeout
});

//

var script = {
  props: {
    readonly: {
      type: Boolean,
      required: false,
      default: false,
    },
    filters: {
      type: Array,
      required: false,
    },
    buttons: {
      type: Array,
      required: false,
    },
    operators: {
      type: Array,
      required: false,
    },
    columns: {
      type: Array,
      required: true,
    },
    requests: {
      type: Object,
      required: false,
    },
    operatorWidth: {
      type: Number,
      required: false
    },
    dialogWidth: {
      type: Number,
      required: false
    }
  },
  data() {
    return {
      loading: false,
      exporting: false,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
      },
      ids: [],
      total: 0,
      list: [],
      title: "",
      open: false,
      form: {},
      startDate: "startDate",
      endDate: "endDate",
    };
  },
  computed: {
    // todo combine
    filtersSubData() {
      let mainData = [];
      this.filters.forEach(async (item) => {
        if (item.dict) {
          const { data } = await this.getDicts(item.dict);
          mainData[item.dict] = data;
        }
        if (item.request) {
          const res = await request({
            url: item.request,
            method: "get",
          });
          mainData[item.request] = res.data.records || res.data;
        }
        if (item.data) {
          mainData[item.name] = item.data;
        }
      });
      return mainData;
    },
    columnsSubData() {
      let mainData = [];
      this.columns.forEach((item) => {
        if (item.dict) {
          this.getDicts(item.dict).then((res) => {
            mainData[item.dict] = res.data;
          });
        }
        if (item.request) {
          request({
            url: item.request,
            method: "get",
          }).then(res => {
            mainData[item.request] = res.data.records || res.data;
          });
        }
        if (item.data) {
          mainData[item.prop] = item.data;
        }
      });
      return mainData;
    },
    rules() {
      const r = {};
      this.columns.map((item) => {
        let require = false;
        const { name, prop, required } = item;
        if (required !== false) require = true;
        if (["index", "selection"].indexOf(item.type) === -1) {
          r[name || prop] = [
            {
              required: require,
              message: `${item.label}不能为空`,
            },
          ];
        }
      });
      return r;
    },
  },
  created() {
    this.getList();
    const thisObj = this;
    request.interceptors.response.use(function (response) {
      if (response.data) {
        const code = response.data.code;
        if (code === 401) {
          thisObj.$emit('failed');
        }
      }
      return response;
    }, function (error) {
      return Promise.reject(error);
    });
  },
  mounted() {
    const defaults = this.filters.filter(filter => filter.default);
    defaults.forEach(item => {
      this.queryParams[item.name || item.prop] = item.default;
    });
  },
  watch: {
    $route: {
      handler(val) {
        if (val && val.query && val.query.refresh > 0) {
          this.$nextTick(() => {
            this.getList();
          });
        }
      },
      immediate: true,
    },
  },
  methods: {
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    resetQuery() {
      // this.resetForm("queryForm");
      // review this when input invalid
      (this.queryParams = {
        pageNum: 1,
        pageSize: 10,
      }),
        this.handleQuery();
    },
    onChange(item) {
      if (["daterange", "datetimerange"].includes(item.type)) {
        let [startDate, endDate] = [null, null];
        if (this.queryParams[item.type]) {
          [startDate, endDate] = this.queryParams[item.type];
        }
        const [startDateParam, endDateParam] = item.params;
        this.startDate = startDateParam || this.startDate;
        this.endDate = endDateParam || this.endDate;
        this.queryParams = { ...this.queryParams, [this.startDate]: startDate, [this.endDate]: endDate };
      }
    },
    async getList() {
      this.loading = true;
      // setTimeout(() => {
      //   this.loading = false;
      //   this.list = JsonApi.mock[this.requests.r.request].list;
      //   this.total = this.list.length * 5;
      // }, 1000);
      try {
        if (this.requests.r.params) {
          this.queryParams = Object.assign(
            {},
            this.queryParams,
            this.requests.r.params
          );
        }
        let params;
        if (this.queryParams.daterange || this.queryParams.datetimerange) {
          params = Object.assign({}, this.queryParams);
          delete params.daterange;
          delete params.datetimerange;
        }
        const { data } = await request({
          url: this.requests.r.request,
          method: this.requests.r.method || "get",
          params: params || this.queryParams,
          data: params || this.queryParams,
        });
        const { list, total } = this.requests.r.resolve(data);
        this.list = list;
        this.total = total;
      } catch (e) {
        console.table(e);
      } finally {
        this.loading = false;
      }
    },
    formatter(row, column, cellValue, index, format) {
      if (format) {
        if (typeof format === 'function') {
          return format(row)
        }
        if (format.raw) {
          if (format.raw.type === "dict") {
            const source = format.raw.source;
            const target = source.find(e => e.dictValue == cellValue);
            return target && target.dictLabel || cellValue
          }
          if (format.raw.type === "joint") {
            // todo multiple by conditions
            return [cellValue, row[format.raw.by]].join(format.raw.with || "-");
          }
          if (format.raw.type === "yesno") {
            return cellValue && cellValue > 0 ? "是" : "否";
          }
          if (format.raw.type === "status") {
            return cellValue && cellValue > 0
              ? this.requests.s.label.po || "启用"
              : this.requests.s.label.na || "禁用";
          }
          // if (format.raw.type === "anti-status") {
          //   return cellValue && cellValue > 0
          //     ? this.requests.s.label.na || "禁用"
          //     : this.requests.s.label.po || "启用";
          // }
          // if (format.raw.type === "question") {
          //   return cellValue === 1 ? "单选题" : "";
          // }
        }
      }
      return cellValue;
    },
    placeholder(item) {
      let prefix = "请输入";
      if (
        [ComponentEnum.SELECT.NAME, ComponentEnum.DATE_PICKER.NAME].indexOf(
          item.element
        ) > -1
      )
        prefix = "请选择";

      return `${prefix}${item.label}`;
    },
    routerUrl(item, column) {
      //todo optimize this code
      let url = item.url;
      if (item.param) {
        item.param.map((parm) => {
          url += "/" + column[parm];
        });
      }
      if (item.query) {
        const [ query ] = item.query;
        url += `?${query}=${column[query]}`;
      }
      return url;
    },
    subcomp(parcomp) {
      switch (parcomp) {
        case ComponentEnum.SELECT.NAME:
          return ComponentEnum.SELECT.OPTION;
        case ComponentEnum.RADIO.NAME:
          return ComponentEnum.RADIO.OPTION;
      }
    },
    handle(type, row) {
      switch (type) {
        case "d":
          this.delete(row);
          break;
        case "e":
          this.export(row);
          break;
        case "i":
          break;
        case "s":
          this.changeStatus(row);
          break;
        case "c":
          this.$nextTick(() => {
            this.title = "添加";
          });
        case "u":
          this.title = "修改";
          this.open = true;
          if (row && row.parentId == 0) row.parentId = "";
          this.reset();
          if (!row) {
            const defaults = this.columns.filter(column => column.default);
            defaults.forEach(item => {
              this.form[item.name || item.prop] = item.default;
            });
          } else {
            Object.assign(this.form, row);
          }
          break;
        default:
          // this.reset();
          this.open = true;
      }
    },
    reset() {
      this.form = this.columns.reduce((acc, column) => {
        return { ...acc, [column.prop]: null };
      }, {});
      if (this.$refs["form"] !== undefined) // fix
          this.$refs["form"].resetFields();
    },
    cancel() {
      this.open = false;
      this.reset();
    },
    delete(row) {
      this.$confirm("是否确认删除?", "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        let pathParams = '/';
        if (this.requests.d.urlParams) {
          const urlParams = this.requests.d.urlParams;
          const resolvedPath = urlParams.map(item => row[item]);
          pathParams += resolvedPath.join('/');
        }
        await request({
          url: this.requests.d.request + pathParams,
          method: this.requests.d.method || "delete",
        });
        this.getList();
        this.$message({
          type: "success",
          message: "删除成功",
        });
      });
    },
    changeStatus(row) {
      this.$confirm("是否确认操作?", "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        await request({
          url: this.requests.s.request,
          method: this.requests.s.method || "put",
          params: this.getParams(row) || {
            [this.requests.s.idKey || "id"]: row.id,
          },
        });
        this.getList();
        this.$message({
          type: "success",
          message: "修改成功",
        });
      });
    },
    export(row) {
      this.$confirm("是否确认操作?", "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        this.exporting = true;
        try {
          const { msg } = await request({
            url: this.requests.e.request,
            method: this.requests.e.method || "get",
            params: this.queryParams,
          });
          this.download(msg);
          // this.msgSuccess("导出成功");
        } finally {
          this.exporting = false;
        }
      });
    },
    submitForm: function () {
      this.$refs["form"].validate(async (valid) => {
        if (valid) {
          this.loading = true;
          let url = this.requests.c.request,
            method = "post",
            msg = "新增成功";
          if (this.form.id != undefined) {
            let pathParams = '/';
            if (this.requests.u.urlParams) {
              const urlParams = this.requests.u.urlParams;
              const resolvedPath = urlParams.map(item => this.form[item]);
              pathParams += resolvedPath.join('/');
            }
            // url = this.requests.u.request + pathParams;
            url = this.requests.u.request;
            method = this.requests.u.method || "put";
            msg = "修改成功";
          }
          try {
            await request({
              url,
              method,
              data: this.disposalObj(this.form),
            });
            {/* this.msgSuccess(msg); */ }
            this.$message({
              message: msg,
              type: 'success'
            });
            this.getList();
          } catch (e) {
            console.table(e);
          } finally {
            this.loading = false;
            this.open = false;
          }
        }
      });
    },
    selectionChange(selection) {
      const ids = selection.map((item) => {
        return item.id;
      });
      this.$emit("selections", ids);
    },
    getParams(row) {
      if (this.requests.s.params) {
        // optimize needed
        let params = {};
        for (const [key, value] of Object.entries(this.requests.s.params)) {
          if (key === "userId") {
            params[key] = row[value];
          }
          if (key === "status") {
            let status = 2;
            if (!row[value] || row[value] == 2) {
              status = 1;
            }
            params[key] = status;
          }
        }
        return params;
      }
    },
    goPath(path, row) {
      // console.log(path)
      if (row) path += `/${row.id}`;
      this.$router.push({ path });
    },
    showStatusOperator(row) {
      let visible = false;
      if (this.requests.s && this.requests.s.request) {
        visible = true;
        if (row.subStatus) {
          visible = this.requests.s.active.some((val) => val === row.subStatus);
        }
      }
      return visible;
    },
    // need to optimize
    isShow(element, row) {
      if (element.show) {
        const [key, operator, val] = element.show;
        return row[key] == val
      }
      return true
    },
    formElementShow(item) {
      if (item.show) {
        const [key, opertor, val] = item.show;
        if (Array.isArray(val)) {
          return val.includes(this.form[key])
        }
        return this.form[key] == val
      } else if (item.noedit && this.form.id != undefined) {
        return false
      } else {
        return true
      }
    },
    handleSizeChange(val) {
      this.queryParams.pageSize = val;
      this.getList();
    },
    handleCurrentChange(val) {
      this.queryParams.pageNum = val;
      this.getList();
    },
    disposalObj(obj) {
      return Object.keys(obj)
        .filter(key => obj[key] !== null && obj[key]!== undefined && key !== null && key!== undefined)
        .reduce((acc, key) => ({...acc, [key]: obj[key]}), {})
    }
  },
};

function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
        createInjectorSSR = createInjector;
        createInjector = shadowMode;
        shadowMode = false;
    }
    // Vue.extend constructor export interop.
    const options = typeof script === 'function' ? script.options : script;
    // render functions
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true;
        // functional template
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    // scopedId
    if (scopeId) {
        options._scopeId = scopeId;
    }
    let hook;
    if (moduleIdentifier) {
        // server build
        hook = function (context) {
            // 2.3 injection
            context =
                context || // cached call
                    (this.$vnode && this.$vnode.ssrContext) || // stateful
                    (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
            // 2.2 with runInNewContext: true
            if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                context = __VUE_SSR_CONTEXT__;
            }
            // inject component styles
            if (style) {
                style.call(this, createInjectorSSR(context));
            }
            // register component module identifier for async chunk inference
            if (context && context._registeredComponents) {
                context._registeredComponents.add(moduleIdentifier);
            }
        };
        // used by ssr in case component is cached and beforeCreate
        // never gets called
        options._ssrRegister = hook;
    }
    else if (style) {
        hook = shadowMode
            ? function (context) {
                style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
            }
            : function (context) {
                style.call(this, createInjector(context));
            };
    }
    if (hook) {
        if (options.functional) {
            // register for functional component in vue file
            const originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        }
        else {
            // inject component registration as beforeCreate hook
            const existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
}

/* script */
const __vue_script__ = script;

/* template */
var __vue_render__ = function () {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    { staticClass: "app-container" },
    [
      _vm.filters
        ? _c(
            "el-form",
            {
              ref: "queryForm",
              attrs: { model: _vm.queryParams, size: "mini", inline: true },
            },
            [
              _vm._l(_vm.filters, function (item, key) {
                return _c(
                  "el-form-item",
                  {
                    key: key,
                    attrs: { label: item.label, prop: item.name || item.type },
                  },
                  [
                    _c(
                      item.element,
                      {
                        tag: "component",
                        attrs: {
                          placeholder: _vm.placeholder(item),
                          type: item.type,
                          "range-separator": "至",
                          "start-placeholder": "开始日期",
                          "end-placeholder": "结束日期",
                          clearable: "",
                          filterable: "",
                          "value-format": item.format || "yyyy-MM-dd HH:mm:ss",
                          "default-time": item.time || ["00:00:00", "23:59:59"],
                        },
                        on: {
                          change: function () {
                            _vm.onChange(item);
                          },
                        },
                        model: {
                          value: _vm.queryParams[item.name || item.type],
                          callback: function ($$v) {
                            _vm.$set(
                              _vm.queryParams,
                              item.name || item.type,
                              $$v
                            );
                          },
                          expression: "queryParams[item.name || item.type]",
                        },
                      },
                      _vm._l(
                        _vm.filtersSubData[item.dict] ||
                          _vm.filtersSubData[item.request] ||
                          _vm.filtersSubData[item.name || item.type],
                        function (data, key) {
                          return _c(_vm.subcomp(item.element), {
                            key: key,
                            tag: "component",
                            attrs: {
                              label:
                                data.dictLabel ||
                                data.name ||
                                data.statusName ||
                                data,
                              value:
                                data.dictValue || data.status || data.id || key,
                            },
                          })
                        }
                      ),
                      1
                    ),
                  ],
                  1
                )
              }),
              _vm._v(" "),
              _c(
                "el-form-item",
                [
                  _c(
                    "el-button",
                    {
                      attrs: { type: "primary", icon: "el-icon-search" },
                      on: { click: _vm.handleQuery },
                    },
                    [_vm._v("搜索")]
                  ),
                  _vm._v(" "),
                  _c(
                    "el-button",
                    {
                      attrs: { icon: "el-icon-refresh" },
                      on: { click: _vm.resetQuery },
                    },
                    [_vm._v("重置")]
                  ),
                ],
                1
              ),
            ],
            2
          )
        : _vm._e(),
      _vm._v(" "),
      _c(
        "el-row",
        { staticClass: "mb8", attrs: { gutter: 10 } },
        [
          _c(
            "el-col",
            { attrs: { span: 1.5 } },
            [
              _vm.requests.c && _vm.requests.c.request
                ? _c(
                    "el-button",
                    {
                      attrs: {
                        type: "primary",
                        plain: "",
                        icon: _vm.requests.c.icon || "el-icon-plus",
                        size: "mini",
                        "v-hasPermi": _vm.requests.c.permission,
                      },
                      on: {
                        click: function ($event) {
                          _vm.requests.c.path
                            ? _vm.goPath(_vm.requests.c.path)
                            : _vm.handle("c");
                        },
                      },
                    },
                    [_vm._v(_vm._s(_vm.requests.c.title || "新增"))]
                  )
                : _vm._e(),
            ],
            1
          ),
          _vm._v(" "),
          _c(
            "el-col",
            { attrs: { span: 1.5 } },
            [
              _vm.requests.i && _vm.requests.i.request
                ? _c(
                    "el-button",
                    {
                      attrs: {
                        type: "primary",
                        plain: "",
                        icon: _vm.requests.i.icon || "el-icon-upload2",
                        size: "mini",
                        "v-hasPermi": _vm.requests.i.permission,
                      },
                      on: {
                        click: function ($event) {
                          _vm.requests.i.path
                            ? _vm.goPath(_vm.requests.i.path)
                            : _vm.handle("i");
                        },
                      },
                    },
                    [_vm._v("导入")]
                  )
                : _vm._e(),
            ],
            1
          ),
          _vm._v(" "),
          _c(
            "el-col",
            { attrs: { span: 1.5 } },
            [
              _vm.requests.e && _vm.requests.e.request
                ? _c(
                    "el-button",
                    {
                      class: {
                        "right-aligned": _vm.requests.e.align == "right",
                      },
                      attrs: {
                        type: "warning",
                        plain: "",
                        icon: _vm.requests.e.icon || "el-icon-download",
                        size: "mini",
                        loading: _vm.exporting,
                        "v-hasPermi": _vm.requests.e.permission,
                      },
                      on: {
                        click: function ($event) {
                          return _vm.handle("e")
                        },
                      },
                    },
                    [_vm._v("导出")]
                  )
                : _vm._e(),
            ],
            1
          ),
          _vm._v(" "),
          _vm._t(
            "panel",
            _vm._l(_vm.buttons, function (btn, key) {
              return _c(
                "el-col",
                { key: key, attrs: { span: 1.5 } },
                [
                  _c(
                    "el-button",
                    {
                      attrs: {
                        type: btn.type,
                        plain: btn.plain,
                        icon: btn.icon,
                        size: "mini",
                        "v-hasPermi": btn.permission,
                      },
                      on: {
                        click: function ($event) {
                          return _vm.$emit("buttonsClick", btn.name)
                        },
                      },
                    },
                    [_vm._v(_vm._s(btn.label))]
                  ),
                ],
                1
              )
            })
          ),
          _vm._v(" "),
          _c("right-toolbar", { on: { queryTable: _vm.getList } }),
        ],
        2
      ),
      _vm._v(" "),
      _c(
        "div",
        { staticClass: "list" },
        [
          _c(
            "el-table",
            {
              directives: [
                {
                  name: "loading",
                  rawName: "v-loading",
                  value: _vm.loading,
                  expression: "loading",
                },
              ],
              attrs: { data: _vm.list, border: false },
              on: { "selection-change": _vm.selectionChange },
            },
            [
              _vm._l(_vm.columns, function (column, key) {
                return [
                  column.mode != "form"
                    ? _c(
                        "el-table-column",
                        {
                          key: key,
                          attrs: {
                            "show-overflow-tooltip": true,
                            label: column.label,
                            type: column.type,
                            prop: column.prop,
                            fixed: column.fixed || false,
                            width: column.width,
                            align: "center",
                            formatter: function (row, col, cellValue, index) {
                              return _vm.formatter(
                                row,
                                col,
                                cellValue,
                                index,
                                column.render || column.format
                              )
                            },
                          },
                        },
                        _vm._l(column.children, function (item, idx) {
                          return _c("el-table-column", {
                            key: idx,
                            attrs: {
                              "show-overflow-tooltip": true,
                              label: item.label,
                              type: item.type,
                              prop: item.prop,
                              align: "center",
                              formatter: function (row, col, cellValue, index) {
                                return _vm.formatter(
                                  row,
                                  col,
                                  cellValue,
                                  index,
                                  column.render || item.format
                                )
                              },
                            },
                          })
                        }),
                        1
                      )
                    : _vm._e(),
                ]
              }),
              _vm._v(" "),
              !_vm.readonly
                ? _c("el-table-column", {
                    attrs: {
                      fixed: "right",
                      label: "操作",
                      align: "center",
                      width: _vm.operatorWidth || "auto",
                    },
                    scopedSlots: _vm._u(
                      [
                        {
                          key: "default",
                          fn: function (scope) {
                            return [
                              _vm._t(
                                "operators",
                                [
                                  _vm._l(
                                    _vm.operators,
                                    function (element, index) {
                                      return [
                                        [
                                          _vm.isShow(element, scope.row)
                                            ? _c(
                                                "el-button",
                                                {
                                                  key: index,
                                                  attrs: {
                                                    size: "mini",
                                                    type: "text",
                                                    icon: element.icon,
                                                    "v-hasPermi":
                                                      element.permission,
                                                  },
                                                  on: {
                                                    click: function ($event) {
                                                      return _vm.$emit(
                                                        "operatorsClick",
                                                        element.name,
                                                        scope.row
                                                      )
                                                    },
                                                  },
                                                },
                                                [
                                                  element.type === "router"
                                                    ? _c(
                                                        "router-link",
                                                        {
                                                          attrs: {
                                                            to: _vm.routerUrl(
                                                              element,
                                                              scope.row
                                                            ),
                                                          },
                                                        },
                                                        [
                                                          _vm._v(
                                                            "\n                    " +
                                                              _vm._s(
                                                                element.label
                                                              ) +
                                                              "\n                  "
                                                          ),
                                                        ]
                                                      )
                                                    : _vm._e(),
                                                  _vm._v(" "),
                                                  element.type === "button"
                                                    ? [
                                                        _vm._v(
                                                          "\n                    " +
                                                            _vm._s(
                                                              element.label
                                                            ) +
                                                            "\n                  "
                                                        ),
                                                      ]
                                                    : _vm._e(),
                                                ],
                                                2
                                              )
                                            : _vm._e(),
                                        ],
                                      ]
                                    }
                                  ),
                                ],
                                { row: scope.row }
                              ),
                              _vm._v(" "),
                              _vm.requests.u &&
                              _vm.requests.u.request &&
                              _vm.isShow(_vm.requests.u, scope.row)
                                ? _c(
                                    "el-button",
                                    {
                                      attrs: {
                                        size: "mini",
                                        type: "text",
                                        icon:
                                          _vm.requests.u.icon || "el-icon-edit",
                                        "v-hasPermi": _vm.requests.u.permission,
                                      },
                                      on: {
                                        click: function ($event) {
                                          _vm.requests.u.path
                                            ? _vm.goPath(
                                                _vm.requests.u.path,
                                                scope.row
                                              )
                                            : _vm.handle("u", scope.row);
                                        },
                                      },
                                    },
                                    [_vm._v("修改")]
                                  )
                                : _vm._e(),
                              _vm._v(" "),
                              _vm.showStatusOperator(scope.row)
                                ? _c(
                                    "el-button",
                                    {
                                      attrs: {
                                        size: "mini",
                                        type: "text",
                                        icon:
                                          _vm.requests.s.icon ||
                                          "el-icon-remove-outline",
                                        "v-hasPermi": _vm.requests.s.permission,
                                      },
                                      on: {
                                        click: function ($event) {
                                          return _vm.handle("s", scope.row)
                                        },
                                      },
                                    },
                                    [
                                      _vm._v(
                                        _vm._s(
                                          scope.row.status ||
                                            scope.row.shopStatus ||
                                            scope.row.tempStatus ||
                                            scope.row.usedStatus == 1 ||
                                            scope.row.isShow == 1 ||
                                            scope.row.publishStatus == 1 ||
                                            scope.row.subStatus == 1
                                            ? _vm.requests.s.label.na || "禁用"
                                            : _vm.requests.s.label.po || "启用"
                                        )
                                      ),
                                    ]
                                  )
                                : _vm._e(),
                              _vm._v(" "),
                              _vm.requests.d &&
                              _vm.requests.d.request &&
                              _vm.isShow(_vm.requests.d, scope.row)
                                ? _c(
                                    "el-button",
                                    {
                                      attrs: {
                                        size: "mini",
                                        type: "text",
                                        icon:
                                          _vm.requests.d.icon ||
                                          "el-icon-delete",
                                        "v-hasPermi": _vm.requests.d.permission,
                                      },
                                      on: {
                                        click: function ($event) {
                                          return _vm.handle("d", scope.row)
                                        },
                                      },
                                    },
                                    [_vm._v("删除")]
                                  )
                                : _vm._e(),
                            ]
                          },
                        },
                      ],
                      null,
                      true
                    ),
                  })
                : _vm._e(),
            ],
            2
          ),
          _vm._v(" "),
          _c(
            "div",
            { staticClass: "app-container" },
            [
              _c("el-pagination", {
                attrs: {
                  "hide-on-single-page": true,
                  "current-page": _vm.queryParams.pageNum,
                  "page-sizes": [10, 20, 50, 100],
                  "page-size": _vm.queryParams.pageSize,
                  layout: "total, sizes, prev, pager, next, jumper",
                  total: _vm.total,
                },
                on: {
                  "size-change": _vm.handleSizeChange,
                  "current-change": _vm.handleCurrentChange,
                },
              }),
            ],
            1
          ),
        ],
        1
      ),
      _vm._v(" "),
      !_vm.readonly
        ? _c(
            "el-dialog",
            {
              attrs: {
                title: _vm.title,
                visible: _vm.open,
                width: _vm.dialogWidth || "560px",
                "append-to-body": "",
              },
              on: {
                "update:visible": function ($event) {
                  _vm.open = $event;
                },
                close: _vm.reset,
              },
            },
            [
              _vm._t("form", [
                _c(
                  "el-form",
                  {
                    ref: "form",
                    staticStyle: { width: "80%", margin: "0 6%" },
                    attrs: {
                      model: _vm.form,
                      "label-width": "150px",
                      size: "mini",
                      rules: _vm.rules,
                    },
                  },
                  [
                    _vm._l(_vm.columns, function (item, key) {
                      return [
                        _vm.formElementShow(item) &&
                        ["index", "selection"].indexOf(item.type) === -1 &&
                        item.mode !== "table"
                          ? _c(
                              "el-form-item",
                              {
                                key: key,
                                attrs: {
                                  label: item.label,
                                  prop: item.name || item.prop,
                                },
                              },
                              [
                                _vm.formElementShow(item)
                                  ? _c(
                                      item.element,
                                      {
                                        tag: "component",
                                        staticStyle: { width: "100%" },
                                        attrs: {
                                          value: item.default,
                                          type: item.type,
                                          maxlength: item.length,
                                          "show-word-limit": item.length,
                                          placeholder: _vm.placeholder(item),
                                          "value-format":
                                            item.format ||
                                            "yyyy-MM-dd HH:mm:ss",
                                          clearable: "",
                                          filterable: "",
                                        },
                                        model: {
                                          value:
                                            _vm.form[item.name || item.prop],
                                          callback: function ($$v) {
                                            _vm.$set(
                                              _vm.form,
                                              item.name || item.prop,
                                              $$v
                                            );
                                          },
                                          expression:
                                            "form[item.name || item.prop]",
                                        },
                                      },
                                      _vm._l(
                                        _vm.columnsSubData[item.dict] ||
                                          _vm.columnsSubData[item.request] ||
                                          _vm.columnsSubData[
                                            item.name || item.prop
                                          ],
                                        function (data, key) {
                                          return _c(
                                            _vm.subcomp(item.element),
                                            {
                                              key: key,
                                              tag: "component",
                                              attrs: {
                                                label:
                                                  data.radioValue ||
                                                  data.dictLabel ||
                                                  data.name ||
                                                  data.itemName ||
                                                  data.materialType ||
                                                  data.statusName,
                                                value:
                                                  data.dictValue ||
                                                  data.status ||
                                                  data.id,
                                              },
                                            },
                                            [
                                              _vm._v(
                                                "\n                " +
                                                  _vm._s(
                                                    data.radioLabel ||
                                                      data.dictLabel ||
                                                      data.dictValue ||
                                                      data.name ||
                                                      data.itemName ||
                                                      data.materialType ||
                                                      data.statusName
                                                  ) +
                                                  "\n              "
                                              ),
                                            ]
                                          )
                                        }
                                      ),
                                      1
                                    )
                                  : _vm._e(),
                                _vm._v(" "),
                                item.description
                                  ? _c(
                                      "span",
                                      { staticClass: "el-upload__tip" },
                                      [_vm._v(_vm._s(item.description || ""))]
                                    )
                                  : _vm._e(),
                              ],
                              1
                            )
                          : _vm._e(),
                      ]
                    }),
                  ],
                  2
                ),
                _vm._v(" "),
                _c(
                  "div",
                  {
                    staticClass: "dialog-footer",
                    attrs: { slot: "footer" },
                    slot: "footer",
                  },
                  [
                    _c(
                      "el-button",
                      {
                        attrs: { type: "primary", size: "mini" },
                        on: { click: _vm.submitForm },
                      },
                      [_vm._v("确 定")]
                    ),
                    _vm._v(" "),
                    _c(
                      "el-button",
                      { attrs: { size: "mini" }, on: { click: _vm.cancel } },
                      [_vm._v("取 消")]
                    ),
                  ],
                  1
                ),
              ]),
            ],
            2
          )
        : _vm._e(),
    ],
    1
  )
};
var __vue_staticRenderFns__ = [];
__vue_render__._withStripped = true;

  /* style */
  const __vue_inject_styles__ = undefined;
  /* scoped */
  const __vue_scope_id__ = undefined;
  /* module identifier */
  const __vue_module_identifier__ = undefined;
  /* functional template */
  const __vue_is_functional_template__ = false;
  /* style inject */
  
  /* style inject SSR */
  
  /* style inject shadow dom */
  

  
  const __vue_component__ = /*#__PURE__*/normalizeComponent(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    false,
    undefined,
    undefined,
    undefined
  );

// Import vue component

// Declare install function executed by Vue.use()
function install(Vue) {
	if (install.installed) return;
	install.installed = true;
	Vue.component('BaseAdminElement', __vue_component__);
}

// Create module definition for Vue.use()
const plugin = {
	install,
};

// Auto-install when vue is found (eg. in browser via <script> tag)
let GlobalVue = null;
if (typeof window !== 'undefined') {
	GlobalVue = window.Vue;
} else if (typeof global !== 'undefined') {
	GlobalVue = global.Vue;
}
if (GlobalVue) {
	GlobalVue.use(plugin);
}

export default __vue_component__;
export { install };
