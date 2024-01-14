<!--
  # base component
  <author uemganix>
  > feature
    - generate table auto
    - generate forms auto
    - generate rules auto
    - generate filters auto
    - generate buttons auto
    - generate operators auto
  > pending
    - batch operation
-->
<template>
    <div class="app-container">
      <!-- search area -->
      <el-form :model="queryParams" ref="queryForm" v-if="filters" size="mini" :inline="true">
        <el-form-item v-for="(item, key) in filters" :label="item.label" :prop="item.name || item.type" :key="key">
          <component :is="item.element" v-model="queryParams[item.name || item.type]" :placeholder="placeholder(item)"
            :type="item.type" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" clearable filterable
            :value-format="item.format || 'yyyy-MM-dd HH:mm:ss'" :default-time="item.time || ['00:00:00', '23:59:59']"
            @change="() => {
              onChange(item);
            }
              ">
            <component :is="subcomp(item.element)" v-for="(data, key) in filtersSubData[item.dict] ||
              filtersSubData[item.request] ||
              filtersSubData[item.name || item.type]" :key="key"
              :label="data.dictLabel || data.name || data.statusName || data"
              :value="data.dictValue || data.status || data.id || key" />
          </component>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <!-- panel area -->
      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button type="primary" plain :icon="requests.c.icon || 'el-icon-plus'" size="mini"
            @click="requests.c.path ? goPath(requests.c.path) : handle('c')" v-if="requests.c && requests.c.request"
            :v-hasPermi="requests.c.permission">{{ requests.c.title || '新增' }}</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="primary" plain :icon="requests.i.icon || 'el-icon-upload2'" size="mini"
            @click="requests.i.path ? goPath(requests.i.path) : handle('i')" v-if="requests.i && requests.i.request"
            :v-hasPermi="requests.i.permission">导入</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="warning" plain :icon="requests.e.icon || 'el-icon-download'" size="mini"
            :class="{ 'right-aligned': requests.e.align == 'right' }" :loading="exporting" @click="handle('e')"
            v-if="requests.e && requests.e.request" :v-hasPermi="requests.e.permission">导出</el-button>
        </el-col>
        <slot name="panel">
          <el-col :span="1.5" v-for="(btn, key) in buttons" :key="key">
            <el-button :type="btn.type" :plain="btn.plain" :icon="btn.icon" size="mini" :v-hasPermi="btn.permission"
              @click="$emit('buttonsClick', btn.name)">{{ btn.label
              }}</el-button>
          </el-col>
        </slot>
        <right-toolbar @queryTable="getList"></right-toolbar>
      </el-row>
      <!-- list area -->
      <div class="list">
        <el-table v-loading="loading" :data="list" :border="false" @selection-change="selectionChange">
          <template v-for="(column, key) in columns">
            <el-table-column :show-overflow-tooltip="true" :label="column.label" :type="column.type" :prop="column.prop"
              v-if="column.mode != 'form'" :fixed="column.fixed || false" :width="column.width" align="center" :formatter="(row, col, cellValue, index) =>
                formatter(row, col, cellValue, index, column.render || column.format)
                " :key="key">
              <el-table-column v-for="(item, idx) in column.children" :key="idx" :show-overflow-tooltip="true"
                :label="item.label" :type="item.type" :prop="item.prop" align="center" :formatter="(row, col, cellValue, index) =>
                  formatter(row, col, cellValue, index, column.render || item.format)
                  " />
            </el-table-column>
          </template>
          <!-- Todo: width auto sizing -->
          <el-table-column fixed="right" label="操作" align="center" v-if="!readonly" :width="operatorWidth || 'auto'">
            <template slot-scope="scope">
              <slot name="operators" v-bind:row="scope.row">
                <template v-for="(element, index) in operators">
                  <template>
                    <el-button v-if="isShow(element, scope.row)" size="mini" type="text" :key="index" :icon="element.icon"
                      :v-hasPermi="element.permission" @click="$emit('operatorsClick', element.name, scope.row)">
                      <router-link v-if="element.type === 'router'" :to="routerUrl(element, scope.row)">
                        {{ element.label }}
                      </router-link>
                      <template v-if="element.type === 'button'">
                        {{ element.label }}
                      </template>
                    </el-button>
                  </template>
                </template>
              </slot>
              <el-button size="mini" type="text" v-if="requests.u && requests.u.request && isShow(requests.u, scope.row)"
                :icon="requests.u.icon || 'el-icon-edit'" @click="
                  requests.u.path
                    ? goPath(requests.u.path, scope.row)
                    : handle('u', scope.row)
                  " :v-hasPermi="requests.u.permission">修改</el-button>
              <!-- todo: disable status condition checking -->
              <!-- [1, 4].some(val => val === scope.row.subStatus) -->
              <el-button size="mini" type="text" v-if="showStatusOperator(scope.row)"
                :icon="requests.s.icon || 'el-icon-remove-outline'" @click="handle('s', scope.row)"
                :v-hasPermi="requests.s.permission">{{
                  scope.row.status ||
                  scope.row.shopStatus ||
                  scope.row.tempStatus ||
                  scope.row.usedStatus == 1 ||
                  scope.row.isShow == 1 ||
                  scope.row.publishStatus == 1 ||
                  scope.row.subStatus == 1
                  ? requests.s.label.na || "禁用"
                  : requests.s.label.po || "启用"
                }}</el-button>
              <el-button size="mini" type="text" v-if="requests.d && requests.d.request && isShow(requests.d, scope.row)"
                :icon="requests.d.icon || 'el-icon-delete'" @click="handle('d', scope.row)"
                :v-hasPermi="requests.d.permission">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="app-container">
          <el-pagination @size-change="handleSizeChange" :hide-on-single-page="true" @current-change="handleCurrentChange"
            :current-page="queryParams.pageNum" :page-sizes="[10, 20, 50, 100]" :page-size="queryParams.pageSize"
            layout="total, sizes, prev, pager, next, jumper" :total="total">
          </el-pagination>
        </div>
      </div>
      <!-- dialog area -->
      <el-dialog v-if="!readonly" :title="title" :visible.sync="open" :width="dialogWidth || '560px'" append-to-body @close="reset">
        <slot name="form">
          <el-form ref="form" :model="form" label-width="150px" size="mini" :rules="rules" style="width:80%;margin:0 6%">
            <template v-for="(item, key) in columns">
              <el-form-item :label="item.label" :prop="item.name || item.prop" v-if="formElementShow(item) && ['index', 'selection'].indexOf(item.type) === -1 &&
                item.mode !== 'table'
                " :key="key">
                <component :is="item.element" v-model="form[item.name || item.prop]" :value="item.default" :type="item.type"
                  v-if="formElementShow(item)" style="width: 100%" :maxlength="item.length" :show-word-limit="item.length"
                  :placeholder="placeholder(item)" :value-format="item.format || 'yyyy-MM-dd HH:mm:ss'" clearable
                  filterable>
                  <component :is="subcomp(item.element)" v-for="(data, key) in columnsSubData[item.dict] ||
                    columnsSubData[item.request] || columnsSubData[item.name || item.prop]" :key="key"
                    :label="data.radioValue || data.dictLabel || data.name || data.itemName || data.materialType || data.statusName"
                    :value="data.dictValue || data.status || data.id">
                    {{ data.radioLabel || data.dictLabel || data.dictValue || data.name || data.itemName || data.materialType || data.statusName }}
                  </component>
                </component>
                <span class="el-upload__tip" v-if="item.description">{{
                  item.description || ""
                }}</span>
              </el-form-item>
            </template>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button type="primary" size="mini" @click="submitForm">确 定</el-button>
            <el-button size="mini" @click="cancel">取 消</el-button>
          </div>
        </slot>
      </el-dialog>
    </div>
  </template>
  
  <script>
  import { ComponentEnum, request } from "./utils";
  
  export default {
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
              mainData[item.dict] = res.data
            })
          }
          if (item.request) {
            request({
              url: item.request,
              method: "get",
            }).then(res => {
              mainData[item.request] = res.data.records || res.data
            })
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
    },
    mounted() {
      const defaults = this.filters.filter(filter => filter.default)
      defaults.forEach(item => {
        this.queryParams[item.name || item.prop] = item.default
      })
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
          let [startDate, endDate] = [null, null]
          if (this.queryParams[item.type]) {
            [startDate, endDate] = this.queryParams[item.type]
          }
          const [startDateParam, endDateParam] = item.params
          this.startDate = startDateParam || this.startDate
          this.endDate = endDateParam || this.endDate
          this.queryParams = { ...this.queryParams, [this.startDate]: startDate, [this.endDate]: endDate }
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
            params = Object.assign({}, this.queryParams)
            delete params.daterange
            delete params.datetimerange
          }
          const { data } = await request({
            url: this.requests.r.request,
            method: this.requests.r.method || "get",
            params: params || this.queryParams,
            data: params || this.queryParams,
          });
          const { list, total } = this.requests.r.resolve(data)
          this.list = list
          this.total = total
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
              const source = format.raw.source
              const target = source.find(e => e.dictValue == cellValue)
              return target.dictLabel || cellValue
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
            if (format.raw.type === "anti-status") {
              return cellValue && cellValue > 0
                ? this.requests.s.label.na || "禁用"
                : this.requests.s.label.po || "启用";
            }
            if (format.raw.type === "question") {
              return cellValue === 1 ? "单选题" : "";
            }
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
          const [ query ] = item.query
          url += `?${query}=${column[query]}`
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
              const defaults = this.columns.filter(column => column.default)
              defaults.forEach(item => {
                this.form[item.name || item.prop] = item.default
              })
            } else {
              Object.assign(this.form, row);
            }
            {/* this.$emit("update", row); */}
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
        {/* this.resetForm("form"); */ }
        this.$refs["form"].resetFields();
        {/* this.$emit("reset"); */ }
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
          let pathParams = '/'
          if (this.requests.d.urlParams) {
            const urlParams = this.requests.d.urlParams
            const resolvedPath = urlParams.map(item => row[item])
            pathParams += resolvedPath.join('/')
          }
          await request({
            url: this.requests.d.request + pathParams,
            method: this.requests.d.method || "delete",
          });
          this.getList();
          this.$message({
            type: "success",
            message: "删除成功",
          })
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
          })
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
              let pathParams = '/'
              if (this.requests.u.urlParams) {
                const urlParams = this.requests.u.urlParams
                const resolvedPath = urlParams.map(item => this.form[item])
                pathParams += resolvedPath.join('/')
              }
              url = this.requests.u.request + pathParams;
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
          const [key, operator, val] = element.show
          return row[key] == val
        }
        return true
      },
      formElementShow(item) {
        if (item.show) {
          const [key, opertor, val] = item.show
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
        this.queryParams.pageSize = val
        this.getList()
      },
      handleCurrentChange(val) {
        this.queryParams.pageNum = val
        this.getList()
      },
      disposalObj(obj) {
        return Object.keys(obj)
          .filter(key => obj[key] !== null && obj[key]!== undefined && key !== null && key!== undefined)
          .reduce((acc, key) => ({...acc, [key]: obj[key]}), {})
      }
    },
  };
  </script>
  