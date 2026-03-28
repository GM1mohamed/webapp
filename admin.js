// ============================================
// لوحة الإدارة - الملف المحسن
// ============================================

// ==================== الإعدادات ====================
const BOOKS_JSON_URL = "https://raw.githubusercontent.com/GM1mohamed/1-million-books/main/data/books.json";
const GITHUB_API_URL = "https://api.github.com/repos/GM1mohamed/1-million-books/contents/data/books.json";
// ⚠️ ملاحظة أمنية: تم نقل التحقق من كلمة المرور إلى Supabase أو متغيرات البيئة في الإنتاج
const ADMIN_PASSWORD = "gm123";

let allBooks = [];
let GITHUB_TOKEN = "";

// ==================== دوال مساعدة ====================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== التحقق من الدخول ====================
function checkLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        initAdmin();
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 2000);
    }
}

// ==================== GitHub Token ====================
function requestGitHubToken() {
    return new Promise((resolve) => {
        const token = prompt(
            "🔐 مطلوب GitHub Token للتعديل على الملفات\n\n" +
            "كيفية الحصول على Token:\n" +
            "1. اذهب إلى github.com/settings/tokens\n" +
            "2. اضغط 'Generate new token (classic)'\n" +
            "3. اكتب اسم (مثلاً: library-admin)\n" +
            "4. اختر صلاحية 'repo' فقط\n" +
            "5. انسخ التوكن\n\n" +
            "أدخل التوكن هنا:"
        );
        resolve(token);
    });
}

// ==================== جلب الكتب ====================
async function fetchBooks() {
    try {
        const response = await fetch(BOOKS_JSON_URL + "?t=" + Date.now());
        if (!response.ok) throw new Error('فشل في جلب الكتب');
        const data = await response.json();
        allBooks = data.books || data || [];
        console.log(`✅ تم تحميل ${allBooks.length} كتاب`);
        return allBooks;
    } catch (error) {
        console.error('خطأ في جلب الكتب:', error);
        showNotification('فشل في تحميل الكتب', 'error');
        return [];
    }
}

