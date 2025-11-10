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
  conversations[agent] = [];
});

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

// Initialize
toEmail.value = AGENT_CONFIG[currentAgent].email;
updateHeaderTitle();

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

  // Generate or get session ID
  let sessionId = localStorage.getItem("csp_session_id");
  if (!sessionId) {
    sessionId =
      "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("csp_session_id", sessionId);
  }

  try {
    const response = await fetch(AGENT_CONFIG[currentAgent].webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "student@mokabura.com",
        to: AGENT_CONFIG[currentAgent].email,
        subject: subject,
        message: body,
        session_id: sessionId, // NEW: Add session ID
      }),
    });

    if (!response.ok) throw new Error("Failed to send");

    const data = await response.json();

    // Add user message
    const userMessage = {
      id: Date.now(),
      from: "student@mokabura.com",
      to: AGENT_CONFIG[currentAgent].email,
      subject: subject,
      body: body,
      date: new Date().toISOString(),
      isUser: true,
    };
    conversations[currentAgent].unshift(userMessage);

    // Add agent reply
    const agentReply = {
      id: Date.now() + 1,
      from: AGENT_CONFIG[currentAgent].email,
      to: "student@mokabura.com",
      subject: "Re: " + subject,
      body: data.reply || "No response received",
      date: new Date().toISOString(),
      isUser: false,
    };
    conversations[currentAgent].unshift(agentReply);

    // Clear form
    subjectInput.value = "";
    messageBody.textContent = "";

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

function showThreadView(emailId) {
  currentView = "thread";
  inboxView.classList.remove("active");
  threadView.classList.add("active");
  composeView.classList.remove("active");
  updateHeaderTitle();
  renderThread(emailId);
}

function showComposeView() {
  currentView = "compose";
  inboxView.classList.remove("active");
  threadView.classList.remove("active");
  composeView.classList.add("active");
  updateHeaderTitle();
}

function renderInbox() {
  const agentConversations = conversations[currentAgent];

  if (agentConversations.length === 0) {
    inboxView.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📧</div>
        <h3>No messages yet</h3>
        <p>Click "Compose" to start a conversation with ${AGENT_CONFIG[currentAgent].name}</p>
      </div>
    `;
    return;
  }

  inboxView.innerHTML = agentConversations
    .map(
      (email) => `
    <div class="email-list-item" onclick="showThreadView(${email.id})">
      <div class="email-subject">${email.subject}</div>
      <div class="email-preview">${email.body.substring(0, 100)}...</div>
      <div class="email-date">${new Date(email.date).toLocaleString()}</div>
    </div>
  `
    )
    .join("");
}

function renderThread(emailId) {
  const allEmails = conversations[currentAgent];
  const mainEmail = allEmails.find((e) => e.id === emailId);

  if (!mainEmail) return;

  // Get all emails in the same thread (matching subject without Re:)
  const baseSubject = mainEmail.subject.replace(/^(Re:\s*)*/, "");
  const threadEmails = allEmails
    .filter((e) => e.subject.replace(/^(Re:\s*)*/, "") === baseSubject)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const emailThreadHTML = threadEmails
    .map((email) => {
      const senderName = email.isUser ? "You" : AGENT_CONFIG[currentAgent].name;
      const avatarColor = email.isUser ? "#2196F3" : "#9E9E9E";

      return `
    <div class="email-message ${
      email.isUser ? "user-message" : "agent-message"
    }">
      <div class="email-header">
        <div class="email-subject-detail">${email.subject}</div>
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
    ${emailThreadHTML}
    <div class="reply-box">
      <textarea id="replyText" placeholder="Type your reply..."></textarea>
      <button class="send-btn" onclick="sendReply('${baseSubject}')">Send Reply</button>
    </div>
  `;
}

async function sendReply(originalSubject) {
  const replyText = document.getElementById("replyText").value.trim();

  if (!replyText) {
    alert("Please type a reply");
    return;
  }

  // Get session ID
  let sessionId = localStorage.getItem("csp_session_id");
  if (!sessionId) {
    sessionId =
      "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("csp_session_id", sessionId);
  }

  try {
    const response = await fetch(AGENT_CONFIG[currentAgent].webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "student@mokabura.com",
        to: AGENT_CONFIG[currentAgent].email,
        subject: "Re: " + originalSubject,
        message: replyText,
        session_id: sessionId, // NEW: Add session ID
      }),
    });

    if (!response.ok) throw new Error("Failed to send");

    const data = await response.json();

    // Add user reply
    const userReply = {
      id: Date.now(),
      from: "student@mokabura.com",
      to: AGENT_CONFIG[currentAgent].email,
      subject: "Re: " + originalSubject,
      body: replyText,
      date: new Date().toISOString(),
      isUser: true,
    };
    conversations[currentAgent].unshift(userReply);

    // Add agent reply
    const agentReply = {
      id: Date.now() + 1,
      from: AGENT_CONFIG[currentAgent].email,
      to: "student@mokabura.com",
      subject: "Re: " + originalSubject,
      body: data.reply || "No response received",
      date: new Date().toISOString(),
      isUser: false,
    };
    conversations[currentAgent].unshift(agentReply);

    showInboxView();
    renderInbox();
    alert("Reply sent successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to send reply. Please try again.");
  }
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
