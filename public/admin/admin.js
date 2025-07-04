const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://intorealtors.onrender.com/api';

const tabConfig = {
    dashboard: { listId: 'dashboard' },
    properties: { api: 'properties', listId: 'property-list', dataKey: 'properties' },
    testimonials: { api: 'testimonials', listId: 'testimonial-list', dataKey: 'testimonials' },
    blogs: { api: 'blogs', listId: 'blog-list', dataKey: 'blogs' },
    contacts: { api: 'contact', listId: 'contact-list', dataKey: 'contacts' },
};

const showLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');
    else console.error('Loader element not found');
};

const hideLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
    else console.error('Loader element not found');
};

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `
        max-w-xs w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex items-center gap-2
        transition-all duration-300 ease-in-out toast pointer-events-auto
        ${type === 'success' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}
    `;
    toast.innerHTML = `
        <svg class="w-6 h-6 ${type === 'success' ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${type === 'success' ? 
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' : 
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'}
        </svg>
        <span class="text-sm text-gray-800 dark:text-gray-200">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-slideOut');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let lastContactCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoader();
            const username = document.getElementById('username')?.value;
            const password = document.getElementById('password')?.value;
            const loginError = document.getElementById('login-error');

            if (!username || !password) {
                console.error('Login form fields missing');
                showToast('Please enter username and password', 'error');
                hideLoader();
                return;
            }

            try {
                const res = await fetchWithRetry(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Login failed');
                document.getElementById('login-section')?.classList.add('hidden');
                document.getElementById('dashboard-section')?.classList.remove('hidden');
                loadTab('dashboard', 1);
                startContactPolling();
                showToast('Logged in successfully', 'success');
            } catch (error) {
                console.error('Login error:', error.message);
                if (loginError) {
                    loginError.textContent = error.message;
                    loginError.classList.remove('hidden');
                }
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        });
    }

    document.getElementById('add-property-btn')?.addEventListener('click', () => editItem('properties'));
    document.getElementById('add-testimonial-btn')?.addEventListener('click', () => editItem('testimonials'));
    document.getElementById('add-blog-btn')?.addEventListener('click', () => editItem('blogs'));
    document.getElementById('add-contact-btn')?.addEventListener('click', () => editItem('contacts'));
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    window.location.reload();
    showToast('Logged out successfully', 'success');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        const tabContent = document.getElementById(`${btn.dataset.tab}-tab`);
        if (tabContent) tabContent.classList.remove('hidden');
        else console.error(`Tab content not found: ${btn.dataset.tab}-tab`);
        loadTab(btn.dataset.tab, 1);
    });
});

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            console.log(`Fetch attempt ${i + 1} for ${url}: Status ${res.status}`);
            return res;
        } catch (error) {
            if (i === retries - 1) throw new Error(`Fetch failed for ${url}: ${error.message}`);
            console.warn(`Fetch attempt ${i + 1} failed for ${url}: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function startContactPolling() {
    const checkNewContacts = async () => {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/contact?limit=1`);
            const data = await res.json();
            if (!res.ok) {
                console.error('Error polling contacts:', data.error);
                return;
            }
            const currentCount = data.total || 0;
            if (currentCount > lastContactCount && lastContactCount !== 0) {
                const audio = document.getElementById('beep-alert');
                if (audio) audio.play().catch(err => console.error('Audio play error:', err));
                updateContactBadge(currentCount - lastContactCount);
                showToast('New contact message received', 'success');
            }
            lastContactCount = currentCount;
            console.log(`Contact polling: Current count = ${currentCount}`);
        } catch (error) {
            console.error('Error polling contacts:', error.message);
        }
    };
    await checkNewContacts();
    setInterval(checkNewContacts, 30000);
}

function updateContactBadge(count) {
    const badge = document.getElementById('contacts-badge');
    const mobileBadge = document.getElementById('mobile-contacts-badge');
    if (badge && mobileBadge) {
        badge.textContent = count;
        mobileBadge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
        mobileBadge.classList.toggle('hidden', count === 0);
    } else {
        console.error('Badge elements not found');
    }
}

async function loadTab(tab, page = 1, limit = 10) {
    showLoader();
    const config = tabConfig[tab];
    if (!config) {
        console.error(`Invalid tab: ${tab}`);
        showToast(`Invalid tab: ${tab}`, 'error');
        hideLoader();
        return;
    }

    if (tab === 'dashboard') {
        await loadDashboard();
        hideLoader();
        return;
    }

    const container = document.getElementById(config.listId);
    const pagination = document.getElementById(`${tab}-pagination`);
    if (!container || !pagination) {
        console.error(`DOM elements missing: container=${config.listId}, pagination=${tab}-pagination`);
        showToast('Dashboard elements not found', 'error');
        hideLoader();
        return;
    }

    try {
        const res = await fetchWithRetry(`${API_BASE_URL}/${config.api}?page=${page}&limit=${limit}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to fetch ${tab}`);
        const items = data[config.dataKey];
        if (!Array.isArray(items)) {
            throw new Error(`Expected array for ${tab}, got ${typeof items}`);
        }
        console.log(`Loaded ${tab} data:`, JSON.stringify(items, null, 2));
        container.innerHTML = items.length
            ? items.map(item => createCard(tab, item)).join('')
            : `<p class="text-gray-600 dark:text-gray-400 text-center text-sm">No ${tab} found.</p>`;

        const { total, page: currentPage, pages } = data;
        pagination.innerHTML = `
            <button id="${tab}-prev" class="px-2 py-1 bg-gray-300 dark:bg-gray-700 rounded text-sm ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span class="text-sm">Page ${currentPage} of ${pages}</span>
            <button id="${tab}-next" class="px-2 py-1 bg-gray-300 dark:bg-gray-700 rounded text-sm ${currentPage === pages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === pages ? 'disabled' : ''}>Next</button>
        `;
        document.getElementById(`${tab}-prev`)?.addEventListener('click', () => loadTab(tab, currentPage - 1, limit));
        document.getElementById(`${tab}-next`)?.addEventListener('click', () => loadTab(tab, currentPage + 1, limit));
    } catch (error) {
        console.error(`Error loading ${tab}:`, error.message);
        container.innerHTML = `<p class="text-red-600 dark:text-red-400 text-center text-sm">${error.message}</p>`;
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function loadDashboard() {
    showLoader();
    const tabs = ['properties', 'blogs', 'contacts'];

    try {
        const visitorRes = await fetchWithRetry(`${API_BASE_URL}/visitors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const visitorData = await visitorRes.json();
        if (visitorRes.ok) {
            const statsVisitors = document.getElementById('stats-visitors');
            if (statsVisitors) statsVisitors.textContent = visitorData.dailyVisitors || 0;
        } else {
            console.error('Failed to fetch visitor count:', visitorData.error);
        }

        const propRes = await fetchWithRetry(`${API_BASE_URL}/properties?limit=1`);
        const propData = await propRes.json();
        if (propRes.ok) {
            const statsProperties = document.getElementById('stats-properties');
            if (statsProperties) statsProperties.textContent = propData.total || 0;
        } else {
            console.error('Failed to fetch properties count:', propData.error);
        }

        const messagesRes = await fetchWithRetry(`${API_BASE_URL}/contact?limit=1`);
        const messagesData = await messagesRes.json();
        if (messagesRes.ok) {
            const statsMessages = document.getElementById('stats-messages');
            if (statsMessages) statsMessages.textContent = messagesData.total || 0;
        } else {
            console.error('Failed to fetch messages count:', messagesData.error);
        }

        const blogRes = await fetchWithRetry(`${API_BASE_URL}/blogs?limit=1`);
        const blogData = await blogRes.json();
        if (blogRes.ok) {
            const statsBlogs = document.getElementById('stats-blogs');
            if (statsBlogs) statsBlogs.textContent = blogData.total || 0;
        } else {
            console.error('Failed to fetch blogs count:', blogData.error);
        }

        for (const tab of tabs) {
            const config = tabConfig[tab];
            const container = document.getElementById(`dashboard-${config.listId}`);
            if (!container) {
                console.error(`Dashboard container not found: dashboard-${config.listId}`);
                continue;
            }
            try {
                const res = await fetchWithRetry(`${API_BASE_URL}/${config.api}?page=1&limit=3`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Failed to fetch ${tab}`);
                const items = data[config.dataKey];
                if (!Array.isArray(items)) throw new Error(`Expected array for ${tab}`);
                console.log(`Loaded dashboard ${tab} data:`, JSON.stringify(items, null, 2));
                container.innerHTML = items.length
                    ? items.map(item => createCard(tab, item)).join('')
                    : `<p class="text-gray-600 dark:text-gray-400 text-center text-sm">No ${tab} found.</p>`;
            } catch (error) {
                console.error(`Error loading ${tab} for dashboard:`, error.message);
                container.innerHTML = `<p class="text-red-600 dark:text-red-400 text-center text-sm">${error.message}</p>`;
                showToast(`Failed to load ${tab} preview`, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error.message);
        showToast('Failed to load dashboard statistics', 'error');
    } finally {
        hideLoader();
    }
}

function createCard(type, item) {
    const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://intorealtors.onrender.com';
    
    // Validate image paths
    const mainImage = (item.image && typeof item.image === 'string' && item.image.trim() !== '')
        ? (item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`)
        : `${baseUrl}/Uploads/placeholder.jpg`;
    const additionalImages = Array.isArray(item.images)
        ? item.images.map(img => (img && typeof img === 'string' && img.trim() !== '') 
            ? (img.startsWith('http') ? img : `${baseUrl}${img}`) 
            : `${baseUrl}/Uploads/placeholder.jpg`)
        : [];
    
    console.log(`Creating card for ${type}, item:`, JSON.stringify(item, null, 2));
    console.log(`Main image URL: ${mainImage}`);
    console.log(`Additional images:`, additionalImages);

    if (type === 'properties') {
        return `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <img src="${mainImage}" alt="${item.alt || 'Property image'}" class="w-full h-40 sm:h-48 object-cover rounded-lg mb-3" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Image load failed for ${mainImage}, using placeholder')">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">${item.title || 'Untitled'}</h3>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">${item.location || 'Unknown'} - ${item.price || 'N/A'}</p>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Type: ${item.type || 'N/A'}</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button onclick="viewItem('properties', '${item._id}')" class="flex-1 px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300 text-xs sm:text-sm">View</button>
                    <button onclick="editItem('properties', '${item._id}')" class="flex-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 text-xs sm:text-sm">Edit</button>
                    <button onclick="showDeleteModal('properties', '${item._id}')" class="flex-1 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 text-xs sm:text-sm">Delete</button>
                </div>
            </div>
        `;
    } else if (type === 'testimonials') {
        return `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <img src="${mainImage}" alt="${item.alt || 'Testimonial image'}" class="w-full h-40 sm:h-48 object-cover rounded-lg mb-3" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Image load failed for ${mainImage}, using placeholder')">
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">"${item.quote || 'No quote provided'}"</p>
                <p class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white mt-2">${item.author || 'Anonymous'}</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button onclick="viewItem('testimonials', '${item._id}')" class="flex-1 px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300 text-xs sm:text-sm">View</button>
                    <button onclick="editItem('testimonials', '${item._id}')" class="flex-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 text-xs sm:text-sm">Edit</button>
                    <button onclick="showDeleteModal('testimonials', '${item._id}')" class="flex-1 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 text-xs sm:text-sm">Delete</button>
                </div>
            </div>
        `;
    } else if (type === 'blogs') {
        return `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <img src="${mainImage}" alt="${item.alt || 'Blog image'}" class="w-full h-40 sm:h-48 object-cover rounded-lg mb-3" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Image load failed for ${mainImage}, using placeholder')">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">${item.title || 'Untitled'}</h3>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">${item.description || 'No description'}</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button onclick="viewItem('blogs', '${item._id}')" class="flex-1 px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300 text-xs sm:text-sm">View</button>
                    <button onclick="editItem('blogs', '${item._id}')" class="flex-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 text-xs sm:text-sm">Edit</button>
                    <button onclick="showDeleteModal('blogs', '${item._id}')" class="flex-1 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 text-xs sm:text-sm">Delete</button>
                </div>
            </div>
        `;
    } else if (type === 'contacts') {
        return `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">${item.name || 'Unknown'}</h3>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Email: ${item.email || 'N/A'}</p>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Phone: ${item.phone || 'N/A'}</p>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Message: ${item.message || 'N/A'}</p>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Received: ${new Date(item.createdAt).toLocaleString()}</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button onclick="viewItem('contacts', '${item._id}')" class="flex-1 px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300 text-xs sm:text-sm">View</button>
                    <button onclick="editItem('contacts', '${item._id}')" class="flex-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 text-xs sm:text-sm">Edit</button>
                    <button onclick="showDeleteModal('contacts', '${item._id}')" class="flex-1 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 text-xs sm:text-sm">Delete</button>
                </div>
            </div>
        `;
    }
    return '';
}

function getViewContent(type, item) {
    const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://intorealtors.onrender.com';
    
    const mainImage = (item.image && typeof item.image === 'string' && item.image.trim() !== '')
        ? (item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`)
        : `${baseUrl}/Uploads/placeholder.jpg`;
    const additionalImages = Array.isArray(item.images)
        ? item.images.map(img => (img && typeof img === 'string' && img.trim() !== '') 
            ? (img.startsWith('http') ? img : `${baseUrl}${img}`) 
            : `${baseUrl}/Uploads/placeholder.jpg`)
        : [];
    
    console.log(`Rendering view for ${type}, item:`, JSON.stringify(item, null, 2));
    console.log(`Main image URL: ${mainImage}`);
    console.log(`Additional images:`, additionalImages);

    if (type === 'properties') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.type || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.price || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.title || 'Untitled'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.location || 'Unknown'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Image</label>
                <img src="${mainImage}" alt="${item.alt || 'Property image'}" class="w-full h-40 object-cover rounded-lg mt-1" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Image load failed for ${mainImage}, using placeholder')">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.description || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Features</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${(Array.isArray(item.features) ? item.features.join(', ') : item.features) || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Additional Images</label>
                ${additionalImages.length ? `
                    <div class="grid grid-cols-2 gap-2 mt-1">
                        ${additionalImages.map((img, index) => `
                            <img src="${img}" alt="${item.alt || 'Image'} ${index + 1}" class="w-full h-24 object-cover rounded-lg" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Additional image load failed for ${img}, using placeholder')">
                        `).join('')}
                    </div>
                ` : '<p class="text-sm text-gray-600 dark:text-gray-400">None</p>'}
            </div>
        `;
    } else if (type === 'testimonials') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Quote</label>
                <p class="text-sm text-gray-600 dark:text-gray-400 italic">"${item.quote || 'No quote provided'}"</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Author</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.author || 'Anonymous'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
                <img src="${mainImage}" alt="${item.alt || 'Testimonial image'}" class="w-full h-40 object-cover rounded-lg mt-1" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Image load failed for ${mainImage}, using placeholder')">
            </div>
        `;
    } else if (type === 'blogs') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.title || 'Untitled'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.description || 'No description'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.content || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
                <img src="${mainImage}" alt="${item.alt || 'Blog image'}" class="w-full h-40 object-cover rounded-lg mt-1" onerror="this.src='${baseUrl}/Uploads/placeholder.jpg'; console.error('Image load failed for ${mainImage}, using placeholder')">
            </div>
        `;
    } else if (type === 'contacts') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.name || 'Unknown'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.email || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.phone || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.message || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Received</label>
                <p class="text-sm text-gray-600 dark:text-gray-400">${new Date(item.createdAt).toLocaleString()}</p>
            </div>
        `;
    }
    return '';
}

async function viewItem(type, id) {
    showLoader();
    const modal = document.getElementById('view-modal');
    const modalTitle = document.getElementById('view-modal-title');
    const modalContent = document.getElementById('view-modal-content');
    if (!modal || !modalTitle || !modalContent) {
        console.error('View modal elements not found');
        showToast('Failed to open view modal', 'error');
        hideLoader();
        return;
    }

    try {
        const res = await fetchWithRetry(`${API_BASE_URL}/${tabConfig[type].api}/${id}`);
        const item = await res.json();
        if (!res.ok) throw new Error(item.error || `Failed to fetch ${type}`);
        modalTitle.textContent = `View ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        modalContent.innerHTML = getViewContent(type, item);
        modal.classList.remove('hidden');
    } catch (error) {
        console.error(`Error viewing ${type} (ID: ${id}):`, error.message);
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }

    const closeButton = document.getElementById('view-modal-close');
    if (closeButton) {
        closeButton.onclick = () => modal.classList.add('hidden');
    } else {
        console.error('View modal close button not found');
    }
}

async function editItem(type, id) {
    showLoader();
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalFields = document.getElementById('modal-fields');
    const modalForm = document.getElementById('modal-form');
    if (!modal || !modalTitle || !modalFields || !modalForm) {
        console.error('Edit modal elements not found');
        showToast('Failed to open edit modal', 'error');
        hideLoader();
        return;
    }

    let item = {};
    if (id) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/${tabConfig[type].api}/${id}`);
            item = await res.json();
            if (!res.ok) throw new Error(item.error || `Failed to fetch ${type}`);
            console.log(`Fetched ${type} for edit (ID: ${id}):`, JSON.stringify(item, null, 2));
        } catch (error) {
            console.error(`Error fetching ${type} for edit (ID: ${id}):`, error.message);
            showToast(error.message, 'error');
            hideLoader();
            return;
        }
    }

    modalTitle.textContent = id ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    modalFields.innerHTML = getFormFields(type, item);
    modal.classList.remove('hidden');

    if (['properties', 'testimonials', 'blogs'].includes(type)) {
        const fileInput = document.getElementById(`${type === 'properties' ? 'property-images' : type + '-image'}`);
        const previewContainer = document.getElementById('image-preview-container');
        if (!fileInput || !previewContainer) {
            console.error(`Image input or preview container not found for ${type}`);
            showToast('Form setup error', 'error');
            hideLoader();
            return;
        }

        let files = [];
        if (id && item.image) {
            files = type === 'properties' && item.images
                ? [{ url: item.image, alt: item.alt || '' }, ...item.images.map((img, index) => ({ url: img, alt: `${item.alt || 'Image'} ${index + 1}` }))]
                : [{ url: item.image, alt: item.alt || '' }];
            updateImagePreviews(files, previewContainer);
        }

        fileInput.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                url: URL.createObjectURL(file),
                alt: ''
            }));
            files = type === 'properties' ? [...files.filter(f => !f.file), ...newFiles] : [newFiles[0] || files[0]];
            updateImagePreviews(files, previewContainer);
            console.log(`Selected ${newFiles.length} files for ${type}:`, newFiles.map(f => f.file.name));
        });

        function updateImagePreviews(files, container) {
            container.innerHTML = '';
            files.forEach((fileObj, index) => {
                const preview = document.createElement('div');
                preview.className = 'image-preview';
                preview.innerHTML = `
                    <img src="${fileObj.url}" alt="${fileObj.alt || 'Preview'}">
                    <span class="remove-image cursor-pointer" data-index="${index}">×</span>
                `;
                container.appendChild(preview);
            });

            container.querySelectorAll('.remove-image').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    files.splice(index, 1);
                    updateImagePreviews(files, container);
                    console.log(`Removed image at index ${index}, remaining files:`, files.map(f => f.url));
                });
            });
        }
    }

    modalForm.onsubmit = async (e) => {
        e.preventDefault();
        showLoader();
        const formData = new FormData();
        const formElements = modalForm.elements;

        console.log(`Preparing ${type} form data for ${id ? 'update' : 'create'}:`);
        for (let element of formElements) {
            if (element.name && element.value && element.type !== 'file') {
                formData.append(element.name, element.value);
                console.log(`Field: ${element.name}, Value: ${element.value}`);
            }
        }

        if (type === 'properties') {
            const fileInput = document.getElementById('property-images');
            if (!id && (!fileInput || fileInput.files.length === 0)) {
                showToast('At least one image is required for new properties', 'error');
                hideLoader();
                return;
            }
            if (fileInput && fileInput.files.length > 0) {
                const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
                for (let file of fileInput.files) {
                    if (!validFormats.includes(file.type)) {
                        showToast(`Invalid file format: ${file.name}. Use JPEG, PNG, or GIF.`, 'error');
                        hideLoader();
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        showToast(`File ${file.name} exceeds 5MB limit.`, 'error');
                        hideLoader();
                        return;
                    }
                    formData.append('files', file);
                    console.log(`Appending file to 'files': ${file.name}, size: ${file.size} bytes`);
                }
            }
            const features = formData.get('features');
            if (features) {
                formData.set('features', features.split(',').map(f => f.trim()).filter(f => f));
            }
        } else if (['testimonials', 'blogs'].includes(type)) {
            const fileInput = document.getElementById(`${type}-image`);
            if (!id && (!fileInput || fileInput.files.length === 0)) {
                showToast(`An image is required for new ${type}`, 'error');
                hideLoader();
                return;
            }
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
                if (!validFormats.includes(file.type)) {
                    showToast(`Invalid file format: ${file.name}. Use JPEG, PNG, or GIF.`, 'error');
                    hideLoader();
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`File ${file.name} exceeds 5MB limit.`, 'error');
                    hideLoader();
                    return;
                }
                formData.append('image', file);
                console.log(`Appending file to 'image': ${file.name}, size: ${file.size} bytes`);
            }
        }

        try {
            const url = id ? `${API_BASE_URL}/${tabConfig[type].api}/${id}` : `${API_BASE_URL}/${tabConfig[type].api}`;
            const method = id ? 'PUT' : 'POST';
            const headers = type === 'contacts' ? { 'Content-Type': 'application/json' } : {};
            const body = type === 'contacts' ? JSON.stringify(Object.fromEntries(formData)) : formData;

            console.log(`Sending ${method} request to ${url} with FormData:`);
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value instanceof File ? value.name : value}`);
            }

            const res = await fetchWithRetry(url, { method, headers, body });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `Failed to ${id ? 'update' : 'create'} ${type}`);
            console.log(`Successfully ${id ? 'updated' : 'created'} ${type}:`, JSON.stringify(result, null, 2));
            modal.classList.add('hidden');
            modalForm.reset();
            loadTab(type, 1);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ${id ? 'updated' : 'created'} successfully`, 'success');
        } catch (error) {
            console.error(`Error submitting ${type} (ID: ${id || 'new'}):`, error.message);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    const cancelButton = document.getElementById('modal-cancel');
    if (cancelButton) {
        cancelButton.onclick = () => {
            modal.classList.add('hidden');
            modalForm.reset();
        };
    } else {
        console.error('Modal cancel button not found');
    }
    hideLoader();
}

function showDeleteModal(type, id) {
    const modal = document.getElementById('delete-modal');
    const message = document.getElementById('delete-modal-message');
    if (!modal || !message) {
        console.error('Delete modal elements not found');
        showToast('Failed to open delete modal', 'error');
        return;
    }
    message.textContent = `Are you sure you want to delete this ${type.slice(0, -1)}? This action cannot be undone.`;
    modal.classList.remove('hidden');

    const confirmButton = document.getElementById('delete-modal-confirm');
    const cancelButton = document.getElementById('delete-modal-cancel');
    if (!confirmButton || !cancelButton) {
        console.error('Delete modal buttons not found');
        showToast('Failed to set up delete modal', 'error');
        return;
    }

    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    document.getElementById('delete-modal-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('delete-modal-confirm').onclick = async () => {
        modal.classList.add('hidden');
        showLoader();
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/${tabConfig[type].api}/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to delete ${type}`);
            console.log(`Successfully deleted ${type} (ID: ${id})`);
            loadTab(type, 1);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`, 'success');
        } catch (error) {
            console.error(`Error deleting ${type} (ID: ${id}):`, error.message);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };
}

function getFormFields(type, item = {}) {
    const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://intorealtors.onrender.com';

    if (type === 'properties') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select name="type" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
                    <option value="sale" ${item.type === 'sale' ? 'selected' : ''}>Sale</option>
                    <option value="rent" ${item.type === 'rent' ? 'selected' : ''}>Rent</option>
                    <option value="shortlet" ${item.type === 'shortlet' ? 'selected' : ''}>Shortlet</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                <input name="price" type="text" value="${item.price || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input name="title" type="text" value="${item.title || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                <input name="location" type="text" value="${item.location || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Images (Select multiple, max 10)</label>
                <input id="property-images" name="files" type="file" multiple accept="image/jpeg,image/png,image/gif" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" ${!item._id ? 'required' : ''}>
                <div id="image-preview-container" class="image-preview-container"></div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Image Alt Text</label>
                <input name="alt" type="text" value="${item.alt || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea name="description" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm">${item.description || ''}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Features (comma-separated)</label>
                <input name="features" type="text" value="${(Array.isArray(item.features) ? item.features.join(', ') : item.features) || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm">
            </div>
        `;
    } else if (type === 'testimonials') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Quote</label>
                <textarea name="quote" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>${item.quote || ''}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Author</label>
                <input name="author" type="text" value="${item.author || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
                <input id="testimonials-image" name="image" type="file" accept="image/jpeg,image/png,image/gif" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" ${!item._id ? 'required' : ''}>
                <div id="image-preview-container" class="image-preview-container"></div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Alt Text</label>
                <input name="alt" type="text" value="${item.alt || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
        `;
    } else if (type === 'blogs') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input name="title" type="text" value="${item.title || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea name="description" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>${item.description || ''}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                <textarea name="content" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>${item.content || ''}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
                <input id="blogs-image" name="image" type="file" accept="image/jpeg,image/png,image/gif" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" ${!item._id ? 'required' : ''}>
                <div id="image-preview-container" class="image-preview-container"></div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Alt Text</label>
                <input name="alt" type="text" value="${item.alt || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
        `;
    } else if (type === 'contacts') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input name="name" type="text" value="${item.name || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input name="email" type="email" value="${item.email || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input name="phone" type="text" value="${item.phone || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                <textarea name="message" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A3C] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" required>${item.message || ''}</textarea>
            </div>
        `;
    }
    return '';
}
