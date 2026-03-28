// ============================================
// المكتبة الإلكترونية - الملف الرئيسي (المحسن)
// ============================================

// ==================== الإعدادات الأساسية ====================
const BOOKS_JSON_URL = "data/books.json"; // استخدام المسار المحلي كافتراضي
const REMOTE_BOOKS_URL = "https://raw.githubusercontent.com/GM1mohamed/1-million-books/main/data/books.json";
const BOOKS_PER_PAGE = 12;

// ==================== المتغيرات العامة ====================
let allBooks = [];           // جميع الكتب من JSON
let filteredBooks = [];      // الكتب بعد التصفية والبحث
let currentPage = 1;         // الصفحة الحالية
let currentCategory = 'all'; // التصنيف الحالي
let currentSearch = '';      // نص البحث
let currentSort = 'newest';  // نوع الترتيب
let currentView = 'grid';    // عرض شبكي أو قائمة

// ==================== دوال مساعدة ====================

/**
 * إظهار إشعار للمستخدم
 * @param {string} message - نص الإشعار
 * @param {string} type - نوع الإشعار (success, error, info)
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * منع هجمات XSS
 * @param {string} str - النص المراد تنظيفه
 * @returns {string} - النص الآمن
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * تحديث الإحصائيات في الشريط العلوي
 */
function updateStats() {
    const booksCountElem = document.getElementById('booksCount');
    const totalDownloadsElem = document.getElementById('totalDownloads');
    const totalViewsElem = document.getElementById('totalViews');
    
    if (booksCountElem) booksCountElem.textContent = filteredBooks.length;
    
    const totalDownloads = filteredBooks.reduce((sum, book) => sum + (book.downloads || 0), 0);
    const totalViews = filteredBooks.reduce((sum, book) => sum + (book.views || 0), 0);
    
    if (totalDownloadsElem) totalDownloadsElem.textContent = totalDownloads.toLocaleString();
    if (totalViewsElem) totalViewsElem.textContent = totalViews.toLocaleString();
}

/**
 * تحديث قائمة التصنيفات في السايدبار
 */
