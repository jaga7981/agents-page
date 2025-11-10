// Configuration
const AGENT_CONFIG = {
  vendor: {
    name: "Vendor",
    email: "vendor@merlion.com",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-vendor",
  },
  customs: {
    name: "Customs Broker",
    email: "customs@clearance.com",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-customs",
  },
  warehouse: {
    name: "Warehouse Owners",
    email: "warehouse@storage.com",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-warehouse",
  },
  port: {
    name: "Port Owners",
    email: "port@harbor.gov",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-port",
  },
  account: {
    name: "Account Manager",
    email: "manager@mokabura.com",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-account",
  },
  retail: {
    name: "Retail Bots",
    email: "retail@shop.com",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-retail",
  },
  influencer: {
    name: "Influencer",
    email: "influencer@social.com",
    webhook: "https://n8n.jagadeesh.shop/webhook/agent-influencer",
  },
};

// State
let currentAgent = "vendor";
let currentView = "inbox";
let conversations = {};

// Initialize conversations for each agent
Object.keys(AGENT_CONFIG).forEach((agent) => {
  conversations[agent] = {};
});

// Generate NEW session ID on every page load (fresh session)
const SESSION_ID =
  "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

// DOM Elements
const agentItems = document.querySelectorAll(".agent-item");
const headerTitle = document.getElementById("headerTitle");
const composeBtn = document.getElementById("composeBtn");
const inboxView = document.getElementById("inboxView");
const threadView = document.getElementById("threadView");
const composeView = document.getElementById("composeView");
const backToInbox = document.getElementById("backToInbox");
const backFromCompose = document.getElementById("backFromCompose");
const sendBtn = document.getElementById("sendBtn");
const toEmail = document.getElementById("toEmail");
const subjectInput = document.getElementById("subjectInput");
const messageBody = document.getElementById("messageBody");
const threadContent = document.getElementById("threadContent");
const agentSearch = document.getElementById("agentSearch");

// Initialize
toEmail.value = AGENT_CONFIG[currentAgent].email;
updateHeaderTitle();

// Agent Search Functionality
if (agentSearch) {
  agentSearch.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    agentItems.forEach((item) => {
      const agentName = item
        .querySelector(".agent-name")
        .textContent.toLowerCase();
      if (agentName.includes(searchTerm)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  });
}

// Agent Selection
agentItems.forEach((item) => {
  item.addEventListener("click", () => {
    agentItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    currentAgent = item.dataset.agent;
    toEmail.value = AGENT_CONFIG[currentAgent].email;
    updateHeaderTitle();
    showInboxView();
    renderInbox();
  });
});

// View Navigation
composeBtn.addEventListener("click", showComposeView);
backToInbox.addEventListener("click", showInboxView);
backFromCompose.addEventListener("click", showInboxView);

// Send Email
sendBtn.addEventListener("click", async () => {
  const subject = subjectInput.value.trim();
  const body = messageBody.textContent.trim();

  if (!subject || !body) {
    alert("Please fill in both subject and message");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    const response = await fetch(AGENT_CONFIG[currentAgent].webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "student@mokabura.com",
        to: AGENT_CONFIG[currentAgent].email,
        subject: subject,
        message: body,
        session_id: SESSION_ID,
      }),
    });

    if (!response.ok) throw new Error("Failed to send");

    const data = await response.json();

    // Create thread ID from subject
    const threadId = subject
      .replace(/^(Re:\s*)*/, "")
      .toLowerCase()
      .replace(/\s+/g, "_");

    // Initialize thread if doesn't exist
    if (!conversations[currentAgent][threadId]) {
      conversations[currentAgent][threadId] = {
        subject: subject,
        messages: [],
      };
    }

    // Add user message
    const userMessage = {
      id: Date.now(),
      from: "student@mokabura.com",
      to: AGENT_CONFIG[currentAgent].email,
      body: body,
      date: new Date().toISOString(),
      isUser: true,
    };
    conversations[currentAgent][threadId].messages.push(userMessage);

    // Add agent reply
    const agentReply = {
      id: Date.now() + 1,
      from: AGENT_CONFIG[currentAgent].email,
      to: "student@mokabura.com",
      body: data.reply || "No response received",
      date: new Date().toISOString(),
      isUser: false,
    };
    conversations[currentAgent][threadId].messages.push(agentReply);

    // Clear form
    subjectInput.value = "";
    messageBody.innerHTML = "";

    showInboxView();
    renderInbox();
    alert("Email sent successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to send email. Please try again.");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
});