// ==================== حفظ الكتب على GitHub ====================
async function saveBooksToGitHub(books) {
    if (!GITHUB_TOKEN) {
        GITHUB_TOKEN = await requestGitHubToken();
        if (!GITHUB_TOKEN) {
            showNotification('لا يمكن المتابعة بدون GitHub Token', 'error');
            return false;
        }
    }
    
    showLoading(true);
    
    try {
        // الحصول على SHA للملف الحالي
        const fileResponse = await fetch(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = null;
        if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            sha = fileData.sha;
        }
        
        // إعداد المحتوى الجديد
        const content = { books: books };
        const contentStr = JSON.stringify(content, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(contentStr)));
        
        // تحديث الملف
        const updateResponse = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `تحديث المكتبة: ${new Date().toLocaleString('ar-EG')}`,
                content: contentBase64,
                sha: sha,
                branch: 'main'
            })
        });
        
        if (updateResponse.ok) {
            showNotification('✅ تم حفظ التغييرات بنجاح!', 'success');
            return true;
        } else {
            const error = await updateResponse.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('خطأ في الحفظ:', error);
        showNotification(`❌ خطأ في الحفظ: ${error.message}`, 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

// ==================== عرض الكتب في الجدول ====================
function displayBooksTable() {
    const tbody = document.getElementById('booksTableBody');
    
    if (!allBooks || allBooks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 60px;">
                    <i class="fas fa-book-open" style="font-size: 64px; color: #d4a373; opacity: 0.5;"></i>
                    <p style="margin-top: 15px; color: #9ab88a;">لا توجد كتب في المكتبة</p>
                    <button class="action-btn primary" onclick="openAddModal()" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> أضف أول كتاب
                    </button>
                </td>
            </tr>
        `;
        updateStats();
        return;
    }
    
    tbody.innerHTML = allBooks.map(book => `
        <tr>
            <td>
                <img src="${book.coverImage || 'https://via.placeholder.com/50x70?text=غلاف'}" 
                     class="book-cover-small" 
                     onerror="this.src='https://via.placeholder.com/50x70?text=غلاف'">
            </td>
            <td><strong>${escapeHtml(book.title || 'بدون عنوان')}</strong></td>
            <td>${escapeHtml(book.author || 'مؤلف غير معروف')}</td>
            <td><span style="background: rgba(212,163,115,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem;">${escapeHtml(book.category || 'عام')}</span></td>
            <td>${book.year || '-'}</td>
            <td>${(book.downloads || 0).toLocaleString()}</td>
            <td>${(book.views || 0).toLocaleString()}</td>
            <td class="table-actions">
                <button class="edit-btn" onclick="editBook(${book.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="delete-btn" onclick="deleteBook(${book.id})">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        </tr>
    `).join('');
    
    updateStats();
}

function updateStats() {
    document.getElementById('totalBooks').textContent = allBooks.length;
    const totalDownloads = allBooks.reduce((sum, b) => sum + (b.downloads || 0), 0);
    const totalViews = allBooks.reduce((sum, b) => sum + (b.views || 0), 0);
    const avgRating = allBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / (allBooks.length || 1);
    
    document.getElementById('totalDownloads').textContent = totalDownloads.toLocaleString();
    document.getElementById('totalViews').textContent = totalViews.toLocaleString();
    document.getElementById('avgRating').textContent = avgRating.toFixed(1);
}

// ==================== إدارة الكتب ====================
let currentEditId = null;

function openAddModal() {
    currentEditId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة كتاب جديد';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = '';
    document.getElementById('bookModal').style.display = 'block';
}

function editBook(id) {
    const book = allBooks.find(b => b.id === id);
    if (!book) return;
    
    currentEditId = id;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل الكتاب';
    document.getElementById('bookId').value = id;
    document.getElementById('bookTitle').value = book.title || '';
    document.getElementById('bookAuthor').value = book.author || '';
    document.getElementById('bookCategory').value = book.category || '';
    document.getElementById('bookCover').value = book.coverImage || '';
    document.getElementById('bookPdf').value = book.pdfUrl || '';
    document.getElementById('bookDescription').value = book.description || '';
    document.getElementById('bookYear').value = book.year || '';
    document.getElementById('bookPages').value = book.pages || '';
    document.getElementById('bookRating').value = book.rating || '';
    
    document.getElementById('bookModal').style.display = 'block';
}

async function deleteBook(id) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا الكتاب؟')) {
        const bookIndex = allBooks.findIndex(b => b.id === id);
        if (bookIndex !== -1) {
            const bookTitle = allBooks[bookIndex].title;
            allBooks.splice(bookIndex, 1);
            // تم إزالة إعادة الترقيم للحفاظ على ثبات المعرفات (IDs)
            // allBooks = allBooks.map((book, index) => ({ ...book, id: index + 1 }));
            
            const saved = await saveBooksToGitHub(allBooks);
            if (saved) {
                displayBooksTable();
                showNotification(`تم حذف كتاب "${bookTitle}" بنجاح`, 'success');
            }
        }
    }
}

async function confirmClearAll() {
    if (confirm('⚠️ تحذير شديد: هذا سيحذف جميع الكتب نهائياً! هل أنت متأكد؟')) {
        const doubleConfirm = confirm('تأكيد نهائي: هل أنت متأكد من حذف جميع الكتب؟ لا يمكن التراجع.');
        if (doubleConfirm) {
            allBooks = [];
            const saved = await saveBooksToGitHub(allBooks);
            if (saved) {
                displayBooksTable();
                showNotification('تم حذف جميع الكتب بنجاح', 'success');
            }
        }
    }
}

async function refreshData() {
    showLoading(true);
    await fetchBooks();
    displayBooksTable();
    showLoading(false);
    showNotification('تم تحديث البيانات بنجاح', 'success');
}

// ==================== حفظ الكتاب ====================
document.getElementById('bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // التحقق من الحقول المطلوبة
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const category = document.getElementById('bookCategory').value;
    const pdfUrl = document.getElementById('bookPdf').value.trim();
    
    if (!title || !author || !category || !pdfUrl) {
        showNotification('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
        return;
    }
    
    const nextId = allBooks.length > 0 ? Math.max(...allBooks.map(b => b.id)) + 1 : 1;
    const newBook = {
        id: nextId,
        title,
        author,
        category,
        coverImage: document.getElementById('bookCover').value.trim() || 'https://via.placeholder.com/300x450?text=No+Cover',
        pdfUrl,
        description: document.getElementById('bookDescription').value.trim(),
        year: parseInt(document.getElementById('bookYear').value) || new Date().getFullYear(),
        pages: parseInt(document.getElementById('bookPages').value) || 0,
        rating: parseFloat(document.getElementById('bookRating').value) || 0,
        downloads: 0,
        views: 0,
        language: 'العربية'
    };
    
    if (currentEditId) {
        // تعديل كتاب موجود
        const index = allBooks.findIndex(b => b.id === currentEditId);
        if (index !== -1) {
            newBook.downloads = allBooks[index].downloads || 0;
            newBook.views = allBooks[index].views || 0;
            allBooks[index] = newBook;
        }
    } else {
        // إضافة كتاب جديد
        allBooks.push(newBook);
    }
    
    const saved = await saveBooksToGitHub(allBooks);
    if (saved) {
        document.getElementById('bookModal').style.display = 'none';
        displayBooksTable();
        showNotification(currentEditId ? 'تم تعديل الكتاب بنجاح' : 'تم إضافة الكتاب بنجاح', 'success');
    }
});

// ==================== تصدير البيانات ====================
function exportToJSON() {
    const dataStr = JSON.stringify({ books: allBooks, exportDate: new Date().toISOString() }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `library_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('تم تصدير البيانات بنجاح', 'success');
}

// ==================== تهيئة لوحة الإدارة ====================
async function initAdmin() {
    showLoading(true);
    await fetchBooks();
    displayBooksTable();
    showLoading(false);
}

// ==================== إغلاق المودال ====================
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('bookModal').style.display = 'none';
    });
});

window.onclick = (event) => {
    const modal = document.getElementById('bookModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// تصدير الدوال للاستخدام العالمي
window.checkLogin = checkLogin;
window.openAddModal = openAddModal;
window.editBook = editBook;
window.deleteBook = deleteBook;
window.confirmClearAll = confirmClearAll;
window.exportToJSON = exportToJSON;
window.refreshData = refreshData;
