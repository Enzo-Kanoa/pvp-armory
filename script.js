import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

console.log("Firebase接続成功！", auth.app.options.projectId);

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

const menuButton = document.getElementById("menuButton");
const hamburgerMenu = document.getElementById("hamburgerMenu");
const adminMenuLink = document.getElementById("adminMenuLink");
const likedBuildList = document.getElementById("likedBuildList");
// ==========================================
// ビルド投稿データ
// ==========================================

const BUILD_STORAGE_KEY = "pvp_armory_builds";

const buildForm = document.getElementById("buildForm");

// 現在編集中のビルドID
let editingBuildId = null;

const buildList = document.getElementById("buildList");
const buildSearchInput = document.getElementById("buildSearchInput");
const buildSearchClear = document.getElementById("buildSearchClear");
const buildSort = document.getElementById("buildSort");
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
// いいねデータ管理
// ==========================================

// ビルドごとのいいね情報を保存
const likeData = new Map();

// ビルドごとのリアルタイム監視を保存
const likeUnsubscribers = new Map();

// ==========================================
// いいね情報のリアルタイム監視
// ==========================================

function startLikeSync(buildId) {

  // すでに監視中なら何もしない
  if (likeUnsubscribers.has(buildId)) {
    return;
  }

  const likesRef = collection(
    db,
    "builds",
    buildId,
    "likes"
  );

  const unsubscribe = onSnapshot(
    likesRef,
    snapshot => {

      // いいね数と、いいねしたユーザーのUIDを保存
      likeData.set(buildId, {
        count: snapshot.size,
        userIds: snapshot.docs.map(document => document.id)
      });

      // 表示を更新
      const card = buildList.querySelector(
        `.build-card[data-build-id="${buildId}"]`
      );

      if (card) {
        updateLikeButton(card, buildId);
      }

      // いいね一覧も更新
renderLikedBuilds();

      // いいね順なら一覧も並び替え直す
      if (buildSort.value === "likes") {
        renderBuilds();
      }

    },
    error => {
      console.error("いいね監視エラー:", error);
    }
  );

  likeUnsubscribers.set(buildId, unsubscribe);
}

// ==========================================
// いいねボタンの表示更新
// ==========================================

function updateLikeButton(card, buildId) {

  const button = card.querySelector(".like-button");
  const countElement = card.querySelector(".like-count");

  if (!button || !countElement) return;

  const data = likeData.get(buildId) || {
    count: 0,
    userIds: []
  };

  const user = auth.currentUser;

  const liked = user
    ? data.userIds.includes(user.uid)
    : false;

  button.textContent = liked
    ? "♥ いいね済み"
    : "♡ いいね";

  button.disabled = !user;

  countElement.textContent = `${data.count} いいね`;
}

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
// Firestore 装備データ連携
// ==========================================

let equipmentUnsubscribe = null;
let isAdmin = false;

async function startEquipmentSync(user) {

  // 以前の監視を停止
  if (equipmentUnsubscribe) {
    equipmentUnsubscribe();
    equipmentUnsubscribe = null;
  }

  isAdmin = false;

  // 管理者かどうか確認
  if (user) {
    try {
      const adminRef = doc(db, "admins", user.uid);
      const adminSnapshot = await getDoc(adminRef);

      isAdmin = adminSnapshot.exists();

    } catch (error) {
      console.error("管理者確認エラー:", error);
    }
  }

  // 管理者以外は管理画面を表示しない
  adminPanel.hidden = !isAdmin;

// 管理者以外はハンバーガーメニューの装備追加を表示しない
adminMenuLink.classList.toggle("hidden", !isAdmin);

  const equipmentRef = collection(db, "equipment");

  try {

    // Firestoreに現在ある装備を確認
    const existingData = await getDocs(equipmentRef);

    // Firestoreが空で、管理者がログインしている場合だけ
    // 現在のローカル装備データを移行する
    if (
      existingData.empty &&
      isAdmin &&
      equipmentData.length > 0
    ) {

      const batch = writeBatch(db);

      equipmentData.forEach(item => {

        const equipmentDoc = doc(
          db,
          "equipment",
          encodeURIComponent(item.id)
        );

        batch.set(equipmentDoc, item);

      });

      await batch.commit();

      console.log("装備データの初回移行が完了しました！");

    }

    // Firestoreの変更をリアルタイム監視
    equipmentUnsubscribe = onSnapshot(
      equipmentRef,
      snapshot => {

        // Firestoreにデータがある場合だけ更新
        if (!snapshot.empty) {

          equipmentData = snapshot.docs.map(
            document => document.data()
          );

          renderEquipment();
          renderBuilds();

          console.log("Firestoreの装備データを更新しました！");

        }

      },
      error => {
        console.error("装備データ監視エラー:", error);
        alert("装備データの同期に失敗しました。");
      }
    );

  } catch (error) {

    console.error("Firestore装備データ連携エラー:", error);

    alert("Firestoreとの接続に失敗しました。");

  }
}

