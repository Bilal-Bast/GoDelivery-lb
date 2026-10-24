(() => {
	const translations = {
		"Website language": "لغة الموقع",
		"Language": "اللغة",
		"Dashboard": "لوحة التحكم",
		"Admin Dashboard": "لوحة تحكم المسؤول",
		"Settings": "الإعدادات",
		"Profile Settings": "إعدادات الملف الشخصي",
		"Profile Information": "معلومات الملف الشخصي",
		"Manage your account credentials.": "إدارة بيانات اعتماد حسابك.",
		"Manage your account settings.": "إدارة إعدادات حسابك.",
		"English": "الإنجليزية",
		"Logout": "تسجيل الخروج",
		"Menu": "القائمة",
		"Driver Menu": "قائمة السائق",
		"Merchant Menu": "قائمة التاجر",
		"Users": "المستخدمون",
		"Orders": "الطلبات",
		"Order": "طلب",
		"Order ID": "رقم الطلب",
		"Order Number": "رقم الطلب",
		"Assigned Orders": "الطلبات المسندة",
		"Orders Management": "إدارة الطلبات",
		"Orders List": "قائمة الطلبات",
		"Create New Order": "إنشاء طلب جديد",
		"New Order": "طلب جديد",
		"Submit Order": "إرسال الطلب",
		"View Assigned Orders": "عرض الطلبات المسندة",
		"View All": "عرض الكل",
		"View All Orders": "عرض كل الطلبات",
		"Recent Orders": "الطلبات الأخيرة",
		"Dispatch Planning": "تخطيط التوزيع",
		"Live Driver Tracking": "تتبع السائقين المباشر",
		"Collect Money": "تحصيل الأموال",
		"Pay Merchants": "دفع مستحقات التجار",
		"Return Orders": "إرجاع الطلبات",
		"Analytics": "التحليلات",
		"Sales Analytics": "تحليلات المبيعات",
		"Finance Center": "المركز المالي",
		"Balance": "الرصيد",
		"Balances": "الأرصدة",
		"Payments": "المدفوعات",
		"Payment Sessions": "جلسات الدفع",
		"Payment Sessions History": "سجل جلسات الدفع",
		"Collection Sessions": "جلسات التحصيل",
		"Add New Account": "إضافة حساب جديد",
		"Add New Location": "إضافة موقع جديد",
		"Add Account": "إضافة حساب",
		"Add Admin": "إضافة مسؤول",
		"Add Merchant": "إضافة تاجر",
		"Add Driver": "إضافة سائق",
		"Add Admin Account": "إضافة حساب مسؤول",
		"Add Merchant Account": "إضافة حساب تاجر",
		"Add Driver Account": "إضافة حساب سائق",
		"Save": "حفظ",
		"Save Changes": "حفظ التغييرات",
		"Save Location": "حفظ الموقع",
		"Cancel": "إلغاء",
		"Close": "إغلاق",
		"Delete": "حذف",
		"Edit": "تعديل",
		"Update": "تحديث",
		"Update Password": "تحديث كلمة المرور",
		"Change Password": "تغيير كلمة المرور",
		"New Password": "كلمة المرور الجديدة",
		"Confirm Password": "تأكيد كلمة المرور",
		"Confirm new password": "تأكيد كلمة المرور الجديدة",
		"Enter new password": "أدخل كلمة المرور الجديدة",
		"Search": "بحث",
		"Refresh": "تحديث",
		"Clear": "مسح",
		"Clear Filters": "مسح عوامل التصفية",
		"Next": "التالي",
		"Prev": "السابق",
		"Previous": "السابق",
		"Submit": "إرسال",
		"Confirm": "تأكيد",
		"Confirm Pick Up": "تأكيد الاستلام",
		"Loading...": "جارٍ التحميل...",
		"Loading…": "جارٍ التحميل…",
		"Loading orders...": "جارٍ تحميل الطلبات...",
		"Loading your orders...": "جارٍ تحميل طلباتك...",
		"Loading balance…": "جارٍ تحميل الرصيد…",
		"Loading suggested sequence…": "جارٍ تحميل التسلسل المقترح…",
		"No orders found.": "لم يتم العثور على طلبات.",
		"No orders found": "لم يتم العثور على طلبات",
		"No notifications": "لا توجد إشعارات",
		"No payment sessions recorded yet.": "لم يتم تسجيل جلسات دفع بعد.",
		"Select a merchant to view orders": "اختر تاجراً لعرض الطلبات",
		"All Status": "كل الحالات",
		"Status": "الحالة",
		"Date": "التاريخ",
		"Time": "الوقت",
		"Date Range": "النطاق الزمني",
		"Location": "الموقع",
		"District": "المنطقة",
		"City": "المدينة",
		"City (En)": "المدينة (بالإنجليزية)",
		"City (Ar)": "المدينة (بالعربية)",
		"Select District": "اختر المنطقة",
		"Select Merchant": "اختر التاجر",
		"Merchant": "التاجر",
		"Merchant Name": "اسم التاجر",
		"Merchant Orders": "طلبات التاجر",
		"Driver": "السائق",
		"Customer": "العميل",
		"Customer Name": "اسم العميل",
		"First Name": "الاسم الأول",
		"Last Name": "اسم العائلة",
		"Name": "الاسم",
		"Username": "اسم المستخدم",
		"Email": "البريد الإلكتروني",
		"Phone": "الهاتف",
		"Phone Number": "رقم الهاتف",
		"Delivery Address": "عنوان التوصيل",
		"Account": "الحساب",
		"Account Type": "نوع الحساب",
		"Account Created": "تاريخ إنشاء الحساب",
		"Admin Credentials": "بيانات اعتماد المسؤول",
		"Merchant Credentials": "بيانات اعتماد التاجر",
		"Driver Credentials": "بيانات اعتماد السائق",
		"Personal Information": "المعلومات الشخصية",
		"Account Type & Settings": "نوع الحساب والإعدادات",
		"Delivery Charges by Region": "رسوم التوصيل حسب المنطقة",
		"Delivery Charges": "رسوم التوصيل",
		"Delivery Charge": "رسوم التوصيل",
		"Delivery Fee": "رسوم السائق",
		"Delivery Fee per Order ($)": "رسوم التوصيل لكل طلب ($)",
		"Total Price ($)": "السعر الإجمالي ($)",
		"Price": "السعر",
		"Amount": "المبلغ",
		"Total": "الإجمالي",
		"Revenue": "الإيرادات",
		"Total Sales": "إجمالي المبيعات",
		"Total Orders": "إجمالي الطلبات",
		"Total Deliveries": "إجمالي عمليات التوصيل",
		"Today's Deliveries": "عمليات توصيل اليوم",
		"Active Orders": "الطلبات النشطة",
		"Pending": "قيد الانتظار",
		"Delivered": "تم التسليم",
		"Cancelled": "ملغى",
		"Canceled": "ملغى",
		"Paid": "مدفوع",
		"Picked Up": "تم الاستلام",
		"Warehouse": "في المستودع",
		"New": "جديد",
		"Live": "مباشر",
		"Actions": "الإجراءات",
		"Recorded By": "سُجّل بواسطة",
		"Notes": "ملاحظات",
		"Note (optional)": "ملاحظة (اختياري)",
		"Exchange Order": "طلب استبدال",
		"Exchange Notes": "ملاحظات الاستبدال",
		"Off": "إيقاف",
		"On": "تشغيل",
		"Loading": "جارٍ التحميل",
		"Success": "نجاح",
		"Error": "خطأ",
		"Warning": "تحذير",
		"Try again": "حاول مرة أخرى",
		"Something went wrong.": "حدث خطأ ما.",
		"Server error. Please try again later.": "حدث خطأ في الخادم. يرجى المحاولة لاحقاً.",
		"Please wait...": "يرجى الانتظار...",
		"Success!": "تم بنجاح!",
		"Saved successfully": "تم الحفظ بنجاح",
		"Order created successfully": "تم إنشاء الطلب بنجاح",
		"Payment completed successfully.": "اكتمل الدفع بنجاح.",
		"Location sharing is off. Start only when you want to share.": "مشاركة الموقع متوقفة. ابدأها فقط عندما ترغب في المشاركة.",
		"Share current location while delivering": "مشاركة الموقع الحالي أثناء التوصيل",
		"Start sharing": "بدء المشاركة",
		"Pause": "إيقاف مؤقت",
		"Stop": "إيقاف",
		"Scan": "مسح",
		"Point the camera at the order's barcode.": "وجّه الكاميرا نحو الرمز الشريطي للطلب.",
		"Scan Order Barcode": "مسح الرمز الشريطي للطلب",
		"Update Order Status": "تحديث حالة الطلب",
		"Order ID:": "رقم الطلب:",
		"To Collect": "المبلغ المطلوب تحصيله",
		"Confirm you have picked up this order.": "أكد أنك استلمت هذا الطلب.",
		"Choose the delivery outcome:": "اختر نتيجة التوصيل:",
		"Ready to hit the road?": "هل أنت مستعد للانطلاق؟",
		"You have": "لديك",
		"active orders waiting for pickup or delivery.": "طلبات نشطة بانتظار الاستلام أو التوصيل.",
		"Welcome back,": "مرحباً بعودتك،",
		"Here is your delivery summary.": "إليك ملخص عمليات التوصيل الخاصة بك.",
		"Manage your pickups and deliveries.": "إدارة عمليات الاستلام والتوصيل.",
		"What you owe the admin, and your collection history.": "المبالغ المستحقة عليك للمسؤول وسجل التحصيل.",
		"Suggested delivery sequence": "تسلسل التوصيل المقترح",
		"Advisory order by Express priority, area grouping, and age. It is not a route or ETA.": "ترتيب إرشادي حسب أولوية السريع والمنطقة وعمر الطلب. ليس مساراً أو وقت وصول متوقعاً.",
		"Website language preference saved.": "تم حفظ تفضيل لغة الموقع.",
		"Could not save language preference": "تعذر حفظ تفضيل اللغة",
		"Language must be en or ar": "يجب أن تكون اللغة en أو ar",
		"All": "الكل",
	};

	Object.assign(translations, {
		"Language preference": "تفضيل اللغة",
		"General Settings": "الإعدادات العامة",
		"View Orders": "عرض الطلبات",
		"All Orders": "كل الطلبات",
		"Add Payment": "إضافة دفعة",
		"Add Collection": "إضافة تحصيل",
		"Add Return": "إضافة مرتجع",
		"Confirm Payment": "تأكيد الدفع",
		"Confirm Collection": "تأكيد التحصيل",
		"Apply Filters": "تطبيق عوامل التصفية",
		"No results found": "لم يتم العثور على نتائج",
		"No data available": "لا توجد بيانات متاحة",
		"No data found": "لم يتم العثور على بيانات",
		"Select a driver": "اختر سائقاً",
		"Select a location": "اختر موقعاً",
		"Select an option": "اختر خياراً",
		"Locations": "المواقع",
		"Region": "المنطقة",
		"Select Driver": "اختر السائق",
		"Select Date": "اختر التاريخ",
		"Date Created": "تاريخ الإنشاء",
		"Created At": "تاريخ الإنشاء",
		"Last Updated": "آخر تحديث",
		"Updated At": "تاريخ التحديث",
		"Start Date": "تاريخ البدء",
		"End Date": "تاريخ الانتهاء",
		"From Date": "من تاريخ",
		"To Date": "إلى تاريخ",
		"Drivers": "السائقون",
		"Admins": "المسؤولون",
		"Merchants": "التجار",
		"Customers": "العملاء",
		"Payment Day": "يوم الدفع",
		"Payment Day of Month": "يوم الدفع من الشهر",
		"Order ID Prefix": "بادئة رقم الطلب",
		"Commission Settings": "إعدادات العمولة",
		"Commission": "العمولة",
		"Prepaid": "مسبق الدفع",
		"Postpaid": "آجل الدفع",
		"Pay upfront": "الدفع مقدماً",
		"Pay later (scheduled)": "الدفع لاحقاً (مجدول)",
		"Payment Date": "تاريخ الدفع",
		"Net Amount": "صافي المبلغ",
		"Selected Amount": "المبلغ المحدد",
		"Orders Selected:": "الطلبات المحددة:",
		"Total Selected:": "الإجمالي المحدد:",
		"Payment #": "رقم الدفعة",
		"Collection #": "رقم التحصيل",
		"Transaction Type": "نوع المعاملة",
		"Type": "النوع",
		"Reference": "المرجع",
		"Description": "الوصف",
		"Expenses": "المصروفات",
		"Transactions": "المعاملات",
		"Profit": "الأرباح",
		"Cash": "النقد",
		"Export CSV": "تصدير CSV",
		"Export": "تصدير",
		"Print": "طباعة",
		"Download": "تنزيل",
		"Report": "تقرير",
		"Reports": "التقارير",
		"Orders Today": "طلبات اليوم",
		"Revenue Today": "إيرادات اليوم",
		"Total Revenue": "إجمالي الإيرادات",
		"Top Locations": "أكثر المواقع طلباً",
		"Top Merchants": "أفضل التجار",
		"Top Drivers": "أفضل السائقين",
		"This Week": "هذا الأسبوع",
		"This Month": "هذا الشهر",
		"Last 7 Days": "آخر 7 أيام",
		"Last 30 Days": "آخر 30 يوماً",
		"Last 90 Days": "آخر 90 يوماً",
		"Custom Range": "نطاق مخصص",
		"Auto-refresh off": "التحديث التلقائي متوقف",
		"Auto-refresh on": "التحديث التلقائي يعمل",
		"Action": "الإجراء",
		"Details": "التفاصيل",
		"View Details": "عرض التفاصيل",
		"More Details": "مزيد من التفاصيل",
		"Created": "تم الإنشاء",
		"Changes saved successfully.": "تم حفظ التغييرات بنجاح.",
		"Password updated successfully": "تم تحديث كلمة المرور بنجاح",
		"Password changed successfully": "تم تغيير كلمة المرور بنجاح",
		"Order updated successfully": "تم تحديث الطلب بنجاح",
		"Order deleted successfully": "تم حذف الطلب بنجاح",
		"Payment recorded successfully.": "تم تسجيل الدفعة بنجاح.",
		"Collection recorded successfully.": "تم تسجيل التحصيل بنجاح.",
		"Please try again.": "يرجى المحاولة مرة أخرى.",
		"Please select an order.": "يرجى اختيار طلب.",
		"Please select a merchant.": "يرجى اختيار تاجر.",
		"Please enter a valid amount.": "يرجى إدخال مبلغ صحيح.",
		"Are you sure?": "هل أنت متأكد؟",
		"Are you sure you want to delete this order?": "هل أنت متأكد أنك تريد حذف هذا الطلب؟",
		"Enter a unique username": "أدخل اسم مستخدم فريداً",
		"At least 6 characters": "6 أحرف على الأقل",
		"Last name (optional)": "اسم العائلة (اختياري)",
		"Full first name": "الاسم الأول كاملاً",
		"Optional": "اختياري",
		"optional": "اختياري",
		"Required": "مطلوب",
		"required": "مطلوب",
		"Today": "اليوم",
		"Yesterday": "أمس",
		"Tomorrow": "غداً",
		"All Time": "كل الفترات",
		"All Locations": "كل المواقع",
		"All Merchants": "كل التجار",
		"All Drivers": "كل السائقين",
		"Search orders...": "ابحث عن الطلبات...",
		"Search by order ID, customer, phone...": "ابحث برقم الطلب أو العميل أو الهاتف...",
		"Choose a file": "اختر ملفاً",
		"No file chosen": "لم يتم اختيار ملف",
		"Available": "متاح",
		"Unavailable": "غير متاح",
		"Online": "متصل",
		"Offline": "غير متصل",
		"Active": "نشط",
		"Inactive": "غير نشط",
		"Open": "مفتوح",
		"Closed": "مغلق",
		"By": "بواسطة",
		"Quantity": "الكمية",
		"Count": "العدد",
		"Min": "الحد الأدنى",
		"Max": "الحد الأقصى",
		"Enter": "أدخل",
		"Enter your name": "أدخل اسمك",
		"Select": "اختر",
		"Select All": "تحديد الكل",
		"Select Orders": "اختر الطلبات",
		"All Statuses": "كل الحالات",
		"Loading data...": "جارٍ تحميل البيانات...",
		"No results": "لا توجد نتائج",
		"No records found": "لم يتم العثور على سجلات",
		"No sessions found": "لم يتم العثور على جلسات",
		"No payments found": "لم يتم العثور على دفعات",
		"No collections found": "لم يتم العثور على عمليات تحصيل",
		"No returns found": "لم يتم العثور على مرتجعات",
		"View": "عرض",
		"Hide": "إخفاء",
		"Hide Orders": "إخفاء الطلبات",
		"Mark Picked Up": "تأكيد استلام الطلب",
		"Update Delivery Status": "تحديث حالة التوصيل",
		"No Actions Available": "لا توجد إجراءات متاحة",
		"Failed to load orders. Please try again.": "تعذر تحميل الطلبات. يرجى المحاولة مرة أخرى.",
		"No matching orders": "لا توجد طلبات مطابقة",
		"Try a different order ID, customer, phone, or location.": "جرّب رقم طلب أو عميلاً أو هاتفاً أو موقعاً آخر.",
		"No Assigned Orders": "لا توجد طلبات مسندة",
		"You currently do not have any orders assigned to you.": "لا توجد حالياً طلبات مسندة إليك.",
		"No Collection Sessions Yet": "لا توجد جلسات تحصيل بعد",
		"Cash you hand over to the admin will show up here.": "ستظهر هنا الأموال التي تسلمها إلى المسؤول.",
		"No orders in this session": "لا توجد طلبات في هذه الجلسة",
		"Handed Over (net of your fee)": "المبلغ المسلّم (بعد خصم رسومك)",
		"Received By": "استلمها",
		"No active deliveries to sequence.": "لا توجد عمليات توصيل نشطة لترتيبها.",
		"Suggested sequence is temporarily unavailable.": "التسلسل المقترح غير متاح مؤقتاً.",
		"No recent actions": "لا توجد إجراءات حديثة",
		"No drivers with outstanding cash": "لا يوجد سائقون لديهم مبالغ نقدية مستحقة",
		"No merchants awaiting payment": "لا يوجد تجار بانتظار الدفع",
		"Select a prepaid merchant to see their payment history": "اختر تاجراً مدفوعاً مسبقاً لعرض سجل مدفوعاته",
		"No matches found": "لم يتم العثور على نتائج مطابقة",
		"No orders match these filters.": "لا توجد طلبات تطابق عوامل التصفية هذه.",
		"Dispatch board unavailable.": "لوحة التوزيع غير متاحة.",
		"No DRIVER accounts are available for recommendation.": "لا توجد حسابات سائقين متاحة للتوصية.",
		"No driver recommendation is available.": "لا توجد توصية بسائق متاحة.",
		"Confirm assignment": "تأكيد الإسناد",
		"Assigning…": "جارٍ الإسناد…",
		"Loading orders…": "جارٍ تحميل الطلبات…",
		"Loading your orders…": "جارٍ تحميل طلباتك…",
		"Loading dispatch board…": "جارٍ تحميل لوحة التوزيع…",
		"No payment sessions yet": "لا توجد جلسات دفع بعد",
		"Failed to load payment history": "تعذر تحميل سجل المدفوعات",
		"Driver location service is temporarily unavailable.": "خدمة موقع السائق غير متاحة مؤقتاً.",
		"Live location is temporarily unavailable.": "الموقع المباشر غير متاح مؤقتاً.",
		"Live tracking is disabled by server configuration.": "التتبع المباشر معطل في إعدادات الخادم.",
		"Location sharing is off.": "مشاركة الموقع متوقفة.",
		"Location update failed. Sharing will retry with the next GPS reading.": "تعذر تحديث الموقع. ستُعاد محاولة المشاركة عند قراءة GPS التالية.",
		"This browser cannot provide secure location access. Use the GoDelivery mobile app.": "لا يستطيع هذا المتصفح توفير وصول آمن إلى الموقع. استخدم تطبيق GoDelivery للهاتف.",
		"Browser location could not be started. Check permissions and try again.": "تعذر تشغيل الموقع في المتصفح. تحقق من الأذونات وحاول مرة أخرى.",
		"Waiting for browser location permission…": "بانتظار إذن الموقع في المتصفح…",
		"Clear log?": "هل تريد مسح السجل؟",
		"Order not found": "لم يتم العثور على الطلب",
		"Unassigned": "غير مسند",
		"Collected": "تم التحصيل",
		"Express": "سريع",
		"Warehouse Orders": "طلبات المستودع",
		"Order Status": "حالة الطلب",
		"Delivery Status": "حالة التوصيل",
		"Send WhatsApp message": "إرسال رسالة عبر واتساب",
		"Exchange": "استبدال",
		"No data": "لا توجد بيانات",
		"N/A": "غير متاح",
		"Unknown": "غير معروف",
		"Other": "أخرى",
		"None": "لا شيء",
	});

	const attributeNames = ["placeholder", "title", "aria-label"];
	const originalText = new WeakMap();
	const originalAttributes = new WeakMap();
	let observer;
	let originalDocumentTitle = "";

	function translateText(value) {
		if (!value || !value.trim()) return value;

		const leading = value.match(/^\s*/)?.[0] || "";
		const trailing = value.match(/\s*$/)?.[0] || "";
		const trimmed = value.trim();
		const translated = translations[trimmed];
		if (translated) return `${leading}${translated}${trailing}`;

		const pageNumber = trimmed.match(/^Page (\d+) of (\d+)$/i);
		if (pageNumber) return `${leading}الصفحة ${pageNumber[1]} من ${pageNumber[2]}${trailing}`;

		const activeDeliveries = trimmed.match(/^(\d+) active deliveries? in suggested order\.$/i);
		if (activeDeliveries) {
			return `${leading}${activeDeliveries[1]} عملية توصيل نشطة بالترتيب المقترح.${trailing}`;
		}

		return value;
	}

	function shouldSkipTextNode(node) {
		const parent = node.parentElement;
		if (!parent) return true;
		if (parent.closest(".status-badge, .an-status, [class^='s-'], [class*=' s-']")) return false;
		if (parent.closest(
			"script, style, noscript, textarea, code, pre, [data-no-translate], [contenteditable='true'], #profName, #navProfileName, #navUserName, #navName, #navUsername, #merchantName, #driverName, #adminLiveList strong, .dash-who-name, .user-card h4, .user-card .detail-value, .user-card .value, .driver-badge, .customer-name, .merchant-name, .driver-name, .order-card .info-text p",
		)) return true;

		const cell = parent.closest("td");
		if (!cell) return false;
		return !cell.matches(".empty-state, .empty-cell, .loading, .error-message") &&
			!cell.hasAttribute("colspan") &&
			!cell.querySelector(".empty-state, .loading, .error-message");
	}

	function translateAttributes(element) {
		if (!(element instanceof Element)) return;
		for (const attribute of attributeNames) {
			const value = element.getAttribute(attribute);
			if (!value) continue;
			const translated = translateText(value);
			const originals = originalAttributes.get(element);
			if (translated !== value) {
				const updatedOriginals = originals || {};
				updatedOriginals[attribute] = value;
				originalAttributes.set(element, updatedOriginals);
				element.setAttribute(attribute, translated);
			} else if (originals?.[attribute] && translateText(originals[attribute]) !== value) {
				delete originals[attribute];
				if (!Object.keys(originals).length) originalAttributes.delete(element);
			}
		}
	}

	function translateNode(node) {
		if (node.nodeType === Node.TEXT_NODE) {
			if (shouldSkipTextNode(node)) return;
			const value = node.nodeValue || "";
			const translated = translateText(value);
			if (translated !== value) {
				originalText.set(node, value);
				node.nodeValue = translated;
			} else {
				const previousOriginal = originalText.get(node);
				if (previousOriginal !== undefined && translateText(previousOriginal) !== value) {
					originalText.delete(node);
				}
			}
			return;
		}

		if (!(node instanceof Element)) return;
		translateAttributes(node);
		for (const child of node.childNodes) translateNode(child);
	}

	function restoreEnglish(node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const original = originalText.get(node);
			if (original !== undefined) {
				node.nodeValue = original;
				originalText.delete(node);
			}
			return;
		}
		if (!(node instanceof Element)) return;

		const originals = originalAttributes.get(node);
		if (originals) {
			for (const [attribute, value] of Object.entries(originals)) {
				node.setAttribute(attribute, value);
			}
			originalAttributes.delete(node);
		}
		for (const child of node.childNodes) restoreEnglish(child);
	}

	function queueTranslation(records) {
		const roots = new Set();
		for (const record of records) {
			if (record.type === "characterData") roots.add(record.target);
			if (record.type === "attributes") roots.add(record.target);
			for (const node of record.addedNodes || []) roots.add(node);
		}
		for (const root of roots) {
			let ancestor = root.parentElement;
			let covered = false;
			while (ancestor) {
				if (roots.has(ancestor)) {
					covered = true;
					break;
				}
				ancestor = ancestor.parentElement;
			}
			if (!covered) translateNode(root);
		}
	}

	function initialize() {
		if (document.documentElement.lang !== "ar") return;

		originalDocumentTitle = document.title;
		observer = new MutationObserver(queueTranslation);
		observer.observe(document.documentElement, {
			childList: true,
			characterData: true,
			attributes: true,
			attributeFilter: attributeNames,
			subtree: true,
		});
		translateNode(document.documentElement);
		document.title = translateText(document.title);
		document.documentElement.classList.add("i18n-ready");

		window.addEventListener("beforeprint", () => {
			observer.disconnect();
			restoreEnglish(document.documentElement);
			document.title = originalDocumentTitle;
		});
		window.addEventListener("afterprint", () => {
			translateNode(document.documentElement);
			document.title = translateText(originalDocumentTitle);
			observer.observe(document.documentElement, {
				childList: true,
				characterData: true,
				attributes: true,
				attributeFilter: attributeNames,
				subtree: true,
			});
		});
	}

	window.__t = (value) =>
		document.documentElement.lang === "ar" ? translateText(String(value)) : String(value);

	document.addEventListener("change", async (event) => {
		const select = event.target.closest?.("[data-language-select]");
		if (!select) return;

		const language = select.value;
		select.disabled = true;
		try {
			const response = await fetch("/api/auth/language", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ language }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || "Could not save language preference");
			window.location.reload();
		} catch (error) {
			select.disabled = false;
			select.value = document.documentElement.lang === "ar" ? "ar" : "en";
			if (window.Dialog?.alert) {
				await window.Dialog.alert(window.__t(error.message), {
					title: window.__t("Error"),
					danger: true,
				});
			}
		}
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize, { once: true });
	} else {
		initialize();
	}
})();