function updateCategoriesList() {
    // حساب عدد الكتب في كل تصنيف
    const categoryCount = {};
    allBooks.forEach(book => {
        const cat = book.category || 'غير مصنف';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    // تحديث القائمة في السايدبار
    const categoriesList = document.getElementById('categoriesList');
    if (categoriesList) {
        let html = `
            <div class="category-item ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">
                <i class="fas fa-layer-group"></i>
                <span>جميع الكتب</span>
                <span class="category-count">${allBooks.length}</span>
            </div>
        `;
        
        // ترتيب التصنيفات أبجدياً
        Object.keys(categoryCount).sort().forEach(cat => {
            const isActive = currentCategory === cat;
            html += `
                <div class="category-item ${isActive ? 'active' : ''}" onclick="filterByCategory('${cat.replace(/'/g, "\\'")}')">
                    <i class="fas fa-tag"></i>
                    <span>${escapeHtml(cat)}</span>
                    <span class="category-count">${categoryCount[cat]}</span>
                </div>
            `;
        });
        
        categoriesList.innerHTML = html;
    }
    
    // تحديث قائمة التصنيفات المنسدلة
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        let options = '<option value="all">جميع التصنيفات</option>';
        Object.keys(categoryCount).sort().forEach(cat => {
            options += `<option value="${cat.replace(/'/g, "\\'")}" ${currentCategory === cat ? 'selected' : ''}>${escapeHtml(cat)} (${categoryCount[cat]})</option>`;
        });
        categoryFilter.innerHTML = options;
    }
}

/**
 * عرض أزرار الترقيم
 */
function displayPagination() {
    const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
    const paginationDiv = document.getElementById('pagination');
    
    if (!paginationDiv || totalPages <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // زر السابق
    html += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i> السابق
    </button>`;
    
    // أرقام الصفحات
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span>...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button onclick="changePage(${i})" class="${currentPage === i ? 'active' : ''}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span>...</span>`;
        html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // زر التالي
    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        التالي <i class="fas fa-chevron-left"></i>
    </button>`;
    
    paginationDiv.innerHTML = html;
}

/**
 * تغيير الصفحة
 * @param {number} page - رقم الصفحة الجديدة
 */
function changePage(page) {
    const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== التصفية والفرز ====================

/**
 * تطبيق التصفية والبحث والترتيب على الكتب
 */
function applyFilters() {
    let result = [...allBooks];
    
    // تطبيق البحث (حسب العنوان أو المؤلف)
    if (currentSearch && currentSearch.trim() !== '') {
        const searchTerm = currentSearch.trim().toLowerCase();
        result = result.filter(book => 
            (book.title && book.title.toLowerCase().includes(searchTerm)) || 
            (book.author && book.author.toLowerCase().includes(searchTerm)) ||
            (book.category && book.category.toLowerCase().includes(searchTerm))
        );
    }
    
    // تطبيق التصنيف
    if (currentCategory !== 'all') {
        result = result.filter(book => book.category === currentCategory);
    }
    
    // تطبيق الترتيب
    switch(currentSort) {
        case 'newest': // الأحدث
            result.sort((a, b) => (b.year || 0) - (a.year || 0));
            break;
        case 'oldest': // الأقدم
            result.sort((a, b) => (a.year || 0) - (b.year || 0));
            break;
        case 'title': // حسب العنوان
            result.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ar'));
            break;
        case 'popular': // الأكثر تحميلاً
            result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
            break;
        case 'rating': // الأعلى تقييماً
            result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        default:
            result.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
    
    filteredBooks = result;
    currentPage = 1; // إعادة تعيين الصفحة عند تغيير التصفية
    
    // تحديث الواجهة
    displayBooks();
    updateStats();
    updateCategoriesList();
}

/**
 * عرض الكتب في الواجهة
 */
function displayBooks() {
    const container = document.getElementById('booksContainer');
    if (!container) return;
    
    // حساب الكتب المطلوبة للصفحة الحالية
    const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    const booksToShow = filteredBooks.slice(startIndex, endIndex);
    
    // حالة عدم وجود كتب
    if (booksToShow.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-book-open" style="font-size: 64px; opacity: 0.5;"></i>
                <h3 style="margin-top: 20px;">لا توجد كتب مطابقة</h3>
                <p style="margin-top: 10px; color: #9ab88a;">حاول تغيير معايير البحث أو التصفية</p>
                <button onclick="resetAllFilters()" class="nav-btn" style="margin-top: 20px;">
                    <i class="fas fa-undo-alt"></i> إعادة تعيين الفلاتر
                </button>
            </div>
        `;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    // تعيين نوع العرض
    container.className = currentView === 'grid' ? 'books-grid' : 'books-list';
    
    // عرض الكتب
    container.innerHTML = booksToShow.map(book => `
        <div class="book-card" onclick="openBookModal(${book.id})">
            <div class="book-cover">
                ${book.coverImage && book.coverImage !== '' && !book.coverImage.includes('placeholder') && !book.coverImage.includes('google.com/imgres') ? 
                    `<img src="${book.coverImage}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\'fas fa-book-open\'></i>'">` : 
                    `<i class="fas fa-book-open"></i>`
                }
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title || 'بدون عنوان')}</div>
                <div class="book-author">
                    <i class="fas fa-user"></i> ${escapeHtml(book.author || 'مؤلف غير معروف')}
                </div>
                <div class="book-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${book.year || 'غير محدد'}</span>
                    <span><i class="fas fa-star" style="color: #f5a623;"></i> ${book.rating || '0'}</span>
                    <span><i class="fas fa-download"></i> ${(book.downloads || 0).toLocaleString()}</span>
                </div>
                <div class="book-category">
                    <i class="fas fa-tag"></i> ${escapeHtml(book.category || 'عام')}
                </div>
            </div>
        </div>
    `).join('');
    
    // عرض أزرار الترقيم
    displayPagination();
}

// ==================== تفاعلات المستخدم ====================

/**
 * التصفية حسب التصنيف
 * @param {string} category - اسم التصنيف
 */
function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;
    
    // تحديث واجهة السايدبار
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // تحديث القائمة المنسدلة
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = category;
    
    applyFilters();
    
    // إغلاق السايدبار في الشاشات الصغيرة
    const sidebar = document.getElementById('categoriesSidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

/**
 * إعادة تعيين جميع الفلاتر
 */
function resetAllFilters() {
    currentCategory = 'all';
    currentSearch = '';
    currentSort = 'newest';
    currentPage = 1;
    
    // إعادة تعيين قيم المدخلات
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) sortSelect.value = 'newest';
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = 'all';
    
    applyFilters();
    showNotification('تم إعادة تعيين جميع الفلاتر', 'success');
}

/**
 * فتح نافذة تفاصيل الكتاب
 * @param {number} bookId - معرف الكتاب
 */
function openBookModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    const modal = document.getElementById('bookModal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    // تحديث عدد المشاهدات
    book.views = (book.views || 0) + 1;
    
    modalBody.innerHTML = `
        <div class="book-details">
            <div class="book-details-cover">
                ${book.coverImage && book.coverImage !== '' && !book.coverImage.includes('placeholder') && !book.coverImage.includes('google.com/imgres') ? 
                    `<img src="${book.coverImage}" alt="${escapeHtml(book.title)}" onerror="this.src='https://via.placeholder.com/300x400?text=غلاف+الكتاب'">` : 
                    `<i class="fas fa-book-open" style="font-size: 80px; color: #d4a373;"></i>`
                }
            </div>
            <div class="book-details-info">
                <h2>${escapeHtml(book.title)}</h2>
                <p class="author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</p>
                <p class="category"><i class="fas fa-tag"></i> ${escapeHtml(book.category || 'غير مصنف')}</p>
                
                <div class="details-meta">
                    <span><i class="fas fa-calendar-alt"></i> سنة النشر: ${book.year || 'غير محدد'}</span>
                    <span><i class="fas fa-file-alt"></i> عدد الصفحات: ${book.pages || 'غير محدد'}</span>
                    <span><i class="fas fa-star" style="color: #f5a623;"></i> التقييم: ${book.rating || '0'}/5</span>
                </div>
                
                <div class="details-stats">
                    <span><i class="fas fa-download"></i> مرات التحميل: ${(book.downloads || 0).toLocaleString()}</span>
                    <span><i class="fas fa-eye"></i> المشاهدات: ${(book.views || 0).toLocaleString()}</span>
                </div>
                
                ${book.description ? `
                    <div class="description">
                        <h4><i class="fas fa-align-right"></i> عن الكتاب</h4>
                        <p>${escapeHtml(book.description)}</p>
                    </div>
                ` : ''}
                
                <div class="book-actions">
                    ${book.pdfUrl && book.pdfUrl !== '' && !book.pdfUrl.includes('google.com') && !book.pdfUrl.includes('imgres') ? 
                        `<a href="${book.pdfUrl}" target="_blank" class="download-btn" onclick="updateDownloads(${book.id})">
                            <i class="fas fa-download"></i> تحميل الكتاب
                        </a>` : 
                        `<button class="download-btn disabled" disabled>
                            <i class="fas fa-ban"></i> الكتاب غير متاح للتحميل
                        </button>`
                    }
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

/**
 * تحديث عدد التحميلات عند تحميل الكتاب
 * @param {number} bookId - معرف الكتاب
 */
function updateDownloads(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (book) {
        book.downloads = (book.downloads || 0) + 1;
        // تحديث العرض إذا كان الكتاب ظاهراً
        displayBooks();
    }
}

/**
 * إغلاق نافذة التفاصيل
 */
function closeModal() {
    const modal = document.getElementById('bookModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==================== جلب البيانات ====================

/**
 * جلب الكتب من ملف JSON على GitHub
 */
async function fetchBooks() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    try {
        // محاولة جلب البيانات من المسار المحلي أولاً
        let response = await fetch(BOOKS_JSON_URL + "?t=" + Date.now());
        
        // إذا فشل المحلي، نحاول البعيد
        if (!response.ok) {
            console.warn('Local books.json not found, trying remote...');
            response = await fetch(REMOTE_BOOKS_URL + "?t=" + Date.now());
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allBooks = data.books || data || [];
        
        console.log(`✅ تم تحميل ${allBooks.length} كتاب بنجاح`);
        showNotification(`تم تحميل ${allBooks.length} كتاب`, 'success');
        
        return allBooks;
    } catch (error) {
        console.error('❌ خطأ في تحميل الكتب:', error);
        showNotification('فشل في تحميل الكتب. يرجى التأكد من تشغيل المشروع عبر خادم (Server)', 'error');
        
        // عرض رسالة خطأ في واجهة المستخدم
        const container = document.getElementById('booksContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="text-align: center; grid-column: 1/-1; padding: 60px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #d4a373;"></i>
                    <h3 style="margin-top: 20px;">فشل في تحميل الكتب</h3>
                    <p style="margin-top: 10px; color: #9ab88a;">يرجى التحقق من اتصال الإنترنت وإعادة المحاولة</p>
                    <button onclick="location.reload()" class="nav-btn" style="margin-top: 20px;">
                        <i class="fas fa-sync-alt"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
        
        return [];
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// ==================== تبديل العرض ====================

/**
 * تبديل العرض إلى شبكي
 */
function setGridView() {
    currentView = 'grid';
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    
    if (gridBtn) gridBtn.classList.add('active');
    if (listBtn) listBtn.classList.remove('active');
    
    displayBooks();
}

/**
 * تبديل العرض إلى قائمة
 */
function setListView() {
    currentView = 'list';
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    
    if (listBtn) listBtn.classList.add('active');
    if (gridBtn) gridBtn.classList.remove('active');
    
    displayBooks();
}

// ==================== تهيئة التطبيق ====================

/**
 * تهيئة التطبيق بالكامل
 */
async function init() {
    // جلب الكتب
    await fetchBooks();
    
    // تطبيق التصفية الأولية
    applyFilters();
    
    // إضافة مستمعي الأحداث
    setupEventListeners();
    
    // إزالة شاشة اللوغو بعد التحميل
    setTimeout(() => {
        const splash = document.getElementById('logoSplash');
        if (splash) splash.style.display = 'none';
    }, 2000);
}

/**
 * إعداد مستمعي الأحداث
 */
function setupEventListeners() {
    // بحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            applyFilters();
        });
    }
    
    // ترتيب
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFilters();
        });
    }
    
    // تصفية (من القائمة المنسدلة)
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filterByCategory(e.target.value);
        });
    }
    
    // تبديل العرض
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    if (gridBtn) gridBtn.addEventListener('click', setGridView);
    if (listBtn) listBtn.addEventListener('click', setListView);
    
    // فتح/إغلاق سايدبار التصنيفات
    const categoryBtn = document.getElementById('categoryBtn');
    const sidebar = document.getElementById('categoriesSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    
    if (categoryBtn && sidebar) {
        categoryBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }
    
    if (closeSidebar && sidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
    
    // إغلاق السايدبار عند النقر خارجها
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('categoriesSidebar');
        const categoryBtn = document.getElementById('categoryBtn');
        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !categoryBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
    
    // إغلاق المودال
    const modal = document.getElementById('bookModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    // زر العودة للرئيسية (اللوغو)
    const logoHome = document.getElementById('logoHome');
    if (logoHome) {
        logoHome.addEventListener('click', resetAllFilters);
    }
    
    // زر إعادة تعيين الفلاتر
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
    }
}

// ==================== تصدير الدوال للاستخدام العالمي ====================
window.filterByCategory = filterByCategory;
window.openBookModal = openBookModal;
window.changePage = changePage;
window.resetAllFilters = resetAllFilters;
window.updateDownloads = updateDownloads;
window.closeModal = closeModal;
window.setGridView = setGridView;
window.setListView = setListView;

// بدء التطبيق عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
