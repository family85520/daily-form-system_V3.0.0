任务执行计划


执行原则确认

项目	确认内容
重构目标	提升可维护性、改善性能
功能约束	功能不变，先完成迁移验证，再优化功能代码
技术栈	Vue 3 + TypeScript + Vite + Pinia + Element Plus
回退机制	文件系统备份 + 双轨并行（无 Git）
执行方式	任务切片，单任务输入→输出→验证
业务逻辑	继承规则、权限验证、校验提示样式等不可变更


任务总览（共 30 个任务）

text
text
阶段一：基建搭建（Task 1-7）
阶段二：通用组件（Task 8-11）
阶段三：填报页面（Task 12-17）
阶段四：历史页面（Task 18-19）
阶段五：管理页面（Task 20-26）
阶段六：统计页面（Task 27-29）
阶段七：收尾清理（Task 30）


阶段一：基建搭建

Task 1：项目初始化 + Vite 配置

项	内容
输入文件	无（从零创建）
输出文件	package.json、vite.config.ts、tsconfig.json、index.html、src/main.ts、src/App.vue
验证标准	npm run dev 启动成功，浏览器打开显示空白 Vue 页面，无报错

Task 2：TypeScript 类型定义

项	内容
输入文件	原 index.html 中的数据结构（已分析过）
输出文件	src/types/index.ts
验证标准	tsc --noEmit 无类型错误，覆盖 Template/Column/Row/Rule/Submission/EffectiveValue 等全部类型

Task 3：路由配置

项	内容
输入文件	Task 2 的类型文件
输出文件	src/router/index.ts、src/views/FillPage.vue（空壳）、src/views/HistoryPage.vue（空壳）、src/views/StatPage.vue（空壳）、src/views/AdminPage.vue（空壳）
验证标准	浏览器访问 /、/history、/stat、/admin 四个 URL 均能显示对应页面（空壳内容），/stat 和 /admin 未验证时跳转

Task 4：Pinia 状态管理 — AuthStore

项	内容
输入文件	原 index.html 中的 authToken、aOK、saveToken、clearToken、checkAuth、verifyPwd 逻辑
输出文件	src/stores/useAuthStore.ts
验证标准	Store 可在组件中使用，verify/checkAuth/clearAuth 方法接口与原逻辑一致

Task 5：Pinia 状态管理 — DataStore

项	内容
输入文件	原 index.html 中的 D 对象、ld()、svSub()、svTpl()、svMembers() 逻辑；Task 2 的类型文件
输出文件	src/stores/useDataStore.ts
验证标准	Store 可加载后端数据，tpls/members/sub 结构与原 D 对象一致，所有操作方法接口对齐

Task 6：API 层封装 + server.js 双轨并行

项	内容
输入文件	原 server.js、原 index.html 中的 API 对象
输出文件	src/api/index.ts（Axios 实例）、src/api/auth.ts、src/api/data.ts、src/api/template.ts、src/api/submission.ts、src/api/member.ts、src/api/export.ts、修改后的 server.js
验证标准	1. API 层可正常请求后端所有接口 2. server.js 支持 FRONTEND_VERSION=v1/v2 切换 3. 旧前端（v1）功能完全不受影响

Task 7：CSS 变量迁移 + 全局样式

项	内容
输入文件	原 style.css
输出文件	src/styles/variables.scss、src/styles/global.scss、src/App.vue（引入全局样式）
验证标准	CSS 变量与原文件完全一致，全局基础样式（reset、字体、滚动条）生效


阶段二：通用组件

Task 8：FormField 组件

项	内容
输入文件	Task 2 的类型、Task 7 的样式变量；原 buildInputHTML() + 6 种输入类型逻辑
输出文件	src/components/common/FormField.vue
验证标准	6 种输入类型（text/number/textarea/select/date/sequence）正确渲染，锁定字段只读，v-model 双向绑定正常

Task 9：布局组件（Header + TabBar + Layout）

项	内容
输入文件	原 index.html 的 .hdr + .tab-bar + .app 结构；Task 3 的路由
输出文件	src/components/layout/AppHeader.vue、src/components/layout/AppTabBar.vue、src/components/layout/AppLayout.vue、更新 src/App.vue
验证标准	顶部栏显示标题+日期+连接状态，底部 4 个 tab 可切换路由，布局与原系统视觉一致

