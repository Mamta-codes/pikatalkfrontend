// client.js
const socket = io("https://nodeserver-app.onrender.com");

// DOM elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.getElementById('message-container');
const typingIndicator = document.getElementById('typingIndicator');
const usersList = document.getElementById('usersList');
const onlineCount = document.getElementById('onlineCount');
const themeToggle = document.getElementById('themeToggle');
const notifySound = new Audio('audio.wav'); // sound for messages and joins

// Ask username (force until non-empty)
let myName = '';
while (!myName) {
  myName = prompt('Enter your username:');
}

// Send join event
socket.emit('new-user-joined', myName);

// ---------------- Helper Functions ----------------
function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function appendMessage({ text, who = '', type = 'message', time = '', self = false }) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message-wrap');

  if (type === 'notice') {
    wrapper.classList.add('notice');
    wrapper.innerText = text;
    // Play sound for notices (like user joined)
    notifySound.currentTime = 0;
    notifySound.play().catch(() => {});
  } else {
    const bubble = document.createElement('div');
    bubble.classList.add('message', self ? 'right' : 'left');
    bubble.innerHTML = `
      <div class="msg-head">
        <strong>${self ? 'You' : who}</strong>
        <span class="time">${time}</span>
      </div>
      <div class="msg-body">${escapeHtml(text)}</div>
    `;
    wrapper.appendChild(bubble);

    // Play sound only for messages from other users
    if (!self) {
      notifySound.currentTime = 0;
      notifySound.play().catch(() => {});
    }
  }

  messageContainer.appendChild(wrapper);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

// ---------------- Socket Events ----------------
socket.on('user-joined', (username) => {
  appendMessage({ text: `${username} joined the chat`, type: 'notice', time: timeNow() });
});

socket.on('receive', (data) => {
  appendMessage({ text: data.message, who: data.name, time: timeNow(), self: false });
});

socket.on('left', (username) => {
  appendMessage({ text: `${username} left the chat`, type: 'notice', time: timeNow() });
});

socket.on('update-user-list', (users) => {
  usersList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.innerText = u;
    usersList.appendChild(li);
  });
  onlineCount.innerText = `${users.length} online`;
});

socket.on('typing', (username) => {
  typingIndicator.hidden = false;
  typingIndicator.innerText = `${username} is typing...`;
});

socket.on('stop-typing', () => {
  typingIndicator.hidden = true;
});

// ---------------- Typing Emitter ----------------
let typingTimer;
messageInput.addEventListener('input', () => {
  socket.emit('typing');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('stop-typing');
  }, 900);
});

// ---------------- Sending Message ----------------
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  appendMessage({ text: message, who: myName, time: timeNow(), self: true });
  socket.emit('send', message);
  messageInput.value = '';
  socket.emit('stop-typing');
});

// ---------------- Theme Toggle ----------------
const root = document.documentElement;
const THEME_KEY = 'pika_theme';

function setTheme(t) {
  if (t === 'dark') {
    root.setAttribute('data-theme', 'dark');
    themeToggle.innerText = '☀️';
  } else {
    root.setAttribute('data-theme', 'light');
    themeToggle.innerText = '🌙';
  }
  localStorage.setItem(THEME_KEY, t);
}

themeToggle.addEventListener('click', () => {
  const current = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(current === 'light' ? 'dark' : 'light');
});

// Initialize theme
setTheme(localStorage.getItem(THEME_KEY) || 'light');

socket.on('chat-history', (messages) => {
  messages.forEach(msg => {
    appendMessage({
      text: msg.message,
      who: msg.name,
      time: new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      self: (msg.name === myName)  // show your own messages on right
    });
  });
});
