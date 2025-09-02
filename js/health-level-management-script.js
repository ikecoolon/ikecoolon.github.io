function initHealthLevelManagement() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const formTitle = document.getElementById("form-title");
  const searchInput = document.getElementById("search-health-level");
  const tableBody = document.getElementById("health-level-table-body");
  const addNewLevelButton = document.getElementById("add-new-level");
  const backToListButton = document.getElementById("back-to-list");
  const levelForm = document.getElementById("level-form");
  const formLevelCode = document.getElementById("form-level-code");
  const formLevelName = document.getElementById("form-level-name");
  const formLevelDescription = document.getElementById("form-level-description");
  const formScoreRange = document.getElementById("form-score-range");
  const formColorCode = document.getElementById("form-color-code");
  const formColorText = document.getElementById("form-color-text");
  const formSortOrder = document.getElementById("form-sort-order");
  const cancelFormButton = document.getElementById("cancel-form");

  // 数据存储
  let healthLevels = [];
  let currentEditIndex = -1; // -1 表示新增，>=0 表示编辑

  // 初始化测试数据
  healthLevels = [
    {
      id: 1,
      code: "A",
      name: "优秀",
      description: "身体状况极佳，各项指标均在理想范围内，免疫力强，精力充沛，建议保持当前良好的生活习惯。",
      scoreRange: "90-100",
      colorCode: "#22c55e",
      sortOrder: 1,
    },
    {
      id: 2,
      code: "B",
      name: "良好",
      description: "身体状况良好，大部分指标正常，偶有轻微波动，建议适当调整饮食和运动习惯，维持健康状态。",
      scoreRange: "75-89",
      colorCode: "#84cc16",
      sortOrder: 2,
    },
    {
      id: 3,
      code: "C",
      name: "一般",
      description: "身体状况一般，部分指标存在异常，需要关注饮食健康，增加运动量，定期检查身体状况。",
      scoreRange: "60-74",
      colorCode: "#f59e0b",
      sortOrder: 3,
    },
    {
      id: 4,
      code: "D",
      name: "较差",
      description: "身体状况不佳，多项指标异常，需要及时就医咨询，调整生活方式，必要时进行专业治疗。",
      scoreRange: "0-59",
      colorCode: "#ef4444",
      sortOrder: 4,
    },
  ];

  function generateId() {
    return Math.max(...healthLevels.map((l) => l.id || 0), 0) + 1;
  }

  function renderTable(filter = "") {
    // 过滤数据
    let filteredLevels = healthLevels.filter(
      (level) =>
        level.code.toLowerCase().includes(filter.toLowerCase()) ||
        level.name.toLowerCase().includes(filter.toLowerCase()) ||
        level.description.toLowerCase().includes(filter.toLowerCase())
    );

    // 按排序权重排序
    filteredLevels.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

    tableBody.innerHTML = "";

    if (filteredLevels.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">暂无健康分级配置</td>
                </tr>
            `;
      return;
    }

    filteredLevels.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style="background-color: ${
                          item.colorCode
                        };">
                            ${item.code}
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${
                      item.name
                    }</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 max-w-md">${
                      item.description.length > 50
                        ? item.description.substring(0, 50) + "..."
                        : item.description
                    }</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-500">${
                      item.scoreRange || "-"
                    }</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-4 h-4 rounded-full mr-2" style="background-color: ${
                          item.colorCode
                        };"></div>
                        <span class="text-sm text-gray-500">${
                          item.colorCode
                        }</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-500">${
                      item.sortOrder || "-"
                    }</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3 edit-level" data-id="${
                      item.id
                    }">
                        <i class="fas fa-edit mr-1"></i>编辑
                    </button>
                    <button class="text-green-600 hover:text-green-900 mr-3 client-edit-level" data-id="${
                      item.id
                    }">
                        <i class="fas fa-user-edit mr-1"></i>客户编辑
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-level" data-id="${
                      item.id
                    }">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
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
    formLevelCode.disabled = false;
    formLevelCode.style.backgroundColor = "";
    
    // 移除客户编辑提示
    removeClientEditHints();

    if (isEdit && editId) {
      const item = healthLevels.find((l) => l.id === editId);
      if (item) {
        if (isClientEdit) {
          formTitle.textContent = "客户编辑健康分级";
          // 客户编辑模式：禁用分级代码字段
          formLevelCode.disabled = true;
          formLevelCode.style.backgroundColor = "#f3f4f6";
          
          // 添加客户编辑模式的提示
          addClientEditHints();
        } else {
          formTitle.textContent = "编辑健康分级";
        }
        formLevelCode.value = item.code;
        formLevelName.value = item.name;
        formLevelDescription.value = item.description;
        formScoreRange.value = item.scoreRange || "";
        formColorCode.value = item.colorCode;
        formColorText.value = item.colorCode;
        formSortOrder.value = item.sortOrder || "";
        currentEditIndex = healthLevels.findIndex((l) => l.id === editId);
      }
    } else {
      formTitle.textContent = "新增健康分级";
      levelForm.reset();
      formColorCode.value = "#22c55e";
      formColorText.value = "#22c55e";
      currentEditIndex = -1;
    }
  }

  function addClientEditHints() {
    // 为分级代码字段添加提示
    const codeContainer = formLevelCode.parentElement;
    if (!codeContainer.querySelector('.client-edit-hint')) {
      const codeHint = document.createElement('p');
      codeHint.className = 'client-edit-hint text-sm text-gray-500 mt-1';
      codeHint.textContent = '🔒 客户编辑模式下此字段不可修改';
      codeContainer.appendChild(codeHint);
    }
  }

  function removeClientEditHints() {
    // 移除所有客户编辑提示
    document.querySelectorAll('.client-edit-hint').forEach(hint => {
      hint.remove();
    });
  }

  // 颜色选择器联动
  formColorCode.addEventListener("input", (e) => {
    formColorText.value = e.target.value;
  });

  formColorText.addEventListener("input", (e) => {
    const color = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      formColorCode.value = color;
    }
  });

  // 事件监听器
  addNewLevelButton.addEventListener("click", () => {
    showFormView(false);
  });

  backToListButton.addEventListener("click", showMainView);
  cancelFormButton.addEventListener("click", showMainView);

  levelForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const code = formLevelCode.value.trim().toUpperCase();
    const name = formLevelName.value.trim();
    const description = formLevelDescription.value.trim();
    const scoreRange = formScoreRange.value.trim();
    const colorCode = formColorCode.value;
    const sortOrder = parseInt(formSortOrder.value) || 999;

    if (!code || !name || !description) {
      alert("分级代码、分级名称和健康描述不能为空！");
      return;
    }

    // 检查代码是否重复
    const existingLevel = healthLevels.find(
      (l) =>
        l.code === code &&
        (currentEditIndex === -1 || l.id !== healthLevels[currentEditIndex].id)
    );
    if (existingLevel) {
      alert("分级代码已存在，请使用其他代码！");
      return;
    }

    if (currentEditIndex >= 0) {
      // 编辑
      healthLevels[currentEditIndex] = {
        ...healthLevels[currentEditIndex],
        code,
        name,
        description,
        scoreRange,
        colorCode,
        sortOrder,
      };
    } else {
      // 新增
      healthLevels.push({
        id: generateId(),
        code,
        name,
        description,
        scoreRange,
        colorCode,
        sortOrder,
      });
    }

    showMainView();
  });

  // 表格操作事件代理
  tableBody.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("edit-level") ||
      e.target.closest(".edit-level")
    ) {
      const button = e.target.classList.contains("edit-level")
        ? e.target
        : e.target.closest(".edit-level");
      const id = parseInt(button.dataset.id);
      showFormView(true, id);
    } else if (
      e.target.classList.contains("client-edit-level") ||
      e.target.closest(".client-edit-level")
    ) {
      const button = e.target.classList.contains("client-edit-level")
        ? e.target
        : e.target.closest(".client-edit-level");
      const id = parseInt(button.dataset.id);
      showFormView(true, id, true); // 第三个参数为true表示客户编辑模式
    } else if (
      e.target.classList.contains("delete-level") ||
      e.target.closest(".delete-level")
    ) {
      const button = e.target.classList.contains("delete-level")
        ? e.target
        : e.target.closest(".delete-level");
      const id = parseInt(button.dataset.id);

      const level = healthLevels.find((l) => l.id === id);
      if (
        confirm(
          `确定要删除健康分级 "${level.code} - ${level.name}" 吗？\n删除后将无法恢复。`
        )
      ) {
        healthLevels = healthLevels.filter((l) => l.id !== id);
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
  document.addEventListener("DOMContentLoaded", initHealthLevelManagement);
} else {
  initHealthLevelManagement();
}