Task 10：通用交互组件（Toast + ConfirmDialog + Loading）

项	内容
输入文件	原 toast()、confirmModal()、showLoading/hideLoading 逻辑
输出文件	src/components/common/ToastMessage.vue、src/components/common/ConfirmDialog.vue、src/components/common/LoadingOverlay.vue、src/composables/useToast.ts、src/composables/useDialog.ts
验证标准	Toast 自动消失、确认弹窗可回调、Loading 遮罩可显示/隐藏

Task 11：TemplateSelector 组件

项	内容
输入文件	原 renderTplSel()、toggleDD()、pickTpl() 逻辑；Task 5 的 DataStore
输出文件	src/components/template/TemplateSelector.vue
验证标准	下拉列表显示所有模板，点击选择后更新 DataStore 的 activeTemplate，与原 UI 外观一致


阶段三：填报页面

Task 12：useInheritance composable（继承逻辑）

项	内容
输入文件	原 batchGetEffectiveRows() 完整逻辑；Task 2 的类型、Task 5 的 DataStore
输出文件	src/composables/useInheritance.ts
验证标准	1. 函数签名与原逻辑对齐 2. 三轮继承逻辑（今日→历史→基础）完全一致 3. "今日已处理但全空的行不回退历史"行为保留

Task 13：useValidation composable（校验+规则引擎）

项	内容
输入文件	原 validateField()、compareValues()、evaluateCondition()、applyCopyRules()、validateAllRules()、validateAndApplyRules() 全部逻辑
输出文件	src/composables/useValidation.ts
验证标准	所有校验函数接口与原逻辑一致，规则引擎的所有 operator/action type 全覆盖

Task 14：useSequence composable（序列值计算）

项	内容
输入文件	原 getNextSeqValue() 逻辑；Task 5 的 DataStore
输出文件	src/composables/useSequence.ts
验证标准	遍历模板行+提交数据取最大值+1，逻辑与原函数一致

Task 15：填报页面主体（FillPage + FillSidebar + FillMain + RecordCard）

项	内容
输入文件	原 rFill() 逻辑；Task 8/9/11/12 的组件和 composable
输出文件	src/views/FillPage.vue、src/components/fill/FillSidebar.vue、src/components/fill/FillMain.vue、src/components/fill/RecordCard.vue、src/components/fill/RecordForm.vue
验证标准	1. 选择模板→选择用户→显示记录卡片列表 2. 卡片展开显示表单字段 3. 进度条/状态标签/继承标记正确 4. 已填/未填/总数统计正确

Task 16：填报弹窗（QuickFill + AddRow + BatchAdd）

项	内容
输入文件	原 qFill()、showAddRowDialog()、showBatchAddDialog() 逻辑；Task 8/13/14
输出文件	src/components/fill/QuickFillDialog.vue、src/components/fill/AddRowDialog.vue、src/components/fill/BatchAddDialog.vue
验证标准	1. 快速填写/新增行的校验提示用 toast（统一样式） 2. 批量新增的校验提示用模态框错误列表（统一样式） 3. 筛选字段锁定、序列字段自动生成 4. 字段规则联动生效

Task 17：填报提交 + 继承操作

项	内容
输入文件	原 submitAll()、inheritPrev()、inheritBase()、resetRowBase() 逻辑；Task 12/13
输出文件	更新 src/views/FillPage.vue（加入提交和继承逻辑）
验证标准	1. 提交校验用模态框错误列表（统一样式） 2. 继承昨日/继承基础数据功能正常 3. 提交后数据正确保存到后端 4. 提交锁（2秒防重复）生效


阶段四：历史页面

Task 18：历史页面主体

项	内容
输入文件	原 rHist() 逻辑；Task 5 的 DataStore
输出文件	src/views/HistoryPage.vue、src/components/history/HistoryOverview.vue、src/components/history/HistoryUserView.vue
验证标准	1. 未选用户→按日期聚合视图 2. 选用户→按日期列表+导出链接 3. 数据与原系统一致

Task 19：记录详情弹窗