// ==========================================
// ビルドデータのFirestore同期
// ==========================================

let buildUnsubscribe = null;

function startBuildSync() {

  // 以前の監視を解除
  if (buildUnsubscribe) {
    buildUnsubscribe();
    buildUnsubscribe = null;
  }

  const buildsRef = collection(db, "builds");

  buildUnsubscribe = onSnapshot(
    buildsRef,

    snapshot => {
      // Firestoreからビルドデータを取得
      buildData = snapshot.docs.map(document => ({
        id: document.id,
        ...document.data()
      }));

      renderBuilds();

      console.log("Firestoreのビルドデータを更新しました！");
    },

    error => {
      console.error("ビルドデータ監視エラー:", error);
      alert("ビルドデータの同期に失敗しました。");
    }
  );
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
 // 装備登録・編集（Firestore対応）
 // ==========================================

equipmentForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) {
    alert("管理者のみ装備を登録・編集できます。");
    return;
  }

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

  if (id.includes("/")) {
    alert("IDに「/」は使用できません。");
    return;
  }

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

  const oldId = editingEquipmentId;

  try {
    const batch = writeBatch(db);

    const newRef = doc(
      db,
      "equipment",
      encodeURIComponent(id)
    );

    // 編集の場合、IDが変更されていたら古いデータを削除
    if (oldId !== null && oldId !== id) {
      const oldRef = doc(
        db,
        "equipment",
        encodeURIComponent(oldId)
      );

      batch.delete(oldRef);
    }

    // 新規登録・編集データを保存
    batch.set(newRef, newEquipment);

    await batch.commit();

    editingEquipmentId = null;

    equipmentForm.reset();

    const submitButton = equipmentForm.querySelector(
      'button[type="submit"]'
    );

    submitButton.textContent = "装備を登録";

    selectedImageData = null;
    currentEditingImage = "";
    equipmentImageInput.value = "";

    showImagePreview("");

    alert(oldId !== null
      ? "装備を変更・保存しました！"
      : "装備を登録しました！"
    );

    // Firestoreのリアルタイム監視によって一覧が更新されます

    document.getElementById("equipment").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {
    console.error("装備保存エラー:", error);
    alert("装備の保存に失敗しました。\n" + error.message);
  }
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
 // 装備削除（Firestore対応）
 // ==========================================

deleteEquipmentButton.addEventListener("click", async () => {

  if (!isAdmin) {
    alert("管理者のみ装備を削除できます。");
    return;
  }

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

  if (!confirmed) return;

  try {
    const equipmentRef = doc(
      db,
      "equipment",
      encodeURIComponent(id)
    );

    const batch = writeBatch(db);

    batch.delete(equipmentRef);

    await batch.commit();

    closeEquipmentDetail();

    alert("装備を削除しました！");

    // Firestoreのリアルタイム監視によって一覧が更新されます

  } catch (error) {
    console.error("装備削除エラー:", error);
    alert("装備の削除に失敗しました。\n" + error.message);
  }

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

// ==========================================
// ビルド並び替え
// ==========================================

const sortedBuilds = [...filteredBuilds];

if (buildSort.value === "likes") {

  // いいね数が多い順
  sortedBuilds.sort((a, b) => {
    const aLikes = likeData.get(a.id)?.count || 0;
    const bLikes = likeData.get(b.id)?.count || 0;

    return bLikes - aLikes ||
      (b.createdAt || 0) - (a.createdAt || 0);
  });

} else if (buildSort.value === "newest") {

  // 新しい順
  sortedBuilds.sort((a, b) => {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

} else if (buildSort.value === "oldest") {

  // 古い順
  sortedBuilds.sort((a, b) => {
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

}

sortedBuilds.forEach(build => {

    const card = document.createElement("article");

    card.className = "build-card";
    card.dataset.buildId = build.id;
// ==========================================
// ビルド削除
// ==========================================

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

      ${build.description ? `
  <div class="build-description">
    <div class="build-description-title">ビルドの説明</div>
    <div class="build-description-text">${escapeHTML(build.description)}</div>
  </div>
` : ""}

       <p class="build-date">
        投稿日：${escapeHTML(build.date)}
      </p>

      <div class="build-like-area">
  <button
    class="like-button"
    data-build-id="${escapeHTML(build.id)}"
  >
    ♡ いいね
  </button>

  <span class="like-count">0 いいね</span>
</div>
      
      ${auth.currentUser && build.ownerUid === auth.currentUser.uid ? `
        <div class="build-admin-actions">
          <button class="edit-build-button" data-build-id="${build.id}">
            このビルドを編集
          </button>

          <button class="delete-build-button" data-build-id="${build.id}">
            このビルドを削除
          </button>
        </div>
      ` : ""}

      ${!adminPanel.hidden && build.ownerUid !== auth.currentUser?.uid ? `
        <div class="build-admin-actions">
          <button class="delete-build-button" data-build-id="${build.id}">
            管理者として削除
          </button>
        </div>
      ` : ""}

    `;

    buildList.appendChild(card);
startLikeSync(build.id);

// 保存済みのいいね状態をカードに反映
updateLikeButton(card, build.id);
  });
}

// ==========================================
// いいねしたビルド一覧
// ==========================================

function renderLikedBuilds() {

  likedBuildList.innerHTML = "";

  const user = auth.currentUser;

  // ログインしていない場合
  if (!user) {
    likedBuildList.innerHTML = `
      <div class="empty-message">
        <p>いいね一覧を見るにはログインしてください。</p>
      </div>
    `;
    return;
  }

  // 自分がいいねしたビルドだけ抽出
  const likedBuilds = buildData.filter(build => {
    const data = likeData.get(build.id);
    return data?.userIds?.includes(user.uid);
  });

  if (likedBuilds.length === 0) {
    likedBuildList.innerHTML = `
      <div class="empty-message">
        <p>いいねしたビルドはまだありません。</p>
      </div>
    `;
    return;
  }

  // 新しい順に表示
  likedBuilds.sort((a, b) => {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  likedBuilds.forEach(build => {

    const card = document.createElement("article");

    card.className = "build-card";
    card.dataset.buildId = build.id;

    card.innerHTML = `
      <p class="build-creator">
        投稿者：${escapeHTML(build.creator)}
      </p>

      <h3>${escapeHTML(build.name)}</h3>

      ${build.description ? `
        <p>${escapeHTML(build.description)}</p>
      ` : ""}

      <div class="build-like-area">
        <button
          class="like-button"
          data-build-id="${escapeHTML(build.id)}"
        >
          ♥ いいね済み
        </button>

        <span class="like-count">
          ${likeData.get(build.id)?.count || 0} いいね
        </span>
      </div>
    `;

    likedBuildList.appendChild(card);
    updateLikeButton(card, build.id);
  });
}

// ==========================================
// いいねボタンのクリック処理
// ==========================================

document.addEventListener("click", async event => {

  const button = event.target.closest(".like-button");

  if (!button) return;

  const user = auth.currentUser;

  if (!user) {
    alert("いいねするにはログインしてください。");
    return;
  }

  const buildId = button.dataset.buildId;

  if (!buildId) return;

  button.disabled = true;

  const likeRef = doc(
    db,
    "builds",
    buildId,
    "likes",
    user.uid
  );

  try {

    const likeSnapshot = await getDoc(likeRef);

    if (likeSnapshot.exists()) {

      // いいね済みなら取り消す
      await deleteDoc(likeRef);

    } else {

      // まだならいいねする
      await setDoc(likeRef, {
        createdAt: Date.now()
      });

    }

  } catch (error) {

    console.error("いいね処理エラー:", error);

    alert("いいねの処理に失敗しました。\n" + error.message);

  } finally {

    button.disabled = false;

  }

});

// ==========================================
// ビルド削除（Firestore）
// ==========================================

buildList.addEventListener("click", async event => {
  const button = event.target.closest(".delete-build-button");
  if (!button) return;

  const buildId = button.dataset.buildId;

  if (!buildId) return;

  const build = buildData.find(item => item.id === buildId);
  if (!build) return;

  const user = auth.currentUser;
  if (!user) {
    alert("ログインしてください。");
    return;
  }

  if (
    build.ownerUid !== user.uid &&
    adminPanel.hidden
  ) {
    alert("このビルドを削除する権限がありません。");
    return;
  }

  if (!confirm("このビルドを削除しますか？")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "builds", buildId));
    alert("ビルドを削除しました！");
  } catch (error) {
    console.error("ビルド削除エラー:", error);
    alert("ビルドの削除に失敗しました。");
  }
});

// ==========================================
// ビルド編集（フォームへの読み込み）
// ==========================================

buildList.addEventListener("click", event => {
  const button = event.target.closest(".edit-build-button");
  if (!button) return;

  const buildId = button.dataset.buildId;

  const build = buildData.find(item => item.id === buildId);

  if (!build) {
    alert("編集するビルドが見つかりません。");
    return;
  }

  const user = auth.currentUser;

  if (!user || build.ownerUid !== user.uid) {
    alert("自分の投稿のみ編集できます。");
    return;
  }

  // 編集中のIDを記録
  editingBuildId = build.id;

  // 投稿フォームに内容を読み込む
  document.getElementById("buildName").value = build.name;
  document.getElementById("buildCreator").value = build.creator;
  document.getElementById("buildDescription").value = build.description || "";

  updateBuildEquipmentOptions();

  buildGear.value = build.gearId;
  buildMain.value = build.mainId;
  buildSub.value = build.subId;

  // 投稿ボタンの表示変更
  const submitButton = buildForm.querySelector('button[type="submit"]');

  submitButton.textContent = "変更を保存";

  // フォームまで移動
  buildForm.scrollIntoView({
    behavior: "smooth"
  });
});

// ==========================================
// ビルド投稿・編集（Firestore保存）
// ==========================================

buildForm.addEventListener("submit", async event => {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    alert("ビルドを投稿するにはログインしてください。");
    return;
  }

  const name = document.getElementById("buildName").value.trim();

  const creator =
    document.getElementById("buildCreator").value.trim() ||
    user.displayName ||
    "匿名";

  const gearId = buildGear.value;
  const mainId = buildMain.value;
  const subId = buildSub.value;

  const description =
    document.getElementById("buildDescription").value.trim();

  if (!name || !gearId || !mainId || !subId) {
    alert("ビルド名と3種類の装備を選択してください。");
    return;
  }

  // 装備が現在も存在するか確認
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

  try {

    if (editingBuildId !== null) {

      // ==========================================
      // 既存ビルドの編集・保存
      // ==========================================

      const oldBuild = buildData.find(
        item => item.id === editingBuildId
      );

      if (!oldBuild || oldBuild.ownerUid !== user.uid) {
        alert("編集権限がありません。");
        editingBuildId = null;
        return;
      }

      const updatedBuild = {
        name,
        creator,
        gearId,
        mainId,
        subId,
        description
      };

      await updateDoc(
        doc(db, "builds", editingBuildId),
        updatedBuild
      );

      editingBuildId = null;

      buildForm.reset();

      const submitButton = buildForm.querySelector(
        'button[type="submit"]'
      );

      submitButton.textContent = "ビルドを投稿";

      alert("ビルドを変更・保存しました！");

    } else {

      // ==========================================
      // 新規ビルド投稿
      // ==========================================

      const newBuild = {
        name,
        creator,
        gearId,
        mainId,
        subId,
        description,
        date: new Date().toLocaleDateString("ja-JP"),
        ownerUid: user.uid,
        createdAt: Date.now()
      };

      await addDoc(
        collection(db, "builds"),
        newBuild
      );

      buildForm.reset();

      alert("ビルドを投稿しました！");
    }

    document.getElementById("builds").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {
    console.error("ビルド保存エラー:", error);
    alert("ビルドの保存に失敗しました。\n" + error.message);
  }
});

// ビルド検索
buildSearchInput.addEventListener("input", () => {
  renderBuilds();
});

// ビルド並び替え
buildSort.addEventListener("change", () => {
  renderBuilds();
});

// 検索解除
buildSearchClear.addEventListener("click", () => {
  buildSearchInput.value = "";
  renderBuilds();
});

// ==========================================
// Firebase アカウント機能
// ==========================================

const authPanel = document.getElementById("authPanel");
const authStatus = document.getElementById("authStatus");

const authUsername = document.getElementById("authUsername");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");

const registerButton = document.getElementById("registerButton");
const authLoginButton = document.getElementById("authLoginButton");
const logoutButton = document.getElementById("logoutButton");

const loginButton = document.getElementById("loginButton");

// アカウント画面の表示・非表示
loginButton.addEventListener("click", () => {
  authPanel.hidden = !authPanel.hidden;

  if (!authPanel.hidden) {
    authPanel.scrollIntoView({
      behavior: "smooth"
    });
  }
});

// 新規登録
registerButton.addEventListener("click", async () => {
  const username = authUsername.value.trim();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!username) {
    alert("ユーザー名を入力してください。");
    return;
  }

  if (username.length > 20) {
    alert("ユーザー名は20文字以内にしてください。");
    return;
  }

  if (!email || password.length < 6) {
    alert("メールアドレスと6文字以上のパスワードを入力してください。");
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(result.user, {
      displayName: username
    });

    authPassword.value = "";

    alert("アカウントを作成しました！");

  } catch (error) {
    console.error("新規登録エラー:", error);

    alert("登録に失敗しました。\n" + error.message);
  }
});

// ログイン
authLoginButton.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    alert("メールアドレスとパスワードを入力してください。");
    return;
  }

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    authPassword.value = "";

    alert("ログインしました！");

  } catch (error) {
    console.error("ログインエラー:", error);

    alert("ログインに失敗しました。\n" + error.message);
  }
});

// ログアウト
logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);

    alert("ログアウトしました！");

  } catch (error) {
    console.error("ログアウトエラー:", error);

    alert("ログアウトに失敗しました。");
  }
});

// ログイン状態の監視
onAuthStateChanged(auth, async user => {

  // Firestoreとの同期を開始
  await startEquipmentSync(user);

  // ビルドデータの同期を開始
  startBuildSync();
  
  if (user) {
    const username = user.displayName || user.email;

    authStatus.textContent =
      `ログイン中：${username}`;

    loginButton.textContent = "アカウント";

    authUsername.value = user.displayName || "";

    logoutButton.hidden = false;
    registerButton.hidden = true;
    authLoginButton.hidden = true;

  } else {
    authStatus.textContent = "ログインしていません。";

    loginButton.textContent = "ログイン / 新規登録";

    logoutButton.hidden = true;
    registerButton.hidden = false;
    authLoginButton.hidden = false;
  }
    // いいねボタンの表示を更新
  document.querySelectorAll(".build-card").forEach(card => {
    const buildId = card.dataset.buildId;

    if (buildId) {
      updateLikeButton(card, buildId);
    }
  }); 
renderLikedBuilds();
});

// ==========================================
// ハンバーガーメニュー
// ==========================================

menuButton.addEventListener("click", () => {
  hamburgerMenu.classList.toggle("hidden");
});

// メニュー内のリンクを押したら閉じる
hamburgerMenu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    hamburgerMenu.classList.add("hidden");
  });
});

// メニュー外をクリックしたら閉じる
document.addEventListener("click", event => {
  if (
    !hamburgerMenu.contains(event.target) &&
    !menuButton.contains(event.target)
  ) {
    hamburgerMenu.classList.add("hidden");
  }
});