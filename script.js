import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyCQxR90Ldzn9xRi6kGjY3-PDQnijcP8M74",
  authDomain: "planner-14b1f.firebaseapp.com",
  projectId: "planner-14b1f",
  storageBucket: "planner-14b1f.firebasestorage.app",
  messagingSenderId: "1051139154745",
  appId: "1:1051139154745:web:daef4eddfe0ded9c0cbee8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- App Logic ---
$(document).ready(function () {
  const sections = ["day", "thoughts", "create"];
  let currentTab = "day";
  const userId = "anon-user"; // You can later replace this with Firebase Auth

  $(".tab").click(async function () {
    const tab = $(this).data("tab");
    currentTab = tab;
    $(".list-container").hide();
    $(`.list-container[data-tab="${tab}"]`).show();
    saveCurrentState();
    await loadState(); // includes Firebase fetch if needed
  });

  $(".add").click(function () {
    const list = $(`.list-container[data-tab="${currentTab}"]`);
    const item = createItem("");
    list.prepend(item);
    item.find("textarea").focus();
    saveCurrentState();
  });

  $(".delete-all").click(function () {
    $(`.list-container[data-tab="${currentTab}"]`).empty();
    saveCurrentState();
  });

  $(".delete-marked").click(function () {
    $(`.list-container[data-tab="${currentTab}"] .item`).each(function () {
      const box = $(this).find("input[type=checkbox]");
      if (box.hasClass("red")) $(this).remove();
    });
    saveCurrentState();
  });

  function createItem(text) {
    const wrapper = $("<div class='item'></div>");
    const box = $("<input type='checkbox'>");
    const area = $("<textarea></textarea>").val(text);

    box.on("click", function () {
      if (!box.hasClass("red") && !box.hasClass("green")) {
        box.addClass("red");
      } else if (box.hasClass("red")) {
        box.removeClass("red").addClass("green");
        area.addClass("collapsed");
      } else {
        box.removeClass("green");
        area.removeClass("collapsed");
      }
    });

    area.on("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
      saveCurrentState();
    });

    wrapper.append(box, area);
    return wrapper;
  }

  function getListData() {
    const data = [];
    $(`.list-container[data-tab="${currentTab}"] .item`).each(function () {
      const text = $(this).find("textarea").val();
      const box = $(this).find("input[type=checkbox]");
      const state = box.hasClass("red")
        ? "red"
        : box.hasClass("green")
        ? "green"
        : "";
      data.push({ text, state });
    });
    return data;
  }

  function saveCurrentState() {
    const data = getListData();
    localStorage.setItem(`journal-${currentTab}`, JSON.stringify(data));
    saveToFirebase(currentTab, data); // write to Firestore
  }

  async function saveToFirebase(tab, data) {
    try {
      await setDoc(doc(db, "users", userId, "journal", tab), { data });
    } catch (e) {
      console.error("Firebase Save Error:", e);
    }
  }

  async function loadState() {
    const list = $(`.list-container[data-tab="${currentTab}"]`);
    list.empty();

    try {
      const docRef = doc(db, "users", userId, "journal", currentTab);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        localStorage.setItem(`journal-${currentTab}`, JSON.stringify(data));
        renderItems(data);
        return;
      }
    } catch (e) {
      console.error("Firebase Load Error:", e);
    }

    // Fallback: load localStorage only if Firebase fails or no data
    const local = localStorage.getItem(`journal-${currentTab}`);
    if (local) {
      renderItems(JSON.parse(local));
    }
  }


  function renderItems(data) {
    const list = $(`.list-container[data-tab="${currentTab}"]`);
    data.forEach(({ text, state }) => {
      const item = createItem(text);
      const box = item.find("input[type=checkbox]");
      const area = item.find("textarea");
      if (state === "red") box.addClass("red");
      if (state === "green") {
        box.addClass("green");
        area.addClass("collapsed");
      }
      list.append(item);
    });
  }

  loadState(); // initial load
});
