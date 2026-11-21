// ==========================================
// PvP ARMORY - 装備データ
// ==========================================

const STORAGE_KEY = "pvp_armory_equipment";

const defaultEquipmentData = [
  {
    name: "試作ギア A",
    id: "example:gear_a",
    type: "GEAR",
    performance: "移動速度上昇 II\n耐性 I",
    description: "サンプル用のギアです。",
    image: "images/gear_a.png"
  },
  {
    name: "試作メイン B",
    id: "example:main_b",
    type: "MAIN",
    performance: "攻撃力：10\n射程：5ブロック",
    description: "サンプル用のメイン武器です。",
    image: ""
  },
  {
    name: "試作サブ C",
    id: "example:sub_c",
    type: "SUB",
    performance: "使用回数：1回\n効果時間：10秒",
    description: "サンプル用のサブ装備です。",
    image: ""
  }
];

// ==========================================
// 保存データ読み込み
// ==========================================

function loadEquipmentData() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData === null) {
      return [...defaultEquipmentData];
    }

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      throw new Error("保存データの形式が不正です");
    }

    return parsedData;
  } catch (error) {
    console.error("装備データの読み込みに失敗:", error);

    alert("保存データを読み込めませんでした。");

    return [...defaultEquipmentData];
  }
}

// ==========================================
// 保存処理
// ==========================================

function saveEquipmentData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(equipmentData)
    );

    return true;
  } catch (error) {
    console.error("装備データの保存に失敗:", error);

    alert("保存に失敗しました。ブラウザの保存容量などを確認してください。");

    return false;
  }
}

let equipmentData = loadEquipmentData();

// ==========================================
// DOM取得
// ==========================================

const equipmentList = document.getElementById("equipmentList");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter");

const modal = document.getElementById("equipmentModal");
const modalCategory = document.getElementById("modalCategory");
const modalName = document.getElementById("modalName");
const modalId = document.getElementById("modalId");
const modalPerformance = document.getElementById("modalPerformance");
const modalDescription = document.getElementById("modalDescription");

const modalImage = document.getElementById("modalImage");
const modalImagePlaceholder = document.getElementById("modalImagePlaceholder");

const adminPanel = document.getElementById("adminPanel");
const equipmentForm = document.getElementById("equipmentForm");

const adminEquipmentActions = document.getElementById("adminEquipmentActions");
const equipmentImageInput = document.getElementById("equipmentImage");
const equipmentImagePreview = document.getElementById("equipmentImagePreview");
const equipmentImagePlaceholder = document.getElementById("equipmentImagePlaceholder");

// 選択した画像と、編集中の元画像
let selectedImageData = null;
let currentEditingImage = "";
const editEquipmentButton = document.getElementById("editEquipmentButton");
const deleteEquipmentButton = document.getElementById("deleteEquipmentButton");

let currentFilter = "ALL";
let editingEquipmentId = null;
// ==========================================
// ビルド投稿データ
// ==========================================

const BUILD_STORAGE_KEY = "pvp_armory_builds";

const buildForm = document.getElementById("buildForm");
const buildList = document.getElementById("buildList");
const buildSearchInput = document.getElementById("buildSearchInput");
const buildSearchClear = document.getElementById("buildSearchClear");
const buildGear = document.getElementById("buildGear");
const buildMain = document.getElementById("buildMain");
const buildSub = document.getElementById("buildSub");

function loadBuildData() {
  try {
    const savedData = localStorage.getItem(BUILD_STORAGE_KEY);

    if (savedData === null) {
      return [];
    }

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      throw new Error("ビルドデータの形式が不正です");
    }

    return parsedData;
  } catch (error) {
    console.error("ビルドデータの読み込みに失敗:", error);
    alert("ビルドデータを読み込めませんでした。");
    return [];
  }
}

function saveBuildData() {
  try {
    localStorage.setItem(
      BUILD_STORAGE_KEY,
      JSON.stringify(buildData)
    );

    return true;
  } catch (error) {
    console.error("ビルドデータの保存に失敗:", error);
    alert("ビルドの保存に失敗しました。");
    return false;
  }
}

