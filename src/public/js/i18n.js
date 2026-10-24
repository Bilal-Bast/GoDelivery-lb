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

	Object.assign(translations, {
		"Failed to load data.": "تعذر تحميل البيانات.",
		"Retry": "إعادة المحاولة",
		"Collection completed successfully.": "تم تسجيل التحصيل بنجاح.",
		"No distance or ETA is calculated. Recommendations never assign automatically.": "لا يتم حساب المسافة أو وقت الوصول. التوصيات لا تسند الطلبات تلقائياً.",
		"Apply filters": "تطبيق عوامل التصفية",
		"Financial Overview": "نظرة عامة مالية",
		"Quick Actions": "إجراءات سريعة",
		"Receive Driver Cash": "استلام أموال السائق",
		"Pay Merchant": "دفع مستحقات التاجر",
		"Add Expense": "إضافة مصروف",
		"Generate Report": "إنشاء تقرير",
		"Balances Overview": "نظرة عامة على الأرصدة",
		"We Owe Merchants": "مستحقات التجار علينا",
		"Merchants Owe Us": "مستحقات لنا على التجار",
		"Drivers Owe Us": "مستحقات لنا على السائقين",
		"Pay Prepaid Merchant": "دفع مستحقات تاجر مسبق الدفع",
		"Amount ($) — negative to collect from merchant": "المبلغ ($) — استخدم قيمة سالبة لتحصيل المبلغ من التاجر",
		"Debt from old system": "دين من النظام السابق",
		"Legacy balance ($)": "الرصيد السابق ($)",
		"Advance Payment History": "سجل الدفعات المقدمة",
		"Alerts": "التنبيهات",
		"Awaiting Driver Collection": "بانتظار تحصيل أموال السائقين",
		"Awaiting Merchant Payment": "بانتظار دفع مستحقات التجار",
		"Audit Log": "سجل التدقيق",
		"Loading current driver locations…": "جارٍ تحميل مواقع السائقين الحالية…",
		"Only fresh locations from drivers who have an active Picked Up order are shown. No location history is stored.": "تظهر المواقع الحديثة فقط للسائقين الذين لديهم طلب مستلم نشط. لا يتم حفظ سجل للمواقع.",
		"Add New Order": "إضافة طلب جديد",
		"Merchant *": "التاجر *",
		"Lebanon": "لبنان",
		"Location (Lebanon) *": "الموقع (لبنان) *",
		"Order ID *": "رقم الطلب *",
		"Error message": "رسالة الخطأ",
		"Success message": "رسالة النجاح",
		"Total Price ($) *": "السعر الإجمالي ($) *",
		"Delivery Charge ($) *": "رسوم التوصيل ($) *",
		"Assign Driver": "إسناد إلى سائق",
		"Update Status": "تحديث الحالة",
		"Total Delivery Charge": "إجمالي رسوم التوصيل",
		"📦 Orders List": "📦 قائمة الطلبات",
		"🖨️ Driver Print": "🖨️ طباعة السائق",
		"🖨️ Merchant Print": "🖨️ طباعة التاجر",
		"🖨️ Waybill Print": "🖨️ طباعة بوليصة الشحن",
		"🖨️ Barcode Print": "🖨️ طباعة الرمز الشريطي",
		"Barcode": "الرمز الشريطي",
		"Picked up": "تم الاستلام",
		"Stop Scanning": "إيقاف المسح",
		"Enter notes for exchange...": "أدخل ملاحظات الاستبدال...",
		"Enter phone number": "أدخل رقم الهاتف",
		"Enter first name": "أدخل الاسم الأول",
		"Enter last name": "أدخل اسم العائلة",
		"Enter total price": "أدخل السعر الإجمالي",
		"Enter delivery charge": "أدخل رسوم التوصيل",
		"Search merchant...": "ابحث عن تاجر...",
		"Search location...": "ابحث عن موقع...",
		"Any district": "أي منطقة",
		"Any city": "أي مدينة",
		"Any merchant": "أي تاجر",
		"Fresh driver locations": "مواقع السائقين الحديثة",
		"Confirm Return": "تأكيد الإرجاع",
		"Password": "كلمة المرور",
		"Forgot password?": "هل نسيت كلمة المرور؟",
		"Users Management": "إدارة المستخدمين",
		"Loading admins...": "جارٍ تحميل المسؤولين...",
		"Loading merchants...": "جارٍ تحميل التجار...",
		"Loading drivers...": "جارٍ تحميل السائقين...",
		"Optional — letters/numbers only, prepended to order IDs for this merchant (e.g. \"ad\" + 3458 → ad3458)": "اختياري — أحرف وأرقام فقط، تُضاف إلى بداية أرقام طلبات هذا التاجر (مثال: \"ad\" + 3458 ← ad3458)",
		"Enter a unique username (any letters, numbers, or symbols)": "أدخل اسم مستخدم فريداً (أحرف أو أرقام أو رموز)",
		"Optional — used for password recovery and admin notifications": "اختياري — يُستخدم لاستعادة كلمة المرور وإشعارات المسؤول",
		"Enter phone without country code": "أدخل رقم الهاتف من دون رمز البلد",
		"Merchant owner's first name": "الاسم الأول لصاحب المتجر",
		"Any letters, numbers, or symbols": "أي أحرف أو أرقام أو رموز",
		"Optional — letters/numbers only, prepended to order IDs for this merchant": "اختياري — أحرف وأرقام فقط، تُضاف إلى بداية أرقام طلبات هذا التاجر",
		"Optional — business email for communications": "اختياري — البريد الإلكتروني التجاري للتواصل",
		"Prepaid merchants are paid in advance from the Finance page — you choose how much to pay and the rest stays as a running balance. Nothing to configure here.": "يُدفع للتجار مسبقي الدفع مقدماً من صفحة المالية. اختر المبلغ، ويُسجّل المتبقي كرصد مستمر. لا توجد إعدادات إضافية هنا.",
		"Day or date of payment cycle": "يوم الدفع أو تاريخه ضمن دورة الدفع",
		"North region delivery cost": "تكلفة التوصيل إلى المنطقة الشمالية",
		"Mountain region delivery cost": "تكلفة التوصيل إلى المنطقة الجبلية",
		"Capital city delivery cost": "تكلفة التوصيل إلى العاصمة",
		"Valley region delivery cost": "تكلفة التوصيل إلى منطقة البقاع",
		"South region delivery cost": "تكلفة التوصيل إلى المنطقة الجنوبية",
		"Mountain suburb delivery cost": "تكلفة التوصيل إلى ضواحي الجبل",
		"North district delivery cost": "تكلفة التوصيل إلى قضاء الشمال",
		"South district delivery cost": "تكلفة التوصيل إلى قضاء الجنوب",
		"Driver's first name": "الاسم الأول للسائق",
		"Optional — email for communications": "اختياري — البريد الإلكتروني للتواصل",
		"Balance & Collections": "الرصيد والتحصيلات",
		"✖ Canceled": "✖ ملغى",
		"View All →": "عرض الكل ←",
		"Order Number *": "رقم الطلب *",
		"Location *": "الموقع *",
		"Payments & Balance": "المدفوعات والرصيد",
		"Delivery Rate": "نسبة التوصيل",
		"Waiting for location status…": "بانتظار حالة الموقع…",
		"Fast & Reliable": "سريع وموثوق",
		"growth engine.": "محركاً للنمو.",
		"Ecosystem": "منظومة متكاملة",
		"Find Order": "البحث عن الطلب",
		"Destination": "الوجهة",
		"Profile": "الملف الشخصي",
		"Search...": "بحث...",
		"e.g. partial advance": "مثال: دفعة مقدمة جزئية",
		"e.g., admin_john": "مثال: admin_john",
		"e.g., merchant_store": "مثال: merchant_store",
		"e.g., driver_john": "مثال: driver_john",
		"admin@example.com (optional)": "admin@example.com (اختياري)",
		"store@example.com (optional)": "store@example.com (اختياري)",
		"driver@example.com (optional)": "driver@example.com (اختياري)",
		"Unique username for login": "اسم مستخدم فريد لتسجيل الدخول",
		"Optional — for account recovery and notifications": "اختياري — لاستعادة الحساب وتلقي الإشعارات",
		"Password required": "كلمة المرور مطلوبة",
		"Admin's first name": "الاسم الأول للمسؤول",
		"Admin's last name (optional)": "اسم عائلة المسؤول (اختياري)",
		"Contact phone for this admin": "رقم التواصل مع هذا المسؤول",
		"Merchant's first name": "الاسم الأول لصاحب المتجر",
		"Merchant's last name (optional)": "اسم عائلة التاجر (اختياري)",
		"Business contact number": "رقم التواصل التجاري",
		"Unique login username": "اسم مستخدم فريد لتسجيل الدخول",
		"Optional letters prepended to this merchant's order IDs, e.g. \"ad\" + 3458 → ad3458": "أحرف اختيارية تُضاف إلى بداية أرقام طلبات هذا التاجر، مثال: \"ad\" + 3458 ← ad3458",
		"For notifications and recovery": "لإرسال الإشعارات واستعادة الحساب",
		"Day merchant gets paid (e.g., Monday)": "يوم استلام التاجر للدفعة (مثال: الاثنين)",
		"e.g., Monday, 15th": "مثال: الاثنين أو اليوم 15",
		"Driver's last name (optional)": "اسم عائلة السائق (اختياري)",
		"Driver's contact number": "رقم التواصل مع السائق",
		"For notifications": "لإرسال الإشعارات",
		"How much driver earns per delivery": "المبلغ الذي يحصل عليه السائق عن كل توصيل",
		"e.g., 2.50": "مثال: 2.50",
		"🔍 Search admins by name, username, or phone...": "🔍 ابحث عن المسؤولين بالاسم أو اسم المستخدم أو الهاتف...",
		"🔍 Search merchants by name, username, or phone...": "🔍 ابحث عن التجار بالاسم أو اسم المستخدم أو الهاتف...",
		"🔍 Search drivers by name, username, or phone...": "🔍 ابحث عن السائقين بالاسم أو اسم المستخدم أو الهاتف...",
		"Enter username": "أدخل اسم المستخدم",
		"Enter email (optional)": "أدخل البريد الإلكتروني (اختياري)",
		"First name": "الاسم الأول",
		"Last name": "اسم العائلة",
		"Enter new password (optional, min 6 characters)": "أدخل كلمة مرور جديدة (اختياري، 6 أحرف على الأقل)",
		"Search by order ID, customer, phone, or location": "ابحث برقم الطلب أو اسم العميل أو الهاتف أو الموقع",
		"Search assigned orders": "ابحث في الطلبات المسندة",
		"Clear order search": "مسح البحث عن الطلبات",
		"Clear search": "مسح البحث",
		"E.g., Delivered to receptionist, Customer not home...": "مثال: سُلّم للاستقبال، العميل غير موجود...",
		"e.g. 77": "مثال: 77",
		"Phone number": "رقم الهاتف",
		"Search city or district...": "ابحث عن مدينة أو منطقة...",
		"Exchange details...": "تفاصيل الاستبدال...",
		"Min 6 characters": "6 أحرف على الأقل",
		"Current order driver location": "موقع سائق الطلب الحالي",
		"Current driver location map": "خريطة موقع السائق الحالي",
		"Unknown District": "منطقة غير معروفة",
		"Unknown City": "مدينة غير معروفة",
		"No delivered or cancelled orders for this driver.": "لا توجد طلبات مسلّمة أو ملغاة لهذا السائق.",
		"No orders to settle for this merchant.": "لا توجد طلبات لتسويتها لهذا التاجر.",
		"No orders awaiting return for this merchant.": "لا توجد طلبات بانتظار إرجاعها لهذا التاجر.",
		"Failed to load collection sessions.": "تعذر تحميل جلسات التحصيل.",
		"Failed to load payment sessions.": "تعذر تحميل جلسات الدفع.",
		"Failed to load return sessions.": "تعذر تحميل جلسات الإرجاع.",
		"No orders in this return": "لا توجد طلبات ضمن عملية الإرجاع هذه",
		"Fresh collection": "تحصيل جديد",
		"Adjustment for Collection": "تسوية التحصيل رقم",
		"Adjustment for Payment": "تسوية الدفعة رقم",
		"User updated successfully!": "تم تحديث المستخدم بنجاح!",
		"Sequence unavailable": "التسلسل غير متاح",
		"Could not open the print window — please allow pop-ups for this site.": "تعذر فتح نافذة الطباعة — يرجى السماح بالنوافذ المنبثقة لهذا الموقع.",
		"No active location updates yet.": "لا توجد تحديثات للموقع حالياً.",
		"Resume sharing": "استئناف مشاركة الموقع",
		"Sharing paused. Resume manually to share again.": "تم إيقاف مشاركة الموقع مؤقتاً. استأنفها يدوياً للمتابعة.",
		"GPS accuracy is too low for sharing. Waiting for a better reading.": "دقة GPS منخفضة جداً لمشاركة الموقع. بانتظار قراءة أدق.",
		"Live location updated": "تم تحديث الموقع المباشر",
		"sharing a fresh location.": "يشارك موقعاً حديثاً.",
		"active": "نشط",
		"active order": "طلب نشط",
		"active orders": "طلبات نشطة",
		"driver": "سائق",
		"drivers": "سائقون",
		"Edit order: ": "تعديل الطلب: ",
		"View order: ": "عرض الطلب: ",
		"This will open edit modal": "ستُفتح نافذة التعديل",
		"This will show order details": "ستظهر تفاصيل الطلب",
		"Click to retry": "انقر لإعادة المحاولة",
		"Prepaid merchant — returning these does not move money: their balance already dropped when the orders were cancelled.": "لا يؤدي إرجاع هذه الطلبات إلى تغيير رصيد التاجر مسبق الدفع؛ فقد انخفض رصيده عند إلغاء الطلبات.",
		"Postpaid merchant — returned cancelled orders are closed out as Paid. Exchange orders stay payable on the Pay page.": "تُسجّل الطلبات الملغاة المرتجعة للتاجر آجل الدفع كمدفوعة. تبقى طلبات الاستبدال قابلة للدفع من صفحة الدفع.",
		"No collection sessions recorded yet.": "لم تُسجّل جلسات تحصيل بعد.",
		"No returns recorded yet.": "لم تُسجّل أي عمليات إرجاع بعد.",
	});

	Object.assign(translations, {
		"Live operations": "العمليات المباشرة",
		"Updated": "تم التحديث",
		"Order pipeline": "مراحل الطلبات",
		"Performance trend": "اتجاه الأداء",
		"Fees": "الرسوم",
		"Status mix": "توزيع الحالات",
		"Cash position": "الوضع النقدي",
		"All time — where every dollar currently sits": "طوال الفترة — أين يوجد كل مبلغ حالياً",
		"Needs attention": "يتطلب الانتباه",
		"Live activity": "النشاط المباشر",
		"Latest 25": "أحدث 25",
		"Top merchants": "أفضل التجار",
		"By revenue": "حسب الإيرادات",
		"Share": "الحصة",
		"Driver performance": "أداء السائقين",
		"By deliveries": "حسب عمليات التوصيل",
		"Cash held": "النقد المحتفظ به",
		"Order rhythm": "وتيرة الطلبات",
		"Hour of day (0–23)": "ساعة اليوم (0–23)",
		"Top regions": "أفضل المناطق",
		"By order volume": "حسب عدد الطلبات",
		"Quick actions": "إجراءات سريعة",
		"New order": "طلب جديد",
		"Collect money": "تحصيل الأموال",
		"Pay merchants": "دفع مستحقات التجار",
		"Returns": "المرتجعات",
		"Finance": "المالية",
		"GoDelivery control center · figures derive from live order data": "مركز تحكم GoDelivery · الأرقام مستمدة من بيانات الطلبات المباشرة",
		"Loading analytics data...": "جارٍ تحميل بيانات التحليلات...",
		"Analytics Dashboard": "لوحة التحليلات",
		"From": "من",
		"To": "إلى",
		"Apply": "تطبيق",
		"Reset": "إعادة ضبط",
		"Active Drivers": "السائقون النشطون",
		"Revenue Over Time": "الإيرادات بمرور الوقت",
		"Order Status Distribution": "توزيع حالات الطلبات",
		"Orders Over Time": "الطلبات بمرور الوقت",
		"Deliveries": "عمليات التوصيل",
		"Average Order Value": "متوسط قيمة الطلب",
		"Success Rate": "نسبة النجاح",
		"Cancel Rate": "معدل الإلغاء",
		"Avg Order Value": "متوسط قيمة الطلب",
		"Collect Money from Drivers": "تحصيل الأموال من السائقين",
		"Record cash collected from drivers after deliveries.": "سجّل الأموال التي تم تحصيلها من السائقين بعد عمليات التوصيل.",
		"Driver *": "السائق *",
		"Driver Orders": "طلبات السائق",
		"Total ($)": "الإجمالي ($)",
		"Select a driver to view orders": "اختر سائقاً لعرض الطلبات",
		"Collection Sessions History": "سجل جلسات التحصيل",
		"Driver Name": "اسم السائق",
		"# Orders": "عدد الطلبات",
		"Total Amount": "المبلغ الإجمالي",
		"Net Received": "صافي المبلغ المستلم",
		"Suggestions use current workload, Express priority, and existing district/city text.": "تعتمد الاقتراحات على عبء العمل الحالي وأولوية الطلبات السريعة وأسماء المناطق والمدن المسجلة.",
		"Warehouse + New": "المستودع + جديد",
		"Assignment": "الإسناد",
		"Unassigned only": "غير المسندة فقط",
		"Assigned only": "المسندة فقط",
		"Age": "مدة الانتظار",
		"All waiting": "كل الطلبات المنتظرة",
		"Created today": "أُنشئت اليوم",
		"Express only": "السريعة فقط",
		"Standard only": "العادية فقط",
		"Merchant username": "اسم مستخدم التاجر",
		"Review driver assignment": "مراجعة إسناد السائق",
		"Confirming assigns this order through the existing admin order-update transaction. The board does not change lifecycle or finance state.": "يؤكد هذا الإجراء إسناد الطلب عبر معاملة تحديث الطلب الحالية. لا تغيّر اللوحة دورة حياة الطلب أو حالته المالية.",
		"Cash In": "الأموال الواردة",
		"Cash Out": "الأموال الصادرة",
		"Entitled": "المستحق",
		"Gross Cash": "إجمالي النقد",
		"Driver Fee": "رسوم السائق",
		"Outstanding": "المبلغ المتبقي",
		"Select a prepaid merchant": "اختر تاجراً مسبق الدفع",
		"Orders value": "قيمة الطلبات",
		"Legacy balance (old system)": "الرصيد السابق (النظام القديم)",
		"Entitled total": "إجمالي المستحق",
		"Already paid": "المدفوع بالفعل",
		"Outstanding balance": "الرصيد المستحق",
		"Save Legacy Balance": "حفظ الرصيد السابق",
		"Note": "ملاحظة",
		"Cash Flow": "التدفق النقدي",
		"Expense Categories": "فئات المصروفات",
		"Delivered Orders": "الطلبات المسلّمة",
		"Collected Orders": "الطلبات المحصّلة",
		"Outstanding Cash": "النقد المستحق",
		"Last Collection": "آخر تحصيل",
		"Amount Owed": "المبلغ المستحق",
		"Last Payment": "آخر دفعة",
		"Method": "طريقة الدفع",
		"Related Order": "الطلب المرتبط",
		"Admin": "المسؤول",
		"Category": "الفئة",
		"Created By": "أُنشئ بواسطة",
		"User": "المستخدم",
		"Add Order": "إضافة طلب",
		"Add Manual Actions": "إضافة إجراءات يدوية",
		"Order Adjustments": "تعديلات الطلب",
		"Phone Number *": "رقم الهاتف *",
		"First Name *": "الاسم الأول *",
		"Manual Order Actions": "إجراءات الطلب اليدوية",
		"Order Details": "تفاصيل الطلب",
		"Select New Status": "اختر الحالة الجديدة",
		"📦 Warehouse": "📦 في المستودع",
		"📋 Picked up": "📋 تم الاستلام",
		"✅ Delivered": "✅ تم التسليم",
		"❌ Cancelled — by Customer": "❌ أُلغي من العميل",
		"❌ Cancelled — by Merchant": "❌ أُلغي من التاجر",
		"Apply Changes": "تطبيق التغييرات",
		"Order Snapshot": "ملخص الطلب",
		"Undo Last Change": "التراجع عن آخر تغيير",
		"WareHouse": "في المستودع",
		"Search by Location": "البحث حسب الموقع",
		"Total Price Range ($)": "نطاق السعر الإجمالي ($)",
		"Price (w/o delivery)": "السعر (من دون التوصيل)",
		"Delivery": "التوصيل",
		"Created Date": "تاريخ الإنشاء",
		"Total Filtered Orders": "إجمالي الطلبات بعد التصفية",
		"Order Information": "معلومات الطلب",
		"Customer Information": "معلومات العميل",
		"City/Village": "المدينة/القرية",
		"Pricing": "الأسعار",
		"Total Price": "السعر الإجمالي",
		"Price w/o Delivery": "السعر من دون التوصيل",
		"Additional Info": "معلومات إضافية",
		"Delete Order": "حذف الطلب",
		"Scan Barcodes": "مسح الرموز الشريطية",
		"Point the camera at a barcode.": "وجّه الكاميرا نحو الرمز الشريطي.",
		"Search driver...": "ابحث عن سائق...",
		"Order ID, Name, Phone...": "رقم الطلب أو الاسم أو الهاتف...",
		"Location...": "الموقع...",
		"Record payments made to merchants for their orders.": "سجّل الدفعات التي قُدّمت للتجار مقابل طلباتهم.",
		"Hand cancelled and exchange goods back to the merchant.": "أعد الطلبات الملغاة وبضائع الاستبدال إلى التاجر.",
		"Return recorded successfully.": "تم تسجيل الإرجاع بنجاح.",
		"Orders to Return": "الطلبات المطلوب إرجاعها",
		"Scan a barcode to tick that order in the list below.": "امسح الرمز الشريطي لتحديد الطلب في القائمة أدناه.",
		"Reason": "السبب",
		"Goods Value ($)": "قيمة البضائع ($)",
		"Goods Value Selected:": "قيمة البضائع المحددة:",
		"Return Sessions History": "سجل جلسات الإرجاع",
		"Return #": "رقم الإرجاع",
		"Goods Value": "قيمة البضائع",
		"Scan Orders to Return": "مسح الطلبات لإرجاعها",
		"Each scan ticks that order below. Close when you're done, then press Confirm Return.": "يحدد كل مسح الطلب أدناه. أغلق النافذة عند الانتهاء، ثم اضغط تأكيد الإرجاع.",
		"Done": "تم",
	});

	Object.assign(translations, {
		"Username *": "اسم المستخدم *",
		"Password *": "كلمة المرور *",
		"Payment Day *": "يوم الدفع *",
		"Akkar ($)": "عكار ($)",
		"Baalbek-Hermel ($)": "بعلبك الهرمل ($)",
		"Beirut ($)": "بيروت ($)",
		"Bekaa ($)": "البقاع ($)",
		"El Nabatieh ($)": "النبطية ($)",
		"Mount Lebanon ($)": "جبل لبنان ($)",
		"North ($)": "الشمال ($)",
		"South ($)": "الجنوب ($)",
		"Akkar": "عكار",
		"Baalbek-Hermel": "بعلبك الهرمل",
		"Beirut": "بيروت",
		"Bekaa": "البقاع",
		"El Nabatieh": "النبطية",
		"Mount Lebanon": "جبل لبنان",
		"North": "الشمال",
		"South": "الجنوب",
		"Enter city (English)": "أدخل اسم المدينة بالإنجليزية",
		"Enter city (Arabic)": "أدخل اسم المدينة بالعربية",
		"Min. 6 characters": "6 أحرف على الأقل",
		"John": "أحمد",
		"Doe": "الخوري",
		"e.g., ad (optional)": "مثال: ad (اختياري)",
		"👥 Users Management": "👥 إدارة المستخدمين",
		"Total Admins": "إجمالي المسؤولين",
		"Total Merchants": "إجمالي التجار",
		"Total Drivers": "إجمالي السائقين",
		"Edit User": "تعديل المستخدم",
		"Role": "الدور",
		"Resolve Blocking Records": "حل السجلات المعيقة",
		"Delete User Now": "حذف المستخدم الآن",
		"Search admins by name, username, or phone...": "ابحث عن المسؤولين بالاسم أو اسم المستخدم أو الهاتف...",
		"Search merchants by name, username, or phone...": "ابحث عن التجار بالاسم أو اسم المستخدم أو الهاتف...",
		"Search drivers by name, username, or phone...": "ابحث عن السائقين بالاسم أو اسم المستخدم أو الهاتف...",
		"Log in": "تسجيل الدخول",
		"Remember me": "تذكرني",
		"Reset password": "إعادة تعيين كلمة المرور",
		"Enter your account email and we'll send you a reset link.": "أدخل البريد الإلكتروني لحسابك وسنرسل إليك رابط إعادة التعيين.",
		"Send reset link": "إرسال رابط إعادة التعيين",
		"Set a new password": "تعيين كلمة مرور جديدة",
		"New password": "كلمة المرور الجديدة",
		"Confirm password": "تأكيد كلمة المرور",
		"Back to log in": "العودة إلى تسجيل الدخول",
		"Welcome!": "أهلاً بك!",
		"To Go Delivery.": "إلى GoDelivery.",
		"Track your order": "تتبع طلبك",
		"Track Package": "تتبع الشحنة",
		"Track Your Order": "تتبع طلبك",
		"Fetching your order details...": "جارٍ جلب تفاصيل طلبك...",
		"Order Not Found": "لم يتم العثور على الطلب",
		"Please check your Order ID and try again.": "يرجى التحقق من رقم الطلب والمحاولة مرة أخرى.",
		"Driver live location": "الموقع المباشر للسائق",
		"Order Adjustments Tracker": "سجل تعديلات الطلب",
		"Generated ID:": "رقم الطلب المُنشأ:",
		"Order Status Breakdown": "توزيع حالات الطلبات",
		"Top Delivery Locations": "أكثر مواقع التوصيل طلباً",
		"Charge ($)": "الرسوم ($)",
		"Customer delivery location": "موقع توصيل العميل",
		"Lebanon's Premier Logistics Network": "شبكة الخدمات اللوجستية الرائدة في لبنان",
		"Powering": "نحرّك",
		"We bridge the gap between businesses and their customers with modern technology, trusted drivers, and lightning-fast logistics infrastructure.": "نربط الشركات بعملائها عبر التكنولوجيا الحديثة والسائقين الموثوقين وبنية لوجستية سريعة للغاية.",
		"Discover Our Mission": "اكتشف رسالتنا",
		"Intelligent Routing & Tracking": "توجيه وتتبع ذكيان",
		"Who We Are": "من نحن",
		"More than just a delivery service. We are your": "نحن أكثر من مجرد خدمة توصيل؛ نحن شريكك في",
		"Born in Lebanon, Go-Delivery was founded to solve a critical problem for local businesses: the lack of a reliable, transparent, and fast last-mile logistics partner.": "تأسست Go-Delivery في لبنان لحل مشكلة أساسية تواجه الشركات المحلية: غياب شريك موثوق وشفاف وسريع لخدمات التوصيل في المرحلة الأخيرة.",
		"Our Mission": "رسالتنا",
		"To empower merchants by removing the friction of logistics, allowing them to focus entirely on building their products and serving their customers.": "تمكين التجار من خلال تبسيط الخدمات اللوجستية، ليتمكنوا من التركيز على تطوير منتجاتهم وخدمة عملائهم.",
		"Speed": "السرعة",
		"Optimized routing ensures lightning-fast delivery times.": "يضمن تحسين المسارات توصيلاً سريعاً للغاية.",
		"Reliability": "الموثوقية",
		"Real-time tracking and verified drivers you can trust.": "تتبع مباشر وسائقون موثوقون يمكنك الاعتماد عليهم.",
		"Scale": "التوسع",
		"Built to handle high-volume demands effortlessly.": "مصممة للتعامل بسهولة مع الطلبات ذات الأحجام الكبيرة.",
		"Satisfaction": "رضا العملاء",
		"Dedicated support to ensure happy customers.": "دعم مخصص لضمان رضا العملاء.",
		"Daily Orders": "الطلبات اليومية",
		"Partner Merchants": "التجار الشركاء",
		"On-time Rate": "نسبة التسليم في الوقت المحدد",
		"Be part of the": "كن جزءاً من",
		"Whether you're looking to scale your business operations or searching for flexible earning opportunities with a modern fleet, we have a place for you.": "سواء أردت توسيع أعمالك أو البحث عن فرص دخل مرنة مع أسطول حديث، لدينا مكان يناسبك.",
		"For Businesses": "للشركات",
		"Become a Partner": "كن شريكاً",
		"Stop worrying about logistics. Integrate with our smart dashboard, request drivers instantly, track orders in real-time, and watch your customer satisfaction soar.": "اترك إدارة الخدمات اللوجستية لنا. استخدم لوحة التحكم الذكية، واطلب السائقين فوراً، وتتبع الطلبات مباشرة، وعزّز رضا عملائك.",
		"Dedicated Driver Allocation": "تخصيص السائقين",
		"Cash-on-Delivery (COD) Management": "إدارة الدفع عند الاستلام",
		"Advanced Admin Dashboard": "لوحة تحكم متقدمة للمسؤولين",
		"Join as Merchant": "انضم كتاجر",
		"For Drivers": "للسائقين",
		"Drive With Us": "قد معنا",
		"Turn your vehicle into a revenue engine. Enjoy flexible hours, competitive payouts per delivery, and a streamlined mobile app that guides you effortlessly.": "حوّل مركبتك إلى مصدر دخل. استفد من ساعات مرنة ومقابل تنافسي لكل عملية توصيل وتطبيق هاتف يرشدك بسهولة.",
		"Flexible Schedule": "جدول مرن",
		"Competitive Payouts": "مقابل تنافسي",
		"Intuitive Driver App": "تطبيق سهل للسائقين",
		"Apply as Driver": "قدّم للعمل كسائق",
		"Ready to scale your deliveries?": "هل أنت مستعد لتوسيع عمليات التوصيل؟",
		"Join hundreds of businesses in Lebanon already using Go-Delivery to streamline their logistics and impress their customers.": "انضم إلى مئات الشركات في لبنان التي تستخدم Go-Delivery لتبسيط خدماتها اللوجستية وإرضاء عملائها.",
		"Get Started Today": "ابدأ اليوم",
		"Contact Sales": "تواصل مع فريق المبيعات",
		"© 2026 Go-Delivery Lebanon. All rights reserved.": "© 2026 Go-Delivery لبنان. جميع الحقوق محفوظة.",
		"Privacy": "الخصوصية",
		"Terms": "الشروط",
		"Support": "الدعم",
		"About Us": "من نحن",
		"Home": "الرئيسية",
		"Log In": "تسجيل الدخول",
		"Payment day": "يوم الدفع",
		"Email (optional)": "البريد الإلكتروني (اختياري)",
	});

	Object.assign(translations, {
		"Delivery Fees": "رسوم التوصيل",
		"Delivery fees": "رسوم التوصيل",
		"earned on delivered": "مكتسبة من الطلبات المسلّمة",
		"delivery fees, all delivered": "رسوم التوصيل لجميع الطلبات المسلّمة",
		"Express orders in flight": "طلبات سريعة قيد التوصيل",
		"Marked express and not delivered yet": "محددة كطلبات سريعة ولم تُسلّم بعد",
		"Awaiting a driver": "بانتظار سائق",
		"In warehouse or new, nobody assigned": "في المستودع أو جديدة، ولم يُسند إليها سائق",
		"Pickup mismatch": "اختلاف في السائق المستلم",
		"Picked up by a different driver": "استلمها سائق آخر",
		"Cash to collect": "أموال يجب تحصيلها",
		"Merchant payouts pending": "دفعات التجار المعلّقة",
		"Returns not collected back": "مرتجعات لم تتم استعادتها",
		"Cancelled orders still out": "طلبات ملغاة لم تتم استعادتها بعد",
		"Postpaid due today": "مستحقات آجلة اليوم",
		"Scheduled for today": "مجدول لليوم",
		"Held by drivers": "لدى السائقين",
		"Owed to merchants": "مستحقات التجار",
		"Company earnings": "أرباح الشركة",
		"In transit": "قيد التوصيل",
		"Settled": "تمت تسويته",
		"all clear": "لا توجد تنبيهات",
		"just now": "الآن",
		"Good morning": "صباح الخير",
		"Good afternoon": "مساء الخير",
		"Good evening": "مساء الخير",
		"Sun": "الأحد",
		"Mon": "الاثنين",
		"Tue": "الثلاثاء",
		"Wed": "الأربعاء",
		"Thu": "الخميس",
		"Fri": "الجمعة",
		"Sat": "السبت",
		"7 Days": "آخر 7 أيام",
		"30 Days": "آخر 30 يوماً",
		"90 Days": "آخر 90 يوماً",
		"Failed to load data. Make sure the backend is running.": "تعذر تحميل البيانات. تأكد من تشغيل الخادم.",
		"Revenue ($)": "الإيرادات ($)",
		"Could not load dispatch board.": "تعذر تحميل لوحة التوزيع.",
		"Assignment could not be saved.": "تعذر حفظ الإسناد.",
		"Failed to load orders": "تعذر تحميل الطلبات",
		"The admin owes you": "المسؤول مستحق لك",
		"You owe the admin": "أنت مدين للمسؤول",
		"Your balance": "رصيدك",
		"Settled — $0.00": "تمت التسوية — $0.00",
		"Please fill all required fields": "يرجى تعبئة جميع الحقول المطلوبة",
		"Total price must be a valid number": "يجب إدخال سعر إجمالي صحيح",
		"Delivery charge must be a valid number": "يجب إدخال رسوم توصيل صحيحة",
		"Failed to create order": "تعذر إنشاء الطلب",
		"Password must be at least 6 characters": "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل",
		"Passwords do not match": "كلمتا المرور غير متطابقتين",
		"Failed to update password": "تعذر تحديث كلمة المرور",
		"Password updated successfully!": "تم تحديث كلمة المرور بنجاح!",
		"Payment Due Today! Please make your payment.": "موعد الدفع اليوم! يرجى تسديد دفعتك.",
		"Payment Reminder": "تذكير بالدفع",
		"Processing…": "جارٍ التنفيذ…",
		"Receive Cash": "استلام النقد",
		"Network error. Please try again.": "حدث خطأ في الشبكة. يرجى المحاولة مجدداً.",
		"Collect from Merchant": "تحصيل المبلغ من التاجر",
		"Settle": "تسوية",
		"Enter a non-zero amount": "أدخل مبلغاً غير صفري",
		"Collecting…": "جارٍ التحصيل…",
		"Paying…": "جارٍ الدفع…",
		"Failed to record payment": "تعذر تسجيل الدفعة",
		"Enter a valid number": "أدخل رقماً صحيحاً",
		"Saving…": "جارٍ الحفظ…",
		"Failed to save legacy balance": "تعذر حفظ الرصيد السابق",
		"Failed to load prepaid history": "تعذر تحميل سجل الدفعات المقدمة",
		"Failed to download PDF": "تعذر تنزيل ملف PDF",
		"Failed to fetch payment": "تعذر جلب بيانات الدفعة",
		"Failed to load payment details": "تعذر تحميل تفاصيل الدفع",
		"Popup blocked. Please allow popups for this site.": "تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.",
		"Popup Blocked": "تم حظر النافذة المنبثقة",
		"Select a merchant first": "اختر تاجراً أولاً",
		"Generate": "إنشاء",
		"✓ Report generated successfully": "✓ تم إنشاء التقرير بنجاح",
		"Please confirm": "يرجى التأكيد",
		"Please enter a value": "يرجى إدخال قيمة",
		"Done —": "تم —",
		"Picked up by a previous driver — you need to pick it up again.": "استلمه سائق سابق — عليك استلامه مجدداً.",
		"Passwords do not match.": "كلمتا المرور غير متطابقتين.",
		"Updating...": "جارٍ التحديث...",
		"Failed to update": "تعذر التحديث",
		"Failed to update password.": "تعذر تحديث كلمة المرور.",
		"Scanner zoom is unavailable on this camera.": "التكبير غير متاح في هذه الكاميرا.",
		"Failed to load barcode scanner library": "تعذر تحميل مكتبة ماسح الرموز الشريطية",
		"Loading scanner…": "جارٍ تحميل الماسح…",
		"Scanner error:": "خطأ في الماسح:",
		"Location sharing is available only while you have an active Picked Up order.": "تتوفر مشاركة الموقع فقط عند وجود طلب نشط تم استلامه.",
		"Location permission was denied. Allow it in the browser to share.": "تم رفض إذن الموقع. اسمح به في المتصفح لمشاركة موقعك.",
		"Unable to read location. Check browser location availability.": "تعذرت قراءة الموقع. تحقق من إتاحته في المتصفح.",
		"Scan a barcode…": "امسح الرمز الشريطي…",
		"Select a merchant first.": "اختر تاجراً أولاً.",
		"Please select at least one order": "يرجى اختيار طلب واحد على الأقل",
		"Please select at least one order to print.": "يرجى تحديد طلب واحد على الأقل لطباعته.",
		"Notice": "تنبيه",
		"View details": "عرض التفاصيل",
		"Download PDF": "تنزيل PDF",
		"Collection recorded successfully!": "تم تسجيل التحصيل بنجاح!",
		"Payment recorded successfully!": "تم تسجيل الدفع بنجاح!",
		"Failed to load collection details": "تعذر تحميل تفاصيل التحصيل",
		"Failed to print collection": "تعذرت طباعة التحصيل",
		"Failed to print payment": "تعذرت طباعة الدفعة",
		"Failed to print advance": "تعذرت طباعة الدفعة المقدمة",
		"Failed to save collection": "تعذر حفظ التحصيل",
		"Failed to save payment": "تعذر حفظ الدفعة",
		"Failed to record return": "تعذر تسجيل الإرجاع",
		"Failed to download return PDF": "تعذر تنزيل ملف الإرجاع PDF",
		"Please fill in all required fields": "يرجى تعبئة جميع الحقول المطلوبة",
		"Backend Response Status:": "حالة استجابة الخادم:",
		"Failed to submit order. Please try again.": "تعذر إرسال الطلب. يرجى المحاولة مجدداً.",
		"🔍 Checking...": "🔍 جارٍ التحقق...",
		"✓ Auto-filled": "✓ تم التعبئة تلقائياً",
		"Order ID is required": "رقم الطلب مطلوب",
		"Checking...": "جارٍ التحقق...",
		"View Order": "عرض الطلب",
		"Edit Order": "تعديل الطلب",
		"Choose an available Order ID before saving.": "اختر رقم طلب متاحاً قبل الحفظ.",
		"Order ID Unavailable": "رقم الطلب غير متاح",
		"No changes to save.": "لا توجد تغييرات لحفظها.",
		"Order updated successfully!": "تم تحديث الطلب بنجاح!",
		"Failed to update order. Please try again.": "تعذر تحديث الطلب. يرجى المحاولة مجدداً.",
		"Order deleted successfully!": "تم حذف الطلب بنجاح!",
		"Failed to delete order. Please try again.": "تعذر حذف الطلب. يرجى المحاولة مجدداً.",
		"Status Change": "تغيير الحالة",
		"Change": "تغيير",
		"Status Updated": "تم تحديث الحالة",
		"System Action": "إجراء من النظام",
		"Undo": "تراجع",
		"Failed to undo the last change": "تعذر التراجع عن آخر تغيير",
		"Adjustment Reverted": "تم التراجع عن التعديل",
		"Undo Failed": "فشل التراجع",
		"Not found": "غير موجود",
		"Select status, driver, or exchange first": "اختر الحالة أو السائق أو الاستبدال أولاً",
		"Failed to cancel order": "تعذر إلغاء الطلب",
		"Weak": "ضعيفة",
		"Medium": "متوسطة",
		"Strong": "قوية",
		"Username is required": "اسم المستخدم مطلوب",
		"Username must be at least 3 characters": "يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل",
		"Please enter a valid email address": "يرجى إدخال عنوان بريد إلكتروني صحيح",
		"Password is required": "كلمة المرور مطلوبة",
		"First name is required": "الاسم الأول مطلوب",
		"First name must be at least 2 characters": "يجب أن يتكون الاسم الأول من حرفين على الأقل",
		"Phone number is required": "رقم الهاتف مطلوب",
		"Please enter a valid phone number": "يرجى إدخال رقم هاتف صحيح",
		"Payment day is required": "يوم الدفع مطلوب",
		"Only letters/numbers, up to 8 characters": "أحرف أو أرقام فقط، وبحد أقصى 8 أحرف",
		"❌ Network error:": "❌ خطأ في الشبكة:",
		"Cannot reach server. Is it running?": "تعذر الاتصال بالخادم. هل هو قيد التشغيل؟",
		"✓ Operation completed successfully.": "✓ اكتملت العملية بنجاح.",
		"Error saving location": "خطأ في حفظ الموقع",
		"City added successfully!": "تمت إضافة المدينة بنجاح!",
		"Server error": "خطأ في الخادم",
		"Status: ": "الحالة: ",
		"Notifications": "الإشعارات",
		"Live tracking is currently unavailable.": "التتبع المباشر غير متاح حالياً.",
		"Driver location is temporarily stale. Waiting for a fresh update.": "موقع السائق قديم مؤقتاً. بانتظار تحديث جديد.",
		"Live location is available while the order is out for delivery.": "يتوفر الموقع المباشر أثناء توصيل الطلب.",
		"Waiting for the driver to share a fresh location.": "بانتظار مشاركة السائق لموقع حديث.",
		"Live location is unavailable for this order.": "الموقع المباشر غير متاح لهذا الطلب.",
		"Could not share location.": "تعذرت مشاركة الموقع.",
		"Live location sharing is disabled by server configuration.": "مشاركة الموقع المباشر معطلة في إعدادات الخادم.",
	});

	Object.assign(translations, {
		"Order Created": "تم إنشاء الطلب",
		"Order Updated": "تم تحديث الطلب",
		"Order Cancelled": "تم إلغاء الطلب",
		"Undo Applied": "تم التراجع عن الإجراء",
		"Order injected into the system.": "تمت إضافة الطلب إلى النظام.",
		"No adjustments recorded yet.": "لم تُسجّل تعديلات بعد.",
		"Note:": "ملاحظة:",
		"System": "النظام",
		"Exchange Note": "ملاحظة الاستبدال",
		"Collected Back": "تمت إعادته",
		"Permanently delete these records?\n\nThis removes the collection/payment history itself — the underlying orders and cash already recorded are not affected. This cannot be undone.": "هل تريد حذف هذه السجلات نهائياً؟\n\nسيحذف هذا سجل التحصيل أو الدفع نفسه، ولن تتأثر الطلبات الأساسية أو الأموال المسجلة. لا يمكن التراجع عن هذا الإجراء.",
		"All blocking records resolved — this user can now be deleted.": "تم حل جميع السجلات المعيقة — يمكن الآن حذف هذا المستخدم.",
		"Choose someone to reassign to first": "اختر مستخدماً لإعادة الإسناد إليه أولاً",
		"Reassigned": "تمت إعادة الإسناد",
		"Delete Records Permanently": "حذف السجلات نهائياً",
		"Delete Permanently": "حذف نهائياً",
		"Deleted": "تم الحذف",
		"Couldn't check user": "تعذر التحقق من المستخدم",
		"Couldn't delete user": "تعذر حذف المستخدم",
		"✓ User updated successfully!": "✓ تم تحديث المستخدم بنجاح!",
		"Order ID prefix: letters/numbers only, up to 8 characters": "بادئة رقم الطلب: أحرف أو أرقام فقط، وبحد أقصى 8 أحرف",
		"Please enter a valid delivery fee": "يرجى إدخال رسوم توصيل صحيحة",
		"💰 Payment Due Today! Please make your payment.": "💰 موعد الدفع اليوم! يرجى تسديد دفعتك.",
		"No actions available": "لا توجد إجراءات متاحة",
		"Failed to load merchants": "تعذر تحميل التجار",
		"Failed to fetch merchants": "تعذر جلب التجار",
		"Failed to fetch locations": "تعذر جلب المواقع",
		"Failed to update order": "تعذر تحديث الطلب",
		"Failed to delete order": "تعذر حذف الطلب",
		"Failed to fetch history": "تعذر جلب السجل",
		"Unable to validate Order ID": "تعذر التحقق من رقم الطلب",
		"Barcode error for order": "خطأ في الرمز الشريطي للطلب",
		"Shipping Label": "ملصق الشحن",
		"OK": "موافق",
		"Yes": "نعم",
		"No": "لا",
		"updated": "تم تحديثه",
		"Failed to fetch collection": "تعذر جلب بيانات التحصيل",
		"Failed to fetch payments": "تعذر جلب المدفوعات",
		"Failed to fetch collections": "تعذر جلب عمليات التحصيل",
		"Failed to fetch returns": "تعذر جلب عمليات الإرجاع",
		"Failed to load merchant data:": "تعذر تحميل بيانات التاجر:",
		"Failed to load driver data:": "تعذر تحميل بيانات السائق:",
		"Error loading merchants:": "خطأ أثناء تحميل التجار:",
		"Error loading orders:": "خطأ أثناء تحميل الطلبات:",
		"Error loading collections:": "خطأ أثناء تحميل التحصيلات:",
		"Error loading payments:": "خطأ أثناء تحميل الدفعات:",
		"Error loading returns:": "خطأ أثناء تحميل المرتجعات:",
		"Error submitting order form:": "خطأ أثناء إرسال نموذج الطلب:",
		"Error loading order summary:": "خطأ أثناء تحميل ملخص الطلب:",
		"Error loading drivers:": "خطأ أثناء تحميل السائقين:",
		"Error loading merchant returns:": "خطأ أثناء تحميل مرتجعات التاجر:",
		"Error checking customer:": "خطأ أثناء التحقق من العميل:",
		"Modal order ID validation error:": "خطأ في التحقق من رقم الطلب:",
		"Admin scanner error:": "خطأ في ماسح المسؤول:",
		"Failed to load drivers:": "تعذر تحميل السائقين:",
		"Payment updated successfully.": "تم تحديث الدفعة بنجاح.",
		"Return updated successfully.": "تم تحديث الإرجاع بنجاح.",
		"Currently assigned to": "مسند حالياً إلى",
		"Suggested:": "السائق المقترح:",
	});

	Object.assign(translations, {
		"Current Status:": "الحالة الحالية:",
		"Current Driver:": "السائق الحالي:",
		"Customer:": "العميل:",
		"Each successful scan applies the selected driver/status and is ready for the next barcode immediately.": "كل مسح ناجح يطبّق السائق والحالة المحددين، ثم يصبح النظام جاهزاً لمسح الرمز التالي فوراً.",
		"Not assigned": "غير معيّن",
		"Basic Information": "المعلومات الأساسية",
		"Merchant Settings": "إعدادات التاجر",
		"Driver Settings": "إعدادات السائق",
		"Cost to deliver to each district ($)": "تكلفة التوصيل إلى كل منطقة ($)",
		"Leave blank to keep current password — min 6 characters": "اتركه فارغاً للإبقاء على كلمة المرور الحالية — 6 أحرف على الأقل",
		"Set delivery costs for each region (0 = no delivery to that area)": "حدّد تكلفة التوصيل لكل منطقة (0 = لا يوجد توصيل إلى تلك المنطقة)",
		"Amount driver earns from each delivery (leave empty = no fixed fee)": "المبلغ الذي يحصل عليه السائق عن كل عملية توصيل (اتركه فارغاً لعدم تحديد أجر ثابت)",
		"✔ Confirm Pick Up": "✔ تأكيد الاستلام",
		"Experience the fastest, most reliable logistics and delivery network. We bring businesses and customers closer together.": "اختبر أسرع وأكثر شبكات الخدمات اللوجستية والتوصيل موثوقية. نقرّب الشركات والعملاء من بعضهم.",
		"We manage everything from collection to final-mile delivery. Whether you're a rising e-commerce brand, or a local retailer, our technology-driven approach ensures your products reach their destination safely and on time.": "ندير كل شيء من الاستلام حتى التوصيل إلى الوجهة النهائية. سواء كنت علامة تجارة إلكترونية ناشئة أو متجراً محلياً، يضمن نهجنا القائم على التكنولوجيا وصول منتجاتك بأمان وفي الوقت المحدد.",
		"At least 8 characters, with upper/lowercase, a number, and a special character (!@#$%^&*)": "8 أحرف على الأقل، تشمل حرفاً كبيراً وآخر صغيراً ورقماً ورمزاً خاصاً (!@#$%^&*)",
		"Last updated:": "آخر تحديث:",
		"Cancelled by Customer": "ملغى من العميل",
		"Cancelled by Merchant": "ملغى من التاجر",
		"Unknown customer": "عميل غير معروف",
		"— no change": "— بدون تغيير",
		"— flat": "— ثابت",
		"held by drivers": "بعهدة السائقين",
		"owed to merchants": "مستحقة للتجار",
		"No fresh location shared": "لم تتم مشاركة موقع حديث",
		"Owe driver": "مستحق للسائق",
		"Merchant owes": "مستحق على التاجر",
		"Return": "إرجاع",
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

		const pageLabel = trimmed.match(/^Page (\d+)$/i);
		if (pageLabel) return `${leading}الصفحة ${pageLabel[1]}${trailing}`;

		const pageNumber = trimmed.match(/^Page (\d+) of (\d+)$/i);
		if (pageNumber) return `${leading}الصفحة ${pageNumber[1]} من ${pageNumber[2]}${trailing}`;

		const activeDeliveries = trimmed.match(/^(\d+) active deliveries? in suggested order\.$/i);
		if (activeDeliveries) {
			return `${leading}${activeDeliveries[1]} عملية توصيل نشطة بالترتيب المقترح.${trailing}`;
		}

		const successRate = trimmed.match(/^(\d+(?:\.\d+)?%) success rate$/i);
		if (successRate) return `${leading}نسبة النجاح ${successRate[1]}${trailing}`;

		const cancelledCount = trimmed.match(/^(\d+) cancelled$/i);
		if (cancelledCount) return `${leading}${cancelledCount[1]} طلب ملغى${trailing}`;

		const openCount = trimmed.match(/^(\d+) open$/i);
		if (openCount) return `${leading}تنبيهات مفتوحة: ${openCount[1]}${trailing}`;

		const pipelineNote = trimmed.match(/^(\d+) cancelled in this period · (\d+) express$/i);
		if (pipelineNote) return `${leading}${pipelineNote[1]} طلب ملغى خلال هذه الفترة · ${pipelineNote[2]} طلب سريع${trailing}`;

		const stalledTitle = trimmed.match(/^Stalled over (\d+) days$/i);
		if (stalledTitle) return `${leading}متوقفة منذ أكثر من ${stalledTitle[1]} أيام${trailing}`;

		const stalledDescription = trimmed.match(/^No status change since (\d+)\+ days$/i);
		if (stalledDescription) return `${leading}لم تتغير الحالة منذ ${stalledDescription[1]} أيام أو أكثر${trailing}`;

		const orderCount = trimmed.match(/^([\d,]+) orders$/i);
		if (orderCount) return `${leading}عدد الطلبات: ${orderCount[1]}${trailing}`;

		const assignedCount = trimmed.match(/^(\d+) assigned$/i);
		if (assignedCount) return `${leading}${assignedCount[1]} طلب مُسند${trailing}`;

		const roadCount = trimmed.match(/^(\d+) orders on the road$/i);
		if (roadCount) return `${leading}${roadCount[1]} طلب قيد التوصيل${trailing}`;

		const deliveredUncollected = trimmed.match(/^(\d+) delivered, not collected$/i);
		if (deliveredUncollected) return `${leading}${deliveredUncollected[1]} تم تسليمها ولم تُحصّل${trailing}`;

		const collectedUnpaid = trimmed.match(/^(\d+) collected, not paid out$/i);
		if (collectedUnpaid) return `${leading}${collectedUnpaid[1]} تم تحصيلها ولم تُدفع للتجار${trailing}`;

		const closedCount = trimmed.match(/^(\d+) fully closed$/i);
		if (closedCount) return `${leading}${closedCount[1]} طلب مغلق بالكامل${trailing}`;

		const peak = trimmed.match(/^Peak: (Sun|Mon|Tue|Wed|Thu|Fri|Sat) at (\d{2}):00 \((\d+) orders\)$/i);
		if (peak) {
			return `${leading}أعلى نشاط: ${translations[peak[1]]} عند ${peak[2]}:00 (${peak[3]} طلب)${trailing}`;
		}

		const heatTitle = trimmed.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{2}):00 — (\d+) orders$/i);
		if (heatTitle) {
			return `${leading}${translations[heatTitle[1]]} ${heatTitle[2]}:00 — ${heatTitle[3]} طلب${trailing}`;
		}

		const noResults = trimmed.match(/^No results for ["“](.+)["”]$/i);
		if (noResults) return `${leading}لا توجد نتائج لـ «${noResults[1]}»${trailing}`;

		const lastUpdated = trimmed.match(/^Last updated:\s*(.+)$/i);
		if (lastUpdated) return `${leading}آخر تحديث: ${lastUpdated[1]}${trailing}`;

		const liveDriverCount = trimmed.match(/^(\d+) drivers? sharing a fresh location\.$/i);
		if (liveDriverCount) {
			const role = liveDriverCount[1] === "1" ? translations.driver : translations.drivers;
			return `${leading}${liveDriverCount[1]} ${role} ${translations["sharing a fresh location."]}${trailing}`;
		}

		const liveDriverDetail = trimmed.match(/^· (\d+) active · (.+)$/i);
		if (liveDriverDetail) {
			const count = liveDriverDetail[1];
			const label = count === "1" ? translations["active order"] : translations["active orders"];
			return `${leading}· ${count} ${label} · ${liveDriverDetail[2]}${trailing}`;
		}

		const livePopupDetail = trimmed.match(/^(.+) · (\d+) active orders?$/i);
		if (livePopupDetail) {
			const count = livePopupDetail[2];
			const label = count === "1" ? translations["active order"] : translations["active orders"];
			return `${leading}${livePopupDetail[1]} · ${count} ${label}${trailing}`;
		}

		const liveLocationUpdated = trimmed.match(/^Live location updated (.+)\.$/i);
		if (liveLocationUpdated) {
			return `${leading}${translations["Live location updated"]} ${liveLocationUpdated[1]}${trailing}`;
		}

		const orderAction = trimmed.match(/^(Edit|View) order: (.+) - This will (open edit modal|show order details)$/i);
		if (orderAction) {
			const verb = orderAction[1] === "Edit" ? "تعديل الطلب" : "عرض الطلب";
			const result = orderAction[3] === "open edit modal" ? "ستُفتح نافذة التعديل" : "ستظهر تفاصيل الطلب";
			return `${leading}${verb}: ${orderAction[2]} — ${result}${trailing}`;
		}

		const createdOrder = trimmed.match(/^Order (.+) created successfully!$/i);
		if (createdOrder) return `${leading}تم إنشاء الطلب ${createdOrder[1]} بنجاح!${trailing}`;

		const driverCashPrompt = trimmed.match(/^(Collect|Pay) \$([\d,.]+) (to|from) (.+)\?\s*\n\s*This will mark all their delivered orders as COLLECTED\.$/i);
		if (driverCashPrompt) {
			const action = driverCashPrompt[1].toLowerCase() === "collect" ? "تحصيل" : "دفع";
			const direction = driverCashPrompt[3].toLowerCase() === "from" ? "من" : "إلى";
			return `${leading}${action} $${driverCashPrompt[2]} ${direction} ${driverCashPrompt[4]}؟\n\nسيؤدي ذلك إلى وضع علامة «تم التحصيل» على جميع طلباته المسلّمة.${trailing}`;
		}

		const merchantCashPrompt = trimmed.match(/^(Collect|Pay) \$([\d,.]+) (from|to) (.+)\?\s*\n\s*(This settles the delivery charges they owe on cancelled orders|This will mark all their collected orders as PAID)\.$/i);
		if (merchantCashPrompt) {
			const isCollection = merchantCashPrompt[1].toLowerCase() === "collect";
			const action = isCollection ? "تحصيل" : "دفع";
			const direction = isCollection ? "من" : "إلى";
			const explanation = isCollection
				? "سيؤدي ذلك إلى تسوية رسوم التوصيل المستحقة عن الطلبات الملغاة."
				: "سيؤدي ذلك إلى وضع علامة «مدفوع» على جميع طلباته المحصّلة.";
			return `${leading}${action} $${merchantCashPrompt[2]} ${direction} ${merchantCashPrompt[4]}؟\n\n${explanation}${trailing}`;
		}

		const cashToast = trimmed.match(/^(?:Done - |✓ )?(Paid|Collected) \$([\d,.]+) (to|from) (.+)$/i);
		if (cashToast) {
			const action = cashToast[1].toLowerCase() === "paid" ? "تم دفع" : "تم تحصيل";
			const direction = cashToast[3].toLowerCase() === "from" ? "من" : "إلى";
			return `${leading}✓ ${action} $${cashToast[2]} ${direction} ${cashToast[4]}${trailing}`;
		}

		const legacyBalance = trimmed.match(/^✓ Legacy balance for (.+) set to (.+)$/i);
		if (legacyBalance) return `${leading}✓ تم تحديد الرصيد السابق للتاجر ${legacyBalance[1]} بمبلغ ${legacyBalance[2]}${trailing}`;

		const completedFinance = trimmed.match(/^✓ Done — (.+) processed$/i);
		if (completedFinance) return `${leading}✓ تمت معالجة ${completedFinance[1]}${trailing}`;

		const statusLine = trimmed.match(/^Status: (.+)$/i);
		if (statusLine) return `${leading}الحالة: ${translations[statusLine[1]] || statusLine[1]}${trailing}`;

		const statusChanged = trimmed.match(/^Status changed to (.+)$/i);
		if (statusChanged) return `${leading}تم تغيير الحالة إلى ${translations[statusChanged[1]] || statusChanged[1]}${trailing}`;

		const statusLog = trimmed.match(/^Status Updated → (.+)$/i);
		if (statusLog) return `${leading}تم تحديث الحالة → ${translations[statusLog[1]] || statusLog[1]}${trailing}`;

		const revertedOrder = trimmed.match(/^Order #(.+) reverted — status is now (.+)\.$/i);
		if (revertedOrder) return `${leading}تم التراجع عن الطلب رقم ${revertedOrder[1]} — حالته الآن ${translations[revertedOrder[2]] || revertedOrder[2]}.${trailing}`;

		const noOrderActions = trimmed.match(/^Order "(.+)" has no actions available right now \(current status: (.+)\)\.$/i);
		if (noOrderActions) return `${leading}لا توجد إجراءات متاحة حالياً للطلب «${noOrderActions[1]}» (الحالة الحالية: ${translations[noOrderActions[2]] || noOrderActions[2]}).${trailing}`;

		const deleteUserPrompt = trimmed.match(/^Delete (.+?) "(.+)"\?$/i);
		if (deleteUserPrompt) return `${leading}هل تريد حذف ${translations[deleteUserPrompt[1]] || deleteUserPrompt[1]} «${deleteUserPrompt[2]}»؟${trailing}`;

		const deleteUserBlocked = trimmed.match(/^"(.+)" has records tied to their account that need to be reassigned or removed before they can be deleted\.$/i);
		if (deleteUserBlocked) return `${leading}لدى «${deleteUserBlocked[1]}» سجلات مرتبطة بحسابه. أعد إسناد هذه السجلات أو احذفها قبل حذف المستخدم.${trailing}`;

		const dispatchSummary = trimmed.match(/^(\d+) waiting orders? · page (\d+) of (\d+) · (.+) · (fresh driver sharing available|live sharing disabled)$/i);
		if (dispatchSummary) {
			const sharing = dispatchSummary[5].toLowerCase() === "live sharing disabled"
				? "مشاركة الموقع المباشر معطلة"
				: "مشاركة موقع السائق محدثة";
			return `${leading}${dispatchSummary[1]} طلبات بانتظار الإسناد · الصفحة ${dispatchSummary[2]} من ${dispatchSummary[3]} · ${dispatchSummary[4]} · ${sharing}${trailing}`;
		}

		const dispatchWorkload = trimmed.match(/^(\d+) active · (\d+) waiting · (\d+) picked up · (\d+) weighted units$/i);
		if (dispatchWorkload) {
			return `${leading}${dispatchWorkload[1]} نشطة · ${dispatchWorkload[2]} بانتظار الإسناد · ${dispatchWorkload[3]} تم استلامها · وزن العمل ${dispatchWorkload[4]}${trailing}`;
		}

		const dispatchTime = trimmed.match(/^Sharing fresh location at (.+)$/i);
		if (dispatchTime) return `${leading}مشاركة موقع حديث · آخر تحديث ${dispatchTime[1]}${trailing}`;

		const dispatchGroup = trimmed.match(/^(.+) · (\d+) orders? · (\d+) Express$/i);
		if (dispatchGroup) {
			return `${leading}${dispatchGroup[1]} · ${dispatchGroup[2]} طلبات · ${dispatchGroup[3]} سريع${trailing}`;
		}

		const currentlyAssigned = trimmed.match(/^Currently assigned to (.+)$/i);
		if (currentlyAssigned) return `${leading}مسند حالياً إلى ${currentlyAssigned[1]}${trailing}`;

		const suggestedDriver = trimmed.match(/^Suggested: (.+) · (\d+) active$/i);
		if (suggestedDriver) return `${leading}السائق المقترح: ${suggestedDriver[1]} · ${suggestedDriver[2]} طلب نشط${trailing}`;

		const sharingUpdated = trimmed.match(/^Sharing current location · updated (.+)\.$/i);
		if (sharingUpdated) return `${leading}تتم مشاركة الموقع الحالي · آخر تحديث ${sharingUpdated[1]}${trailing}`;

		const relativeTime = trimmed.match(/^(\d+)(m|h|d) ago$/i);
		if (relativeTime) {
			const unit = { m: "د", h: "س", d: "ي" }[relativeTime[2].toLowerCase()];
			return `${leading}منذ ${relativeTime[1]} ${unit}${trailing}`;
		}

		return value;
	}

	function shouldSkipTextNode(node) {
		const parent = node.parentElement;
		if (!parent) return true;
		if (parent.closest(".status-badge, .an-status, .pill, .label, .info-label, .empty-msg, .empty-cell, .empty-state, .loading, .error-message, [class^='s-'], [class*=' s-']")) return false;
		if (parent.closest("button, [role='button'], .action-btn, .small-btn, .view-btn, .delete-btn, .btn-download, .view-session-btn, .view-advance-btn, .download-advance-btn")) return false;
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