// Functions
function updateHeaderTitle() {
  headerTitle.textContent = `${AGENT_CONFIG[currentAgent].name} - ${
    currentView === "inbox"
      ? "Inbox"
      : currentView === "compose"
      ? "Compose"
      : "Thread"
  }`;
}

function showInboxView() {
  currentView = "inbox";
  inboxView.classList.add("active");
  threadView.classList.remove("active");
  composeView.classList.remove("active");
  updateHeaderTitle();
}

function showThreadView(threadId) {
  currentView = "thread";
  inboxView.classList.remove("active");
  threadView.classList.add("active");
  composeView.classList.remove("active");
  updateHeaderTitle();
  renderThread(threadId);
}

function showComposeView() {
  currentView = "compose";
  inboxView.classList.remove("active");
  threadView.classList.remove("active");
  composeView.classList.add("active");
  updateHeaderTitle();
}

function renderInbox() {
  const agentThreads = conversations[currentAgent];
  const threadKeys = Object.keys(agentThreads);

  if (threadKeys.length === 0) {
    inboxView.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📧</div>
        <h3>No messages yet</h3>
        <p>Click "Compose" to start a conversation with ${AGENT_CONFIG[currentAgent].name}</p>
      </div>
    `;
    return;
  }

  inboxView.innerHTML = threadKeys
    .map((threadId) => {
      const thread = agentThreads[threadId];
      const lastMessage = thread.messages[thread.messages.length - 1];
      return `
    <div class="email-list-item" onclick="showThreadView('${threadId}')">
      <div class="email-subject">${thread.subject}</div>
      <div class="email-preview">${lastMessage.body.substring(0, 100)}...</div>
      <div class="email-date">${new Date(
        lastMessage.date
      ).toLocaleString()}</div>
      <div class="email-count">${thread.messages.length} messages</div>
    </div>
  `;
    })
    .join("");
}

function renderThread(threadId) {
  const thread = conversations[currentAgent][threadId];

  if (!thread) return;

  const emailThreadHTML = thread.messages
    .map((email) => {
      const senderName = email.isUser ? "You" : AGENT_CONFIG[currentAgent].name;
      const avatarColor = email.isUser ? "#2196F3" : "#9E9E9E";

      return `
    <div class="email-message ${
      email.isUser ? "user-message" : "agent-message"
    }">
      <div class="email-header">
        <div class="sender-info">
          <div class="sender-avatar" style="background: ${avatarColor}">
            ${senderName.charAt(0)}
          </div>
          <div class="sender-details">
            <div class="sender-name">${senderName}</div>
            <div class="sender-email">to ${email.to}</div>
          </div>
          <div class="email-date-detail">${new Date(
            email.date
          ).toLocaleString()}</div>
        </div>
      </div>
      <div class="email-body">${email.body}</div>
    </div>
  `;
    })
    .join("");

  threadContent.innerHTML = `
    <div class="thread-actions">
      <button class="download-btn" onclick="downloadThread('${threadId}')">📥 Download Thread</button>
    </div>
    ${emailThreadHTML}
    <div class="reply-box">
      <textarea id="replyText" placeholder="Type your reply..."></textarea>
      <button class="send-btn" onclick="sendReply('${threadId}')">Send Reply</button>
    </div>
  `;
}

async function sendReply(threadId) {
  const replyText = document.getElementById("replyText").value.trim();

  if (!replyText) {
    alert("Please type a reply");
    return;
  }

  const thread = conversations[currentAgent][threadId];

  try {
    const response = await fetch(AGENT_CONFIG[currentAgent].webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "student@mokabura.com",
        to: AGENT_CONFIG[currentAgent].email,
        subject: "Re: " + thread.subject,
        message: replyText,
        session_id: SESSION_ID,
      }),
    });

    if (!response.ok) throw new Error("Failed to send");

    const data = await response.json();

    // Add user reply to thread
    const userReply = {
      id: Date.now(),
      from: "student@mokabura.com",
      to: AGENT_CONFIG[currentAgent].email,
      body: replyText,
      date: new Date().toISOString(),
      isUser: true,
    };
    thread.messages.push(userReply);

    // Add agent reply to thread
    const agentReply = {
      id: Date.now() + 1,
      from: AGENT_CONFIG[currentAgent].email,
      to: "student@mokabura.com",
      body: data.reply || "No response received",
      date: new Date().toISOString(),
      isUser: false,
    };
    thread.messages.push(agentReply);

    // Re-render the thread view
    renderThread(threadId);

    // Scroll to bottom
    const threadContainer = document.getElementById("threadContent");
    threadContainer.scrollTop = threadContainer.scrollHeight;

    alert("Reply sent successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to send reply. Please try again.");
  }
}

// Download Thread Function
function downloadThread(threadId) {
  const thread = conversations[currentAgent][threadId];
  if (!thread) return;

  let content = `Conversation Thread: ${thread.subject}\n`;
  content += `Agent: ${AGENT_CONFIG[currentAgent].name}\n`;
  content += `Downloaded: ${new Date().toLocaleString()}\n`;
  content += `\n${"=".repeat(60)}\n\n`;

  thread.messages.forEach((msg, index) => {
    const sender = msg.isUser ? "You" : AGENT_CONFIG[currentAgent].name;
    content += `Message ${index + 1} - ${sender}\n`;
    content += `Date: ${new Date(msg.date).toLocaleString()}\n`;
    content += `To: ${msg.to}\n`;
    content += `\n${msg.body}\n`;
    content += `\n${"-".repeat(60)}\n\n`;
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation_${
    AGENT_CONFIG[currentAgent].name
  }_${threadId}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize text formatting
window.addEventListener("load", () => {
  const editor = document.getElementById("messageBody");

  // Format button handler
  function handleFormat(command) {
    editor.focus();
    document.execCommand(command, false, null);
    updateToolbarState();
  }

  // Format buttons
  document.getElementById("boldBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("bold");
  });

  document.getElementById("italicBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("italic");
  });

  document.getElementById("underlineBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("underline");
  });

  document.getElementById("strikeBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("strikeThrough");
  });

  document.getElementById("bulletBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("insertUnorderedList");
  });

  document.getElementById("numberBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("insertOrderedList");
  });

  // Undo/Redo
  document.getElementById("undoBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("undo");
  });

  document.getElementById("redoBtn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleFormat("redo");
  });

  // Track formatting state
  editor.addEventListener("keyup", updateToolbarState);
  editor.addEventListener("mouseup", updateToolbarState);
  editor.addEventListener("focus", updateToolbarState);

  function updateToolbarState() {
    try {
      document
        .getElementById("boldBtn")
        .classList.toggle("active", document.queryCommandState("bold"));
      document
        .getElementById("italicBtn")
        .classList.toggle("active", document.queryCommandState("italic"));
      document
        .getElementById("underlineBtn")
        .classList.toggle("active", document.queryCommandState("underline"));
      document
        .getElementById("strikeBtn")
        .classList.toggle(
          "active",
          document.queryCommandState("strikeThrough")
        );
    } catch (e) {
      // Ignore errors when no selection
    }
  }

  // Handle autofill
  document.getElementById("autofillBtn").addEventListener("click", (e) => {
    e.preventDefault();
    if (
      editor.textContent.trim() &&
      !confirm("This will replace your current message. Continue?")
    ) {
      return;
    }
    editor.textContent = PRESET_MESSAGES[currentAgent];
    document.getElementById(
      "subjectInput"
    ).value = `Inquiry: ${AGENT_CONFIG[currentAgent].name} Services`;
    editor.focus();
  });
});

// Autofill message presets
const PRESET_MESSAGES = {
  vendor:
    "Dear Vendor,\n\nI hope this message finds you well. I am writing to inquire about your product catalog and current pricing. Could you please share the latest information?\n\nBest regards,\nStudent",
  customs:
    "Hello Customs Broker,\n\nI need assistance with clearing an upcoming shipment. Could you please guide me through the required documentation?\n\nBest regards,\nStudent",
  warehouse:
    "Dear Warehouse Team,\n\nI would like to check the current storage capacity and rates for our upcoming inventory.\n\nBest regards,\nStudent",
  port: "Dear Port Authority,\n\nI need information about the upcoming vessel schedules and berth availability.\n\nBest regards,\nStudent",
  account:
    "Dear Account Manager,\n\nCould you please provide an update on our current account status and any pending matters?\n\nBest regards,\nStudent",
  retail:
    "Hello Retail Team,\n\nI would like to discuss our product placement strategy for the upcoming season.\n\nBest regards,\nStudent",
  influencer:
    "Hello,\n\nI would like to explore potential collaboration opportunities for our brand promotion.\n\nBest regards,\nStudent",
};

// Make functions global
window.showThreadView = showThreadView;
window.sendReply = sendReply;
window.downloadThread = downloadThread;