项	内容
输入文件	原 viewRec() 逻辑
输出文件	src/components/history/RecordDetail.vue
验证标准	弹窗显示指定日期/用户的填报数据详情，与原 UI 一致


阶段五：管理页面

Task 20：管理页面认证 + 概览 tab

项	内容
输入文件	原 rAdmin() 的密码验证部分 + 概览 tab 部分；Task 4 的 AuthStore
输出文件	src/views/AdminPage.vue（含认证 gate）、src/components/admin/AdminOverview.vue
验证标准	1. 未验证→显示密码输入界面 2. 验证后→显示管理页面 3. 概览 tab 显示模板汇总和分享链接

Task 21：模板列表 + 新建模板

项	内容
输入文件	原 rAdmin() 的模板 tab 部分、createNewTpl()、delOneTpl()、exportTplJSON()
输出文件	src/components/admin/TemplateList.vue、src/components/admin/CreateTemplateDialog.vue
验证标准	模板列表显示，可新建/导出JSON/删除模板

Task 22：模板编辑器（字段管理 + 基本信息）

项	内容
输入文件	原 rTplEditor() 的字段管理部分、saveEditAll() 的字段保存部分
输出文件	src/components/template-editor/TemplateEditor.vue、src/components/template-editor/FieldList.vue、src/components/template-editor/FieldCard.vue
验证标准	1. 字段名/类型/选项/可填/必填可编辑 2. 保存后字段修改生效 3. 字段重命名级联更新数据

Task 23：模板编辑器（基础数据 + 分页）

项	内容
输入文件	原 renderBasePage()、editBaseRow()、saveBaseRow()、deleteBaseRow()、showAddBaseRowDialog()、saveNewBaseRow()
输出文件	src/components/template-editor/BaseDataTable.vue、src/components/template-editor/BaseDataDialog.vue
验证标准	基础数据分页显示（每页50行），可编辑/删除/新增基础数据行

Task 24：模板编辑器（字段规则编辑器）

项	内容
输入文件	原 addRuleDirect()、editRuleDirect()、removeRuleDirect()、cancelEditRule()、toggleRuleDisabled()、toggleAllRulesDisabled()、updateRuleValUI()、updateActionValUI()
输出文件	src/components/template-editor/RuleEditor.vue
验证标准	1. 规则列表显示（启用/禁用状态） 2. 规则编辑表单（条件+动作）完整 3. 添加/编辑/删除/启用禁用功能正常

Task 25：数据查看 + 导入

项	内容
输入文件	原 renderAdminData()、editSubmission()、deleteSubmission()、hExcel()、hJSON()、showPv()、impConfirm()
输出文件	src/components/admin/AdminDataView.vue、src/components/admin/DataEditDialog.vue、src/components/admin/AdminImport.vue、src/components/admin/ImportPreview.vue
验证标准	1. 数据查看支持筛选+编辑+删除 2. Excel/JSON 导入正常 3. 导入预览字段配置正常 4. 字段查重自动重命名

Task 26：导出 + 设置

项	内容
输入文件	原 adminExport()、svAdmin()、resetAll()、loadTplMembers()
输出文件	src/components/admin/AdminExport.vue、src/components/admin/AdminSettings.vue
验证标准	1. CSV/Excel 导出正常 2. 成员管理/修改密码/清除数据功能正常


阶段六：统计页面

Task 27：统计概览 + 填报分析

项	内容
输入文件	原 renderStatOverview()、renderStatFill()、renderStatFillDate()、renderStatFillMember()
输出文件	src/views/StatPage.vue（含验证 gate）、src/components/stat/StatOverview.vue、src/components/stat/StatFillAnalysis.vue
验证标准	1. 统计页面需密码验证 2. 概览显示统计卡片+趋势图+成员完成率 3. 填报分析按日期/按成员查看正常

Task 28：数据分析（数值统计 + 数据明细）

项	内容
输入文件	原 collectStatData()、renderStatData()、renderStatNumResult()、renderStatDetail()
输出文件	src/components/stat/StatDataAnalysis.vue、src/components/stat/NumFieldStats.vue、src/components/stat/DataDetailTable.vue
验证标准	数值字段统计（求和/平均/最大/最小）、数据明细表正确显示

Task 29：交叉分析表

