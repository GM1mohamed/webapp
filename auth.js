// ============================================
// نظام المصادقة - Supabase
// ============================================

// 🔴 هام: استبدل هذه القيم من لوحة تحكم Supabase (Settings -> API)
const SUPABASE_URL = 'https://bemrtrdugxzvikrsjrci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlbXJ0cmR1Z3h6dmlrcnNqcmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjUwMjIsImV4cCI6MjA5MDIwMTAyMn0.aVuG7FPbwnFWNP4a7ZvSisjCNRTAipjlHBa8kKTmYDA';

// تهيئة عميل Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// دوال مساعدة
// ============================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ============================================
// دوال المصادقة الأساسية
// ============================================

// 1. إنشاء حساب جديد (سيرسل بريد تأكيد تلقائياً)
async function registerUser(email, password, username) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    display_name: username
                }
            }
        });

        if (error) throw error;

        if (data.user && data.session === null) {
            showNotification('✅ تم إنشاء الحساب! يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب.', 'success');
            return { success: true, message: 'تأكيد البريد مطلوب' };
        }

        return { success: true, user: data.user };
    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, message: error.message };
    }
}

// 2. تسجيل الدخول
async function loginUser(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        showNotification('تم تسجيل الدخول بنجاح', 'success');
        return { success: true, user: data.user };
    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, message: error.message };
    }
}

// 3. طلب إعادة تعيين كلمة المرور
async function requestPasswordReset(email) {
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password.html',
        });

        if (error) throw error;

        showNotification('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.', 'success');
        return { success: true };
    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, message: error.message };
    }
}

// 4. تحديث كلمة المرور (بعد الضغط على الرابط في البريد)
async function updatePassword(newPassword) {
    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showNotification('✅ تم تحديث كلمة المرور بنجاح.', 'success');
        return { success: true };
    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, message: error.message };
    }
}

// 5. تسجيل الخروج
async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
    }
}

// 6. التحقق من حالة الدخول
async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

// 7. الحصول على بيانات المستخدم الحالي
async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}