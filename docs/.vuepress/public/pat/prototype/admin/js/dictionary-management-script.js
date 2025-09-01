function initDictionaryManagement() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const formTitle = document.getElementById("form-title");
  const searchInput = document.getElementById("search-custom-key");
  const tableBody = document.getElementById("custom-key-table-body");
  const addNewKeyButton = document.getElementById("add-new-key");
  const backToListButton = document.getElementById("back-to-list");
  const keyForm = document.getElementById("key-form");
  const formCustomKey = document.getElementById("form-custom-key");
  const formCustomLabel = document.getElementById("form-custom-label");
  const formParentKey = document.getElementById("form-parent-key");
  const formCustomValue = document.getElementById("form-custom-value");
  const formRangeMin = document.getElementById("form-range-min");
  const formRangeMax = document.getElementById("form-range-max");
  const cancelFormButton = document.getElementById("cancel-form");

  // 数据存储
  let customKeys = [];
  let currentEditIndex = -1; // -1 表示新增，>=0 表示编辑

  // 初始化测试数据
  customKeys = [
    {
      id: 1,
      key: "pet",
      label: "宠物类别",
      value: "宠物类别根节点",
      parentKey: null,
      rangeMin: null,
      rangeMax: null,
    },
    {
      id: 2,
      key: "cat",
      label: "猫科",
      value: "猫科动物",
      parentKey: "pet",
      rangeMin: 65.0,
      rangeMax: 85.0,
    },
    {
      id: 3,
      key: "dog",
      label: "犬科",
      value: "犬科动物",
      parentKey: "pet",
      rangeMin: 70.0,
      rangeMax: 90.0,
    },
    {
      id: 4,
      key: "british-short",
      label: "英短",
      value: "英国短毛猫",
      parentKey: "cat",
      rangeMin: 68.0,
      rangeMax: 82.0,
    },
    {
      id: 5,
      key: "orange-cat",
      label: "橘猫",
      value: "橘猫",
      parentKey: "cat",
      rangeMin: 60.0,
      rangeMax: 80.0,
    },
    {
      id: "10",
      key: "men",
      label: "门",
      value: "门类是什么",
      parentKey: null,
      rangeMin: null,
      rangeMax: null,
    },
    {
      id: "101",
      key: "actinobacteria",
      label: "放线菌门",
      value: "放线菌门是什么什么",
      parentKey: "men",
      rangeMin: 5.0,
      rangeMax: 15.0,
    },
    {
      id: "102",
      key: "bacteroidetes",
      label: "拟杆菌门",
      value: "拟杆菌门是什么什么",
      parentKey: "men",
      rangeMin: 25.0,
      rangeMax: 45.0,
    },
    {
      id: "103",
      key:'firmicutes',
      label:'厚壁菌门',
      value:'厚壁菌均是微生态中的强力草食者',
      parentKey:'men',
      rangeMin:40.0,
      rangeMax:60.0,

    },
    {
      id: "20",
      key: "shu",
      label: "属",
      value: "属类是什么什么",
      parentKey: null,
      rangeMin: null,
      rangeMax: null,
    },
    {
      id: "201",
      key: "Peptacetobacter",
      label: "Peptacetobacter属类",
      value: "善于发酵碳水，产生短链脂肪酸(SCFA);过多时可能挤压其他保护性菌种",
      parentKey: "shu",
      rangeMin: 2.0,
      rangeMax: 8.0,
    },
    {
      id: "202",
      key: "Lachnoclostridium",
      label: "Lachnoclostridium属类",
      value: "Lachnoclostridium属类是什么什么",
      parentKey: "shu",
      rangeMin: 1.5,
      rangeMax: 6.0,
    },
    {
      id: 7,
      key: "evenness",
      label: "均匀度",
      value: "均匀度是什么什么",
      parentKey: null,
      rangeMin: 0.6,
      rangeMax: 0.9,
    },
    {
      id: 8,
      key: "richness",
      label: "丰富度",
      value: "丰富度是什么什么",
      parentKey: null,
      rangeMin: 50.0,
      rangeMax: 200.0,
    },
    {
      id: 6,
      key: "alpha-diversity",
      label: "alpha多样性",
      value: "alpha多样性是什么什么",
      parentKey: null,
      rangeMin: 3.0,
      rangeMax: 6.0,
    },
  ];

  function generateId() {
    return Math.max(...customKeys.map((k) => k.id || 0), 0) + 1;
  }

  function getIndentLevel(key) {
    let level = 0;
    let currentKey = key;
    while (currentKey.parentKey) {
      level++;
      currentKey = customKeys.find((k) => k.key === currentKey.parentKey);
      if (!currentKey) break; // 防止无限循环
    }
    return level;
  }

  function renderTable(filter = "") {
    // 过滤数据
    let filteredKeys = customKeys.filter(
      (key) =>
        key.key.toLowerCase().includes(filter.toLowerCase()) ||
        key.label.toLowerCase().includes(filter.toLowerCase()) ||
        key.value.toLowerCase().includes(filter.toLowerCase()) ||
        (key.rangeMin !== null && key.rangeMin.toString().includes(filter)) ||
        (key.rangeMax !== null && key.rangeMax.toString().includes(filter))
    );

    // 构建层级结构并排序
    function buildHierarchy(items) {
      const result = [];
      const itemMap = {};

      // 创建映射
      items.forEach((item) => {
        itemMap[item.key] = { ...item, children: [] };
      });

      // 构建层级关系
      items.forEach((item) => {
        if (item.parentKey && itemMap[item.parentKey]) {
          itemMap[item.parentKey].children.push(itemMap[item.key]);
        } else {
          result.push(itemMap[item.key]);
        }
      });

      // 递归排序并扁平化
      function flattenSorted(items, level = 0) {
        const flat = [];
        items.sort((a, b) => a.key.localeCompare(b.key));

        items.forEach((item) => {
          const { children, ...itemData } = item;
          flat.push(itemData);
          if (children.length > 0) {
            flat.push(...flattenSorted(children, level + 1));
          }
        });

        return flat;
      }

      return flattenSorted(result);
    }

    filteredKeys = buildHierarchy(filteredKeys);

    tableBody.innerHTML = "";

    if (filteredKeys.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">暂无自定义 Key</td>
                </tr>
            `;
      return;
    }

    filteredKeys.forEach((item, index) => {
      const level = getIndentLevel(item);
      const indent = "&nbsp;".repeat(level * 4);
      const parentKeyDisplay = item.parentKey || "-";

      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        ${indent}
                        ${
                          level > 0
                            ? '<i class="fas fa-level-up-alt text-gray-400 mr-2" style="transform: rotate(90deg);"></i>'
                            : ""
                        }
                        <span class="text-sm font-medium text-gray-900">${
                          item.key
                        }</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${
                      item.label
                    }</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${item.value}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-500">${parentKeyDisplay}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-500">${
                      item.rangeMin !== null && item.rangeMax !== null
                        ? `${item.rangeMin}% - ${item.rangeMax}%`
                        : "-"
                    }</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3 edit-key" data-id="${
                      item.id
                    }">
                        <i class="fas fa-edit mr-1"></i>编辑
                    </button>
                    <button class="text-green-600 hover:text-green-900 mr-3 client-edit-key" data-id="${
                      item.id
                    }">
                        <i class="fas fa-user-edit mr-1"></i>客户编辑
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-key" data-id="${
                      item.id
                    }">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });
  }

  function updateParentKeyOptions(excludeId = null) {
    formParentKey.innerHTML = '<option value="">无父级（顶级）</option>';

    customKeys.forEach((key) => {
      if (excludeId && key.id === excludeId) return; // 不能选择自己作为父级

      const option = document.createElement("option");
      option.value = key.key;
      option.textContent = `${key.label} (${key.key})`;
      formParentKey.appendChild(option);
    });
  }

  function addClientEditHints() {
    // 为编码Key字段添加提示
    const keyContainer = formCustomKey.parentElement;
    if (!keyContainer.querySelector(".client-edit-hint")) {
      const keyHint = document.createElement("p");
      keyHint.className = "client-edit-hint text-sm text-gray-500 mt-1";
      keyHint.textContent = "🔒 客户编辑模式下此字段不可修改";
      keyContainer.appendChild(keyHint);
    }

    // 为父级Key字段添加提示
    const parentContainer = formParentKey.parentElement;
    if (!parentContainer.querySelector(".client-edit-hint")) {
      const parentHint = document.createElement("p");
      parentHint.className = "client-edit-hint text-sm text-gray-500 mt-1";
      parentHint.textContent = "🔒 客户编辑模式下此字段不可修改";
      parentContainer.appendChild(parentHint);
    }
  }

  function removeClientEditHints() {
    // 移除所有客户编辑提示
    document.querySelectorAll(".client-edit-hint").forEach((hint) => {
      hint.remove();
    });
  }

  function showMainView() {
    mainView.classList.remove("hidden");
    formView.classList.add("hidden");
    renderTable();
  }

  function showFormView(isEdit = false, editId = null, isClientEdit = false) {
    mainView.classList.add("hidden");
    formView.classList.remove("hidden");

    // 重置所有字段为可编辑状态
    formCustomKey.disabled = false;
    formParentKey.disabled = false;
    formCustomKey.style.backgroundColor = "";
    formParentKey.style.backgroundColor = "";

    // 移除客户编辑提示
    removeClientEditHints();

    if (isEdit && editId) {
      const item = customKeys.find((k) => k.id === editId);
      if (item) {
        if (isClientEdit) {
          formTitle.textContent = "客户编辑自定义 Key";
          // 客户编辑模式：禁用编码key和父级key字段
          formCustomKey.disabled = true;
          formParentKey.disabled = true;
          formCustomKey.style.backgroundColor = "#f3f4f6";
          formParentKey.style.backgroundColor = "#f3f4f6";

          // 添加客户编辑模式的提示
          addClientEditHints();
        } else {
          formTitle.textContent = "编辑自定义 Key";
        }
        formCustomKey.value = item.key;
        formCustomLabel.value = item.label;
        formCustomValue.value = item.value;
        formParentKey.value = item.parentKey || "";
        formRangeMin.value = item.rangeMin || "";
        formRangeMax.value = item.rangeMax || "";
        currentEditIndex = customKeys.findIndex((k) => k.id === editId);
        updateParentKeyOptions(editId);
      }
    } else {
      formTitle.textContent = "新增自定义 Key";
      keyForm.reset();
      currentEditIndex = -1;
      updateParentKeyOptions();
    }
  }

  // 事件监听器
  addNewKeyButton.addEventListener("click", () => {
    showFormView(false);
  });

  backToListButton.addEventListener("click", showMainView);
  cancelFormButton.addEventListener("click", showMainView);

  keyForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const key = formCustomKey.value.trim();
    const label = formCustomLabel.value.trim();
    const value = formCustomValue.value.trim();
    const parentKey = formParentKey.value || null;
    const rangeMin = formRangeMin.value ? parseFloat(formRangeMin.value) : null;
    const rangeMax = formRangeMax.value ? parseFloat(formRangeMax.value) : null;

    if (!key || !label) {
      alert("编码 Key 和标签名称不能为空！");
      return;
    }

    // 验证范围值
    if (rangeMin !== null && rangeMax !== null && rangeMin > rangeMax) {
      alert("最小值不能大于最大值！");
      return;
    }

    if (rangeMin !== null && (rangeMin < 0 || rangeMin > 100)) {
      alert("最小值必须在0-100之间！");
      return;
    }

    if (rangeMax !== null && (rangeMax < 0 || rangeMax > 100)) {
      alert("最大值必须在0-100之间！");
      return;
    }

    // 检查 key 是否重复
    const existingKey = customKeys.find(
      (k) =>
        k.key === key &&
        (currentEditIndex === -1 || k.id !== customKeys[currentEditIndex].id)
    );
    if (existingKey) {
      alert("编码 Key 已存在，请使用其他名称！");
      return;
    }

    if (currentEditIndex >= 0) {
      // 编辑
      customKeys[currentEditIndex] = {
        ...customKeys[currentEditIndex],
        key,
        label,
        value,
        parentKey,
        rangeMin,
        rangeMax,
      };
    } else {
      // 新增
      customKeys.push({
        id: generateId(),
        key,
        label,
        value,
        parentKey,
        rangeMin,
        rangeMax,
      });
    }

    showMainView();
  });

  // 表格操作事件代理
  tableBody.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("edit-key") ||
      e.target.closest(".edit-key")
    ) {
      const button = e.target.classList.contains("edit-key")
        ? e.target
        : e.target.closest(".edit-key");
      const id = parseInt(button.dataset.id);
      showFormView(true, id);
    } else if (
      e.target.classList.contains("client-edit-key") ||
      e.target.closest(".client-edit-key")
    ) {
      const button = e.target.classList.contains("client-edit-key")
        ? e.target
        : e.target.closest(".client-edit-key");
      const id = parseInt(button.dataset.id);
      showFormView(true, id, true); // 第三个参数为true表示客户编辑模式
    } else if (
      e.target.classList.contains("delete-key") ||
      e.target.closest(".delete-key")
    ) {
      const button = e.target.classList.contains("delete-key")
        ? e.target
        : e.target.closest(".delete-key");
      const id = parseInt(button.dataset.id);

      // 检查是否有子项
      const hasChildren = customKeys.some(
        (k) => k.parentKey === customKeys.find((item) => item.id === id)?.key
      );

      let confirmMessage = "确定要删除这个自定义 Key 吗？";
      if (hasChildren) {
        confirmMessage += "\n注意：删除后，其子项将变为顶级项。";
      }

      if (confirm(confirmMessage)) {
        const keyToDelete = customKeys.find((k) => k.id === id);

        // 将子项的父级设为 null
        if (hasChildren && keyToDelete) {
          customKeys.forEach((k) => {
            if (k.parentKey === keyToDelete.key) {
              k.parentKey = null;
            }
          });
        }

        // 删除项目
        customKeys = customKeys.filter((k) => k.id !== id);
        renderTable();
      }
    }
  });

  searchInput.addEventListener("input", (e) => {
    renderTable(e.target.value.trim());
  });

  // 初始化
  showMainView();
}

// 如果 DOM 已加载完成，立即执行；否则等待 DOMContentLoaded 事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDictionaryManagement);
} else {
  initDictionaryManagement();
}