项	内容
输入文件	原 doCrossStatInner()、addMetric()、addDim()、calcAgg() 等完整逻辑
输出文件	src/components/stat/CrossStatTable.vue、src/components/stat/CrossStatConfig.vue、src/components/stat/DimensionSelector.vue、src/components/stat/MetricConfig.vue
验证标准	多行维度 × 多列维度 × 多统计指标，交叉表渲染正确，合计行/小计行正确


阶段七：收尾清理

Task 30：构建配置 + 部署适配 + 清理

项	内容
输入文件	所有已完成的 Vue 文件、原 server.js、原 package.json
输出文件	更新 vite.config.ts（构建输出到 dist）、更新 server.js（静态文件指向 dist）、更新 package.json（构建脚本）、备份脚本 backup.bat、rollback.bat、rollback-db.bat、scripts/snapshot.js
验证标准	1. npm run build 构建成功 2. FRONTEND_VERSION=v2 node server.js 新前端可用 3. FRONTEND_VERSION=v1 node server.js 旧前端可用 4. 回退脚本可执行


任务依赖关系

text
text
Task 1（项目初始化）
  └── Task 2（类型定义）
       ├── Task 3（路由）
       │    └── Task 9（布局组件）
       ├── Task 4（AuthStore）
       ├── Task 5（DataStore）
       │    ├── Task 6（API层 + server.js）
       │    ├── Task 12（继承 composable）
       │    └── Task 14（序列 composable）
       ├── Task 7（CSS变量）
       │    └── Task 8（FormField）
       ├── Task 13（校验 composable）
       └── Task 10（Toast/Dialog/Loading）

Task 11（TemplateSelector） 依赖 Task 5 + Task 9
Task 15（填报页面主体）     依赖 Task 8 + 9 + 11 + 12
Task 16（填报弹窗）         依赖 Task 8 + 13 + 14
Task 17（填报提交）         依赖 Task 12 + 13
Task 18-19（历史页面）      依赖 Task 5 + 9
Task 20-26（管理页面）      依赖 Task 4 + 5 + 8 + 9 + 13
Task 27-29（统计页面）      依赖 Task 4 + 5 + 9
Task 30（收尾清理）         依赖所有任务完成


需要确认的问题

在开始执行前，请确认以下几点：


1. UI 组件库选择


选项	特点
Element Plus	最成熟，中文文档完善，表格/表单/弹窗全覆盖
Naive UI	更现代，TypeScript 原生支持，主题定制灵活
不引入组件库	保持手写，迁移工作量更大但依赖更少

2. 原系统中的 index1.html ~ index4.html 的作用


目录中有这些文件，它们是：

A. 历史版本备份？
B. index.html 的拆分部分（手动拆分方便编辑）？
C. 其他用途？

这影响是否需要在重构中保留它们。


3. 后端 src/ 目录下的 JS 文件是否需要重构


当前方案聚焦前端。后端 src/ 下有 14 个 JS 文件：

A. 暂不改动，只改 server.js 的双轨并行开关
B. 同步重构为 TypeScript

4. 任务顺序是否需要调整


当前顺序是按阶段线性推进。是否有优先想看到的页面或功能？



请确认以上问题后，我们开始执行 Task 1。

问题确认：
1. UI 组件库选择Naive UI
2.原系统中的 index1.html ~ index4.html 是用来拆分index.html主文件方便发给你阅读，在重构全面完成前保留，直到程序重构完成没问题后询问是否删除
3.后端 src/ 目录下的 JS 文件不重构，保持现状
4.任务顺序按方案执行

需求确认完毕，最终方案锁定


确认记录

项目	确认内容
UI 组件库	Naive UI
index1~4.html	保留至重构完成后再确认是否删除
后端 src/	不重构，仅修改 server.js 添加双轨并行开关
任务顺序	按 Task 1 → Task 30 线性推进
执行方式	单任务输入→输出→验证→通过后进入下一个


更新后的技术栈

层级	技术选择
框架	Vue 3（Composition API）
构建工具	Vite
语言	TypeScript
路由	Vue Router 4
状态管理	Pinia
UI 组件库	Naive UI
HTTP 请求	Axios
样式	SCSS + Naive UI 主题定制

