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
   saveCurrentState(); // Save current tab BEFORE switching
   const tab = $(this).data("tab");
   currentTab = tab;
   $(".list-wrapper").hide();
   $(`.list-wrapper[data-tab="${tab}"]`).show();
   await loadState(); // Load new tab AFTER switching
 });


$(document).on("click", ".add", function (e) {
  const list = $(`.list-wrapper[data-tab="${currentTab}"] .list-container`);
  let item;
  if (e.shiftKey) {
    item = createDivider();
  } else {
    item = createItem("");
  }
  list.prepend(item);
  item.find("textarea").focus();
  saveCurrentState();
});

$(document).on("click", ".divider-add", function () {
  const list = $(`.list-wrapper[data-tab="${currentTab}"] .list-container`);
  const divider = createDivider();
  const item = createItem("");

  list.prepend(divider);
  list.prepend(item);
  item.find("textarea").focus();

  updateItemsBelow(divider, "green");

  saveCurrentState();
});



 $(document).on("click", ".delete-all", function () {
   const items = $(`.list-wrapper[data-tab="${currentTab}"] .item`);
   let mark = false;
   items.each(function () {
     if ($(this).hasClass("divider")) {
       mark = true;
       return true;
     }
     if (mark) {
       const box = $(this).find("input[type=checkbox]");
       if (box.length) {
         box.removeClass("green").addClass("red");
         $(this).find("textarea").removeClass("collapsed");
       }
     }
   });
   saveCurrentState();
 });


  $(document).on("click", ".delete-marked", function () {
    $(`.list-wrapper[data-tab="${currentTab}"] .item`).each(function () {
      const box = $(this).find("input[type=checkbox]");
      if (box.hasClass("red")) {
        $(this).remove();
      }
    });
    saveCurrentState();
  });



  function createItem(text) {
    const wrapper = $("<div class='item'></div>");
    const box = $("<input type='checkbox'>");
    const area = $("<textarea></textarea>").val(text);

  box.on("click", function () {
    if (!box.hasClass("green") && !box.hasClass("red")) {
      box.addClass("green");
      area.addClass("collapsed");
    } else if (box.hasClass("green")) {
      box.removeClass("green").addClass("red");
      area.removeClass("collapsed");
    } else {
      box.removeClass("red");
      area.removeClass("collapsed");
    }
    saveCurrentState(); // <--- add this here
  });


    area.on("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
      saveCurrentState();
    });

    wrapper.append(box, area);
    return wrapper;
  }
 
  function createDivider() {
    const wrapper = $("<div class='item divider'></div>");
    const box = $("<input type='checkbox'>");
    wrapper.append(box);

    // Start green by default (when created)
    box.addClass("green");

    box.on("click", function () {
      if (box.hasClass("green")) {
        box.removeClass("green").addClass("red");
        wrapper.removeClass("collapsed"); // optional style
        updateItemsBelow(wrapper, "red");
      } else {
        box.removeClass("red").addClass("green");
        wrapper.addClass("collapsed"); // optional style
        updateItemsBelow(wrapper, "green");
      }
      saveCurrentState();
    });

    // Optional: add collapsed style initially
    wrapper.addClass("collapsed");

    return wrapper;
  }

  function updateItemsBelow(divider, color) {
    let mark = false;
    const list = divider.parent();

    list.children(".item").each(function () {
      if ($(this).is(divider)) {
        mark = true;
        return true; // continue loop
      }
      if (mark) {
        const box = $(this).find("input[type=checkbox]");
        const area = $(this).find("textarea");
        if (box.length) {
          box.removeClass("green red").addClass(color);
          if (color === "green") {
            area.addClass("collapsed");
          } else {
            area.removeClass("collapsed");
          }
        }
      }
    });
  }



  function getListData() {
    const data = [];
    $(`.list-wrapper[data-tab="${currentTab}"] .item`).each(function () {
      if ($(this).hasClass("divider")) {
        data.push({ type: "divider" });
        return;
      }
      const text = $(this).find("textarea").val();
      const box = $(this).find("input[type=checkbox]");
      const state = box.hasClass("green")
        ? "green"
        : box.hasClass("red")
        ? "red"
        : "";
      data.push({ type: "item", text, state });
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
    const list = $(`.list-wrapper[data-tab="${currentTab}"] .list-container`);

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
   const list = $(`.list-wrapper[data-tab="${currentTab}"] .list-container`);

   list.empty(); // Clear existing items before rendering new ones

   data.forEach((entry) => {
     if (entry.type === "divider") {
       list.append(createDivider());
       return;
     }

     const { text, state } = entry;
     const item = createItem(text);
     const box = item.find("input[type=checkbox]");
     const area = item.find("textarea");

     if (state === "green") {
       box.addClass("green");
       area.addClass("collapsed");
     } else if (state === "red") {
       box.addClass("red");
       area.removeClass("collapsed");
     } else {
       area.removeClass("collapsed");
     }

     setTimeout(() => {
       area[0].style.height = "auto";
       area[0].style.height = area[0].scrollHeight + "px";
     }, 0);

     list.append(item);
   });

 }


  loadState(); // initial load
});