let buildData = loadBuildData();
// ==========================================
// ビルド投稿用・装備選択肢の更新
// ==========================================

function updateBuildEquipmentOptions() {

  const categories = [
    {
      select: buildGear,
      type: "GEAR",
      label: "GEARを選択"
    },
    {
      select: buildMain,
      type: "MAIN",
      label: "MAINを選択"
    },
    {
      select: buildSub,
      type: "SUB",
      label: "SUBを選択"
    }
  ];

  categories.forEach(category => {

    const select = category.select;

    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = category.label;

    select.appendChild(defaultOption);

    const items = equipmentData.filter(
      item => item.type === category.type
    );

    items.forEach(item => {

      const option = document.createElement("option");

      option.value = item.id;
      option.textContent = `${item.name} (${item.id})`;

      select.appendChild(option);

    });

    if (items.some(item => item.id === previousValue)) {
      select.value = previousValue;
    }

  });

}

// ==========================================
// HTMLエスケープ
// ==========================================

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return map[char];
  });
}

// ==========================================
// 装備一覧描画
// ==========================================

function renderEquipment() {
  updateBuildEquipmentOptions();

  const keyword = searchInput.value.toLowerCase();

  const filtered = equipmentData.filter(item => {
    const matchesFilter =
      currentFilter === "ALL" || item.type === currentFilter;

    const matchesSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.id.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword) ||
      item.performance.toLowerCase().includes(keyword);

    return matchesFilter && matchesSearch;
  });

  equipmentList.innerHTML = "";

  if (filtered.length === 0) {
    equipmentList.innerHTML = `
      <div class="empty-message">
        <p>該当する装備がありません。</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");

    card.className = "equipment-card";
    card.dataset.equipmentId = item.id;

    const imageHTML = item.image
      ? `<img src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.name)}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="image-placeholder" style="display:none;">⚔</div>`
      : `<div class="image-placeholder">⚔</div>`;

    card.innerHTML = `
      <div class="equipment-image">
        ${imageHTML}
      </div>

      <div class="equipment-info">
        <span class="category category-${item.type}">
          ${escapeHTML(item.type)}
        </span>

        <h3>${escapeHTML(item.name)}</h3>

        <p>${escapeHTML(item.description)}</p>

        <div class="equipment-id">
          ${escapeHTML(item.id)}
        </div>

        <p class="card-detail-hint">
          詳細を見る →
        </p>
      </div>
    `;

    equipmentList.appendChild(card);
  });
}

// ==========================================
// 装備詳細表示
// ==========================================

function openEquipmentDetail(item) {
  modalCategory.textContent = item.type;
  modalCategory.className = `category category-${item.type}`;

  modalName.textContent = item.name;
  modalId.textContent = item.id;
  modalPerformance.textContent = item.performance;
  modalDescription.textContent = item.description;

  if (item.image) {
    modalImage.src = item.image;
    modalImage.alt = item.name;

    modalImage.classList.add("visible");
    modalImagePlaceholder.classList.add("hidden");

    modalImage.onerror = () => {
      modalImage.classList.remove("visible");
      modalImagePlaceholder.classList.remove("hidden");
    };
  } else {
    modalImage.removeAttribute("src");
    modalImage.classList.remove("visible");
    modalImagePlaceholder.classList.remove("hidden");
  }

  modal.classList.add("open");
  adminEquipmentActions.hidden = adminPanel.hidden;
}

equipmentList.addEventListener("click", event => {
  const card = event.target.closest(".equipment-card");

  if (!card) return;

  const item = equipmentData.find(
    equipment => equipment.id === card.dataset.equipmentId
  );

  if (item) {
    openEquipmentDetail(item);
  }
});

// ==========================================
// モーダル閉じる処理
// ==========================================

function closeEquipmentDetail() {
  modal.classList.remove("open");
}

document.getElementById("closeModal").addEventListener("click", closeEquipmentDetail);

modal.addEventListener("click", event => {
  if (event.target === modal) {
    closeEquipmentDetail();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeEquipmentDetail();
  }
});

// ==========================================
// Structure IDコピー
// ==========================================

document.getElementById("copyIdButton").addEventListener("click", async () => {
  const id = modalId.textContent;
  const button = document.getElementById("copyIdButton");

  try {
    await navigator.clipboard.writeText(id);
    button.textContent = "コピーしました！";
  } catch (error) {
    const textarea = document.createElement("textarea");

    textarea.value = id;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");

    textarea.remove();

    button.textContent = copied
      ? "コピーしました！"
      : "コピーできませんでした";
  }

  setTimeout(() => {
    button.textContent = "IDをコピー";
  }, 1500);
});

// ==========================================
// 検索機能
// ==========================================

searchInput.addEventListener("input", renderEquipment);

// ==========================================
// カテゴリ絞り込み
// ==========================================

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    currentFilter = button.dataset.filter;

    renderEquipment();
  });
});

// ==========================================
// 仮管理画面表示
// ==========================================

document.getElementById("loginButton").addEventListener("click", () => {

  const isHidden = adminPanel.hidden;

  adminPanel.hidden = !isHidden;

  // 管理画面の状態に合わせて削除ボタンを更新
  renderBuilds();

  if (!adminPanel.hidden) {
    adminPanel.scrollIntoView({
      behavior: "smooth"
    });
  }

});
// ==========================================
// 画像プレビュー
// ==========================================

function showImagePreview(imageData) {
  if (imageData) {
    equipmentImagePreview.src = imageData;
    equipmentImagePreview.hidden = false;
    equipmentImagePlaceholder.hidden = true;
  } else {
    equipmentImagePreview.removeAttribute("src");
    equipmentImagePreview.hidden = true;
    equipmentImagePlaceholder.hidden = false;
  }
}

// 画像ファイル選択
equipmentImageInput.addEventListener("change", () => {
  const file = equipmentImageInput.files[0];

  if (!file) {
    return;
  }

  // 画像形式チェック
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    alert("PNG・JPEG・WebP形式の画像を選択してください。");
    equipmentImageInput.value = "";
    return;
  }

  // ファイルサイズチェック（500KBまで）
  if (file.size > 500 * 1024) {
    alert("画像サイズは500KB以下にしてください。");
    equipmentImageInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedImageData = reader.result;
    showImagePreview(selectedImageData);
  };

  reader.onerror = () => {
    alert("画像の読み込みに失敗しました。");
    equipmentImageInput.value = "";
  };

  reader.readAsDataURL(file);
});
// ==========================================
// 装備登録・編集
// ==========================================

equipmentForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("equipmentName").value.trim();
  const id = document.getElementById("equipmentId").value.trim();
  const type = document.getElementById("equipmentType").value;
  const performance = document.getElementById("equipmentPerformance").value.trim();
  const description = document.getElementById("equipmentDescription").value.trim();
  const image = selectedImageData || currentEditingImage || "";

  if (!name || !id || !performance) {
    alert("必須項目を入力してください。");
    return;
  }

  // ID重複チェック
  const duplicate = equipmentData.some(item => {
    return item.id === id && item.id !== editingEquipmentId;
  });

  if (duplicate) {
    alert("同じIDの装備がすでに登録されています。");
    return;
  }

  const newEquipment = {
    name,
    id,
    type,
    performance,
    description,
    image
  };

  // ==========================================
  // 編集モード
  // ==========================================

  if (editingEquipmentId !== null) {
    const index = equipmentData.findIndex(
      item => item.id === editingEquipmentId
    );

    if (index === -1) {
      alert("編集対象が見つかりません。");
      return;
    }

    const oldEquipment = equipmentData[index];

    equipmentData[index] = newEquipment;

    if (!saveEquipmentData()) {
      equipmentData[index] = oldEquipment;
      renderEquipment();
      return;
    }

    editingEquipmentId = null;

    alert("装備を変更・保存しました！");
  }

  // ==========================================
  // 新規登録モード
  // ==========================================

  else {
    equipmentData.push(newEquipment);

    if (!saveEquipmentData()) {
      equipmentData.pop();
      return;
    }

    alert("装備を登録・保存しました！");
  }

  renderEquipment();

  equipmentForm.reset();

  const submitButton = equipmentForm.querySelector('button[type="submit"]');

  submitButton.textContent = "装備を登録";
selectedImageData = null;
currentEditingImage = "";

equipmentImageInput.value = "";

showImagePreview("");

  document.getElementById("equipment").scrollIntoView({
    behavior: "smooth"
  });
});
// ==========================================
// 装備編集
// ==========================================

editEquipmentButton.addEventListener("click", () => {
  const oldId = modalId.textContent;

  const item = equipmentData.find(
    equipment => equipment.id === oldId
  );

  if (!item) {
    alert("編集する装備が見つかりません。");
    return;
  }

  editingEquipmentId = item.id;

  document.getElementById("equipmentName").value = item.name;
  document.getElementById("equipmentId").value = item.id;
  document.getElementById("equipmentType").value = item.type;
  document.getElementById("equipmentPerformance").value = item.performance;
  document.getElementById("equipmentDescription").value = item.description;
  currentEditingImage = item.image || "";
selectedImageData = null;

equipmentImageInput.value = "";

showImagePreview(currentEditingImage);
  closeEquipmentDetail();

  adminPanel.hidden = false;

  adminPanel.scrollIntoView({
    behavior: "smooth"
  });

  const submitButton = equipmentForm.querySelector('button[type="submit"]');

  submitButton.textContent = "変更を保存";
});

// ==========================================
// 装備削除
// ==========================================

deleteEquipmentButton.addEventListener("click", () => {
  const id = modalId.textContent;

  const item = equipmentData.find(
    equipment => equipment.id === id
  );

  if (!item) {
    alert("削除する装備が見つかりません。");
    return;
  }

  const confirmed = confirm(
    `「${item.name}」を削除しますか？\nこの操作は保存されます。`
  );

  if (!confirmed) {
    return;
  }

  const originalIndex = equipmentData.findIndex(
    equipment => equipment.id === id
  );

  if (originalIndex === -1) {
    return;
  }

  const deletedItem = equipmentData.splice(originalIndex, 1)[0];

  if (!saveEquipmentData()) {
    equipmentData.splice(originalIndex, 0, deletedItem);
    renderEquipment();
    return;
  }

  closeEquipmentDetail();

  renderEquipment();

  alert("装備を削除しました！");
});

// ==========================================
// 初期表示
// ==========================================

updateBuildEquipmentOptions();

renderEquipment();

renderBuilds();
// ==========================================
// ビルド一覧表示
// ==========================================

function renderBuilds() {
  buildList.innerHTML = "";

  if (buildData.length === 0) {
    buildList.innerHTML = `
      <div class="empty-message">
        <p>まだビルドは投稿されていません。</p>
        <p>最初のビルドを投稿してみよう！</p>
      </div>
    `;

    return;
  }

  // 新しい投稿を上に表示
const searchWord = buildSearchInput.value.trim().toLowerCase();

const filteredBuilds = buildData.filter(build => {
  const gearItem = equipmentData.find(item => item.id === build.gearId);
  const mainItem = equipmentData.find(item => item.id === build.mainId);
  const subItem = equipmentData.find(item => item.id === build.subId);

  const searchableText = [
    build.name,
    build.creator,
    build.description,
    gearItem?.name,
    mainItem?.name,
    subItem?.name
  ].join(" ").toLowerCase();

  return searchableText.includes(searchWord);
});

if (filteredBuilds.length === 0) {
  buildList.innerHTML = `
    <div class="empty-message">
      該当するビルドがありません。
    </div>
  `;
  return;
}

[...filteredBuilds].reverse().forEach(build => {
    const card = document.createElement("article");

    card.className = "build-card";
// ==========================================
// ビルド削除
// ==========================================

buildList.addEventListener("click", event => {

  const button = event.target.closest(".delete-build-button");

  if (!button) return;

  // 管理画面が閉じている場合は削除できない
  if (adminPanel.hidden) return;

  const index = Number(button.dataset.buildIndex);

  if (!Number.isInteger(index) || index < 0 || index >= buildData.length) {
    return;
  }

  const build = buildData[index];

  const confirmed = confirm(
    `「${build.name}」を削除しますか？\nこの操作は保存されます。`
  );

  if (!confirmed) return;

  // 削除前のデータを保管
  const deletedBuild = buildData.splice(index, 1)[0];

  // 保存
  if (!saveBuildData()) {
    // 保存失敗なら元に戻す
    buildData.splice(index, 0, deletedBuild);
    renderBuilds();
    return;
  }

  renderBuilds();

  alert("ビルドを削除しました！");

});

    const gearItem = equipmentData.find(
      item => item.id === build.gearId
    );

    const mainItem = equipmentData.find(
      item => item.id === build.mainId
    );

    const subItem = equipmentData.find(
      item => item.id === build.subId
    );

    const gearName = gearItem ? gearItem.name : "登録されていない装備";
    const mainName = mainItem ? mainItem.name : "登録されていない装備";
    const subName = subItem ? subItem.name : "登録されていない装備";

    card.innerHTML = `
      <p class="build-creator">
        投稿者：${escapeHTML(build.creator)}
      </p>

      <h3>${escapeHTML(build.name)}</h3>

      <div class="build-equipment">

        <div class="build-equipment-item">
          <strong>GEAR</strong>
          ${escapeHTML(gearName)}
        </div>

        <div class="build-equipment-item">
          <strong>MAIN</strong>
          ${escapeHTML(mainName)}
        </div>

        <div class="build-equipment-item">
          <strong>SUB</strong>
          ${escapeHTML(subName)}
        </div>

      </div>

      <p class="build-description">
        ${escapeHTML(build.description || "説明はありません。")}
      </p>

      <p class="build-date">
        投稿日：${escapeHTML(build.date)}
      </p>
      ${!adminPanel.hidden ? `
  <div class="build-admin-actions">
    <button
      class="delete-build-button"
      data-build-index="${buildData.indexOf(build)}"
    >
      このビルドを削除
    </button>
  </div>
` : ""}

    `;

    buildList.appendChild(card);
  });
}
// ==========================================
// ビルド投稿
// ==========================================

buildForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("buildName").value.trim();

  const creator =
    document.getElementById("buildCreator").value.trim() || "匿名";

  const gearId = buildGear.value;
  const mainId = buildMain.value;
  const subId = buildSub.value;

  const description =
    document.getElementById("buildDescription").value.trim();

  if (!name || !gearId || !mainId || !subId) {
    alert("ビルド名と3種類の装備を選択してください。");
    return;
  }

  // 選択された装備が現在も存在するか確認
  const selectedGear = equipmentData.some(
    item => item.id === gearId && item.type === "GEAR"
  );

  const selectedMain = equipmentData.some(
    item => item.id === mainId && item.type === "MAIN"
  );

  const selectedSub = equipmentData.some(
    item => item.id === subId && item.type === "SUB"
  );

  if (!selectedGear || !selectedMain || !selectedSub) {
    alert("選択された装備が見つかりません。装備を選び直してください。");
    updateBuildEquipmentOptions();
    return;
  }

  const newBuild = {
    name,
    creator,
    gearId,
    mainId,
    subId,
    description,
    date: new Date().toLocaleDateString("ja-JP")
  };

  buildData.push(newBuild);

  if (!saveBuildData()) {
    buildData.pop();
    return;
  }

  renderBuilds();

  buildForm.reset();

  alert("ビルドを投稿しました！");

  document.getElementById("builds").scrollIntoView({
    behavior: "smooth"
  });
});
// ビルド検索
buildSearchInput.addEventListener("input", () => {
  renderBuilds();
});

// 検索解除
buildSearchClear.addEventListener("click", () => {
  buildSearchInput.value = "";
  renderBuilds();
});