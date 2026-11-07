// Helper to generate unique IDs
const uuid = () => '_' + Math.random().toString(36).substr(2, 9);

// DOM Elements
const newTaskInput = document.getElementById('new-task');
const taskListEl = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter');
const totalCountEl = document.getElementById('total-count');
const activeCountEl = document.getElementById('active-count');
const completedCountEl = document.getElementById('completed-count');

let tasks = [];
let currentFilter = 'all'; // all | active | completed

// Load tasks from localStorage
function loadTasks() {
    const stored = localStorage.getItem('todo-tasks');
    if (stored) {
        try { tasks = JSON.parse(stored); } catch { tasks = []; }
    }
    render();
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('todo-tasks', JSON.stringify(tasks));
}

function addTask(text) {
    const task = { id: uuid(), text: text.trim(), completed: false };
    tasks.push(task);
    saveTasks();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        render();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
    render();
}

function getFilteredTasks() {
    if (currentFilter === 'active') return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
}

function updateCounts() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    totalCountEl.textContent = total;
    completedCountEl.textContent = completed;
    activeCountEl.textContent = active;
}

function renderEmptyState() {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.textContent = '✨ Your task list is empty. Add something amazing!';
    taskListEl.innerHTML = '';
    taskListEl.appendChild(emptyDiv);
}

function render() {
    const visibleTasks = getFilteredTasks();
    taskListEl.innerHTML = '';
    if (visibleTasks.length === 0) {
        renderEmptyState();
    } else {
        visibleTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item' + (task.completed ? ' completed' : '');
            li.dataset.id = task.id;

            const leftDiv = document.createElement('div');
            leftDiv.className = 'task-left';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTask(task.id));
            leftDiv.appendChild(checkbox);

            const span = document.createElement('span');
            span.className = 'task-text';
            span.textContent = task.text;
            leftDiv.appendChild(span);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete task';
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            li.appendChild(leftDiv);
            li.appendChild(deleteBtn);
            taskListEl.appendChild(li);
        });
    }
    updateCounts();
}

// Event listeners
newTaskInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && newTaskInput.value.trim() !== '') {
        addTask(newTaskInput.value);
        newTaskInput.value = '';
    }
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

// Initialize
loadTasks();
